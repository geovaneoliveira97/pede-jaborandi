// src/lib/loyaltyApi.ts
//
// Todas as operações do sistema de pontos com o Supabase.
// Identificação do usuário: número de telefone (somente dígitos).

import { getSupabase, isSupabaseConfigured } from './supabase'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface LoyaltyConfig {
  active:          boolean
  pts_per_purchase: number
  pts_threshold:   number
  reward_brl:      number
}

export interface PointsHistory {
  id:         number
  phone:      string
  store_id:   number | null
  type:       'earn' | 'redeem'
  delta:      number
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Remove tudo que não é dígito do telefone. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

// ── Config ────────────────────────────────────────────────────────────────────

/** Busca a configuração global do sistema de pontos. */
export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  if (!isSupabaseConfigured()) {
    return { active: false, pts_per_purchase: 1, pts_threshold: 10, reward_brl: 5 }
  }

  const { data, error } = await getSupabase()
    .from('loyalty_config')
    .select('active, pts_per_purchase, pts_threshold, reward_brl')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return { active: false, pts_per_purchase: 1, pts_threshold: 10, reward_brl: 5 }
  }

  return data as LoyaltyConfig
}

/** Ativa ou desativa o sistema de pontos. */
export async function setLoyaltyActive(active: boolean): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  const { error } = await getSupabase()
    .from('loyalty_config')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', 1)

  return { error: error?.message ?? null }
}

/** Atualiza as configurações numéricas do programa. */
export async function updateLoyaltyConfig(
  config: Partial<Pick<LoyaltyConfig, 'pts_per_purchase' | 'pts_threshold' | 'reward_brl'>>
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  const { error } = await getSupabase()
    .from('loyalty_config')
    .update({ ...config, updated_at: new Date().toISOString() })
    .eq('id', 1)

  return { error: error?.message ?? null }
}

// ── Saldo ─────────────────────────────────────────────────────────────────────

/** Retorna o saldo de pontos do usuário. */
export async function getPoints(phone: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0

  const norm = normalizePhone(phone)
  if (!norm) return 0

  const { data } = await getSupabase()
    .from('user_points')
    .select('points')
    .eq('phone', norm)
    .single()

  return data?.points ?? 0
}

// ── Crédito (ganhar pontos) ───────────────────────────────────────────────────

/**
 * Credita 1 ponto ao usuário após uma compra.
 * Só credita se o sistema estiver ativo.
 * Retorna false se o sistema estiver inativo.
 */
export async function creditPoint(
  phone:   string,
  storeId: number
): Promise<{ credited: boolean; error: string | null }> {
  if (!isSupabaseConfigured()) return { credited: true, error: null }

  const config = await getLoyaltyConfig()
  if (!config.active) return { credited: false, error: null }

  const norm = normalizePhone(phone)
  if (!norm) return { credited: false, error: 'Telefone inválido' }

  // Incrementa saldo atomicamente via função RPC
  const { error: rpcErr } = await getSupabase()
    .rpc('increment_points', { p_phone: norm, p_delta: config.pts_per_purchase })

  if (rpcErr) return { credited: false, error: rpcErr.message }

  // Registra no histórico
  await getSupabase()
    .from('points_history')
    .insert({ phone: norm, store_id: storeId, type: 'earn', delta: config.pts_per_purchase })

  return { credited: true, error: null }
}

// ── Resgate (usar pontos) ─────────────────────────────────────────────────────

/**
 * Resgata os pontos do usuário para obter desconto.
 * Retorna { ok: true, discount: 5.00 } se bem-sucedido.
 * Retorna { ok: false } se saldo insuficiente ou sistema inativo.
 */
export async function redeemPoints(
  phone: string
): Promise<{ ok: boolean; discount: number; error: string | null }> {
  if (!isSupabaseConfigured()) return { ok: true, discount: 5, error: null }

  const config = await getLoyaltyConfig()
  if (!config.active) return { ok: false, discount: 0, error: 'Sistema inativo' }

  const norm = normalizePhone(phone)
  const currentPoints = await getPoints(norm)

  if (currentPoints < config.pts_threshold) {
    return {
      ok:       false,
      discount: 0,
      error:    `Saldo insuficiente (${currentPoints}/${config.pts_threshold} pontos)`,
    }
  }

  // Debita os pontos
  const { error: rpcErr } = await getSupabase()
    .rpc('increment_points', { p_phone: norm, p_delta: -config.pts_threshold })

  if (rpcErr) return { ok: false, discount: 0, error: rpcErr.message }

  // Registra o resgate no histórico
  await getSupabase()
    .from('points_history')
    .insert({ phone: norm, store_id: null, type: 'redeem', delta: -config.pts_threshold })

  return { ok: true, discount: config.reward_brl, error: null }
}

// ── Histórico ─────────────────────────────────────────────────────────────────

/** Retorna os últimos 20 movimentos do usuário (mais recente primeiro). */
export async function getPointsHistory(phone: string): Promise<PointsHistory[]> {
  if (!isSupabaseConfigured()) return []

  const norm = normalizePhone(phone)
  if (!norm) return []

  const { data } = await getSupabase()
    .from('points_history')
    .select('*')
    .eq('phone', norm)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []) as PointsHistory[]
}
