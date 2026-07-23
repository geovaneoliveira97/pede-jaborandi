-- ============================================================================
-- Fixes de segurança/integridade encontrados em auditoria — 2026-07-23
-- Rodar no SQL Editor do Supabase, de uma vez, na ordem em que está.
-- ============================================================================

-- ── 1. Preço do item: piso mínimo contra o preço real do produto ───────────
-- Antes: a trigger validate_order() só conferia se items[].price somava
-- items[].total (ambos vindos do cliente) — nunca comparava com products.price.
-- Um POST direto ao REST da tabela orders (com a anon key, que é pública no
-- bundle JS) conseguia criar pedido com preço 0,01 pra qualquer produto.
--
-- Fix: valida que o preço de cada item não é menor que o menor preço
-- possível daquele produto (preço base, oferta do dia, ou o tamanho mais
-- barato, se for pizza). Só bloqueia preço PRA BAIXO — nunca rejeita um
-- pedido legítimo, porque toda combinação real (tamanho + borda + metade)
-- é sempre >= a esse piso.
create or replace function public.validate_item_prices()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  item      record;
  v_floor   numeric;
begin
  for item in select * from jsonb_to_recordset(new.items) as x(productid int, price numeric, qty int)
  loop
    select least(
             p.price,
             coalesce(p.oferta_preco, p.price),
             coalesce((select min((s->>'price')::numeric) from jsonb_array_elements(p.sizes) s), p.price)
           )
      into v_floor
      from public.products p
     where p.id = item.productid
       and p.store_id = new.store_id;

    if v_floor is null then
      raise exception 'Produto % não encontrado nesta loja', item.productid;
    end if;

    if item.price < v_floor - 0.01 then
      raise exception 'Preço do item % abaixo do mínimo permitido (enviado: %, mínimo: %)',
        item.productid, item.price, v_floor;
    end if;
  end loop;

  return new;
end;
$function$;

drop trigger if exists trg_validate_item_prices on public.orders;
create trigger trg_validate_item_prices
  before insert on public.orders
  for each row execute function public.validate_item_prices();


-- ── 2. Cupom amarrado ao pedido real (atômico, na mesma transação) ─────────
-- Antes: redeem_coupon() era uma RPC pública, chamável por qualquer um sem
-- nunca ter feito um pedido — dava pra esgotar o max_uses de um cupom sem
-- comprar nada. E o INSERT em orders aceitava qualquer `discount` sem
-- checar se batia com um cupom de verdade (dava pra zerar o total sem cupom).
--
-- Fix: `coupon_code` agora viaja dentro do INSERT do pedido. Uma trigger
-- BEFORE valida o cupom e confere se `discount` bate com o que o cupom
-- realmente dá (mesma fórmula de couponApi.ts:computeDiscount). Uma trigger
-- AFTER consome o uso do cupom (used_count += 1) só se o pedido foi
-- realmente inserido — com lock de linha (FOR UPDATE) pra não deixar dois
-- pedidos concorrentes estourarem o max_uses ao mesmo tempo.

alter table public.orders add column if not exists coupon_code text;

create or replace function public.validate_coupon_discount()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_coupon   record;
  v_raw      numeric;
  v_expected numeric;
begin
  if new.coupon_code is null then
    if new.discount <> 0 then
      raise exception 'Desconto informado sem cupom aplicado';
    end if;
    return new;
  end if;

  select * into v_coupon from public.coupons where upper(code) = upper(new.coupon_code);

  if not found or not v_coupon.active
     or (v_coupon.expires_at is not null and v_coupon.expires_at < now())
     or (v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses) then
    raise exception 'Cupom inválido, expirado ou esgotado';
  end if;

  v_raw      := case when v_coupon.discount_type = 'percent'
                     then new.total * (v_coupon.discount_value / 100)
                     else v_coupon.discount_value end;
  v_expected := greatest(0, least(new.total, v_raw));

  if abs(new.discount - v_expected) > 0.01 then
    raise exception 'Desconto não confere com o cupom (esperado: %, enviado: %)', v_expected, new.discount;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_validate_coupon_discount on public.orders;
create trigger trg_validate_coupon_discount
  before insert on public.orders
  for each row execute function public.validate_coupon_discount();


create or replace function public.consume_coupon_on_order()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_coupon record;
begin
  if new.coupon_code is null then
    return new;
  end if;

  -- Lock a linha do cupom antes de reconferir o limite — fecha a race
  -- condition de dois pedidos concorrentes consumindo o último uso.
  select * into v_coupon
    from public.coupons
   where upper(code) = upper(new.coupon_code)
   for update;

  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    raise exception 'Cupom esgotado durante o processamento — tente novamente';
  end if;

  update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  return new;
end;
$function$;

drop trigger if exists trg_consume_coupon_on_order on public.orders;
create trigger trg_consume_coupon_on_order
  after insert on public.orders
  for each row execute function public.consume_coupon_on_order();

-- A RPC antiga não é mais chamada pelo front (ver couponApi.ts) e ficava
-- exposta pra qualquer um consumir cupom sem pedido — remove.
drop function if exists public.redeem_coupon(text);


-- ── 3. Numeração de pedido por loja quebrada por RLS ────────────────────────
-- set_store_order_number() rodava como SECURITY INVOKER: o SELECT MAX(...)
-- dentro dela é feito como o papel `anon` (cliente fazendo o pedido), que a
-- policy orders_select_owner bloqueia de enxergar pedidos existentes — então
-- o MAX() sempre via "vazio" e todo pedido novo virava #1.
create or replace function public.set_store_order_number()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform pg_advisory_xact_lock(new.store_id);
  select coalesce(max(store_order_number), 0) + 1
    into new.store_order_number
    from public.orders
    where store_id = new.store_id;
  return new;
end;
$function$;


-- ── 4. Limite server-side no bucket de imagens (pasta temp/ sem dono) ──────
-- insere_imagem_da_propria_loja libera upload em images/temp/* pra qualquer
-- usuário autenticado sem checar dono de loja (necessário: a loja ainda não
-- existe nesse ponto do cadastro). Validação de tipo/tamanho só existia no
-- client (storageApi.ts) — reforça no bucket.
update storage.buckets
   set file_size_limit    = 2097152,  -- 2MB, mesmo limite do client
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
 where id = 'images';

-- ============================================================================
-- Verificação pós-fix (rode depois de aplicar tudo acima):
--
-- select store_id, store_order_number, count(*)
-- from orders group by store_id, store_order_number order by 1,2;
-- (se store_order_number ainda tiver muita repetição de "1", é pedido
-- anterior ao fix — só os novos vão numerar certo daqui pra frente)
-- ============================================================================
