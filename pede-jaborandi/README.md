# 🍕 Pede Jaborandi

PWA de delivery local para a cidade de Jaborandi–SP.  
Conecta moradores a comércios locais com pedidos direto pelo WhatsApp.

---

## Stack

| Camada      | Tecnologia                          |
|-------------|-------------------------------------|
| Frontend    | React 19 + Vite 7 + TypeScript 5    |
| Estilo      | Tailwind CSS 3                      |
| Banco       | Supabase (PostgreSQL)               |
| Deploy      | Render (ou qualquer host estático)  |
| PWA         | manifest.json + Service Worker      |

---

## Estrutura do projeto

```
pede-jaborandi/
├── public/
│   ├── manifest.json        # Metadados do PWA (nome, ícones, cores)
│   └── sw.js                # Service Worker com 4 estratégias de cache
├── src/
│   ├── types/
│   │   └── types.ts         # Tipos TypeScript + type guards (sem cast forçado)
│   ├── lib/
│   │   ├── supabase.ts      # Inicialização do cliente Supabase
│   │   └── whatsapp.ts      # Geração de mensagem e abertura do WhatsApp
│   ├── data/
│   │   └── mockStores.ts    # Dados mockados (fallback sem banco configurado)
│   ├── hooks/
│   │   ├── useStores.ts     # Fetch com timeout, retry e fallback mock
│   │   ├── useCart.ts       # Carrinho persistido em localStorage
│   │   ├── useToast.ts      # Notificações temporárias
│   │   └── useInstallPrompt.ts  # Banner de instalação PWA
│   ├── components/
│   │   ├── Header.tsx       # Cabeçalho fixo com voltar e carrinho contextuais
│   │   ├── BottomNav.tsx    # Navegação inferior fixa
│   │   ├── StoreCard.tsx    # Card de comércio com status aberto/fechado
│   │   ├── ProductCard.tsx  # Item do cardápio com botão de adicionar
│   │   ├── InstallBanner.tsx
│   │   ├── Toast.tsx
│   │   └── LoadingScreen.tsx
│   ├── pages/
│   │   ├── Home.tsx         # Lista de comércios com busca e filtros
│   │   ├── Menu.tsx         # Cardápio agrupado por seção
│   │   ├── Cart.tsx         # Carrinho com controles de quantidade
│   │   ├── Checkout.tsx     # Formulário + envio via WhatsApp
│   │   └── Admin.tsx        # Painel administrativo protegido por senha
│   ├── App.tsx              # Orquestra navegação e estado global
│   ├── main.tsx             # Entry point + registro do Service Worker
│   └── index.css            # Tailwind + classes reutilizáveis
└── index.html
```

---

## Como rodar localmente

### 1. Clone e instale

```bash
git clone https://github.com/seu-usuario/pede-jaborandi.git
cd pede-jaborandi
npm install
```

### 2. Configure o ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

> **Sem Supabase?** O app detecta automaticamente a ausência das variáveis
> e carrega os dados mockados de `src/data/mockStores.ts`. Funciona 100%
> sem banco durante o desenvolvimento.

### 3. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse em `http://localhost:5173`

---

## Banco de dados (Supabase)

### Tabela `stores`

```sql
create table stores (
  id          serial primary key,
  name        text        not null,
  category    text        not null,
  description text        not null default '',
  phone       text        not null,
  color       text        not null default '#E85D26',
  status      text        not null default 'open'
               check (status in ('open', 'closed'))
);
```

### Tabela `products`

```sql
create table products (
  id          serial primary key,
  store_id    integer     not null references stores(id) on delete cascade,
  name        text        not null,
  description text        not null default '',
  price       numeric     not null,
  section     text        not null default 'Produtos'
);
```

### Política RLS (leitura pública)

```sql
-- Permite leitura pública dos comércios e produtos
alter table stores   enable row level security;
alter table products enable row level security;

create policy "leitura publica de stores"
  on stores for select using (true);

create policy "leitura publica de products"
  on products for select using (true);
```

---

## Deploy no Render

1. Faça push do projeto para o GitHub
2. No Render, crie um **Static Site** apontando para o repositório
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

O `vite.config.ts` detecta automaticamente o Render via `/etc/secrets/.env`.

---

## Funcionalidades

### Cliente
- Listar comércios com status aberto/fechado em tempo real
- Busca textual e filtros por categoria
- Cardápio organizado por seções (Pizzas, Bebidas, etc.)
- Carrinho persistido em localStorage
- Controle de quantidade por item
- Finalização com nome, telefone, endereço e forma de pagamento
- Envio automático de pedido formatado via WhatsApp

### PWA
- Instalável na tela inicial do celular
- Banner nativo de instalação (Android/Chrome)
- Funcionamento offline com dados em cache
- Service Worker com 4 estratégias de cache distintas

### Admin
- Protegido por senha (padrão: `jaborandi123`)
- Ativar / desativar comércios via toggle
- Cadastrar novos comércios e produtos inline
- Remover produtos existentes
- Painel de estatísticas rápidas

> **Nota:** A senha do admin está em `src/pages/Admin.tsx`.
> Para produção com múltiplos administradores, substituir por
> autenticação via Supabase Auth.

---

## Boas práticas aplicadas

- **Type guards** em vez de cast forçado (`as Type`) — `isStore()` em `types.ts`
- **Custom hooks** isolam lógica de dados e estado dos componentes visuais
- **useMemo / useCallback** para evitar recálculos e recriações desnecessárias
- **Comentários explicativos** em todos os arquivos documentando o *porquê*
- **Separação de responsabilidades**: lib/, hooks/, components/, pages/
- **Fallback gracioso**: mock automático quando Supabase não está configurado
- **Acessibilidade**: `aria-label`, `role`, `aria-current`, `aria-checked` nos elementos interativos
- **Intl.NumberFormat** para formatação de moeda sem artefatos de ponto flutuante
- **Cancelamento de efeitos** com flag `cancelled` e `clearTimeout` em todos os useEffects com fetch

---

## Senha do Admin

```
jaborandi123
```

Altere em `src/pages/Admin.tsx`, constante `ADMIN_PASSWORD`.

---

## Licença

MIT — Projeto Integrador UNIVESP 2026, Polo Jaborandi–SP.
