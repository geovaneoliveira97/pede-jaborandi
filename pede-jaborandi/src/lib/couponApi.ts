// src/lib/couponApi.ts
//
// Cupons de desconto — substitui o sistema de fidelidade por telefone.
// A tabela `coupons` não tem policy pública de SELECT: validação e resgate
// passam pelas funções RPC `validate_coupon`/`redeem_coupon` (SECURITY DEFINER),
// então o código do cupom nunca é listável por quem não é admin.

import { getSupabase, isSupabaseConfigured } from './supabase'

export type DiscountType = 'fixed' | 'percent'

export interface CouponResult {
  ok:            boolean
  discountType:  DiscountType | null
  discountValue: number | null
  message:       string
}

function mapResult(data: Record<string, unknown> | null, fallbackMsg: string): CouponResult {
  if (!data) return { ok: false, discountType: null, discountValue: null, message: fallbackMsg }
  return {
    ok:            data.ok === true,
    discountType:  (data.discount_type as DiscountType) ?? null,
    discountValue: data.discount_value != null ? Number(data.discount_value) : null,
    message:       (data.message as string) ?? '',
  }
}

/** Calcula o valor do desconto em R$ a partir do tipo/valor do cupom. */
export function computeDiscount(total: number, type: DiscountType | null, value: number | null): number {
  if (!type || value == null) return 0
  const raw = type === 'percent' ? total * (value / 100) : value
  return Math.max(0, Math.min(total, raw))
}

/** Confere se o cupom é válido, sem consumir uma das usagens disponíveis. */
export async function validateCoupon(code: string): Promise<CouponResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, discountType: 'fixed', discountValue: 5, message: 'ok' }
  }
  const { data, error } = await getSupabase()
    .rpc('validate_coupon', { p_code: code.trim() })
    .single<Record<string, unknown>>()
  if (error) return { ok: false, discountType: null, discountValue: null, message: 'Cupom inválido' }
  return mapResult(data, 'Cupom inválido')
}

/** Confirma o uso do cupom (debita uma usagem) — só chamar após o pedido confirmado. */
export async function redeemCoupon(code: string): Promise<CouponResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, discountType: 'fixed', discountValue: 5, message: 'ok' }
  }
  const { data, error } = await getSupabase()
    .rpc('redeem_coupon', { p_code: code.trim() })
    .single<Record<string, unknown>>()
  if (error) return { ok: false, discountType: null, discountValue: null, message: 'Não foi possível aplicar o cupom' }
  return mapResult(data, 'Não foi possível aplicar o cupom')
}

// ── Administração (superadmin) ──────────────────────────────────────────────

export interface Coupon {
  id:             number
  code:           string
  discount_type:  DiscountType
  discount_value: number
  max_uses:       number | null
  used_count:     number
  active:         boolean
  expires_at:     string | null
  created_at:     string
}

export async function apiListCoupons(): Promise<{ coupons: Coupon[]; error: string | null }> {
  if (!isSupabaseConfigured()) return { coupons: [], error: null }
  const { data, error } = await getSupabase()
    .from('coupons').select('*').order('created_at', { ascending: false })
  if (error) return { coupons: [], error: error.message }
  return { coupons: (data ?? []) as Coupon[], error: null }
}

export async function apiCreateCoupon(input: {
  code: string; discountType: DiscountType; discountValue: number
  maxUses?: number | null; expiresAt?: string | null
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const { error } = await getSupabase().from('coupons').insert({
    code:           input.code.trim().toUpperCase(),
    discount_type:  input.discountType,
    discount_value: input.discountValue,
    max_uses:       input.maxUses ?? null,
    expires_at:     input.expiresAt ?? null,
  })
  return { error: error ? error.message : null }
}

export async function apiToggleCoupon(id: number, active: boolean): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const { error } = await getSupabase().from('coupons').update({ active }).eq('id', id)
  return { error: error ? error.message : null }
}

export async function apiDeleteCoupon(id: number): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const { error } = await getSupabase().from('coupons').delete().eq('id', id)
  return { error: error ? error.message : null }
}
