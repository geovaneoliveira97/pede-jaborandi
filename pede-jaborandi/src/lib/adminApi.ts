// src/lib/adminApi.ts

import { getSupabase, isSupabaseConfigured } from './supabase'
import type { Store, Product, StoreStatus, Order, OrderItem } from '../types/types'

function friendlyError(msg: string): string {
  if (msg.includes('row-level security') || msg.includes('permission denied') || msg.includes('42501')) {
    return 'Sem permissão — faça login como admin antes de realizar esta ação.'
  }
  return msg
}

// ── Stores ────────────────────────────────────────────────────────────────────

export async function apiAddStore(
  store: Omit<Store, 'id' | 'products'>,
  ownerId?: string,
): Promise<{ id: number | null; error: string | null }> {
  if (!isSupabaseConfigured()) return { id: Date.now(), error: null }
  const { data, error } = await getSupabase()
    .from('stores')
    .insert({
      name: store.name, category: store.category, description: store.description,
      phone: store.phone, color: store.color, status: store.status,
      mode: store.mode ?? 'delivery',
      rating: store.rating ?? null, delivery_time: store.deliveryTime ?? null,
      cover_image: store.coverImage ?? null,
      owner_id: ownerId ?? null,
    })
    .select('id').single()
  if (error) return { id: null, error: friendlyError(error.message) }
  return { id: data.id, error: null }
}

export async function apiUpdateStore(
  storeId: number,
  updates: Partial<Omit<Store, 'id' | 'products'>>
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const payload: Record<string, unknown> = {}
  if (updates.name         !== undefined) payload.name          = updates.name
  if (updates.category     !== undefined) payload.category      = updates.category
  if (updates.description  !== undefined) payload.description   = updates.description
  if (updates.phone        !== undefined) payload.phone         = updates.phone
  if (updates.color        !== undefined) payload.color         = updates.color
  if (updates.status       !== undefined) payload.status        = updates.status
  if (updates.mode         !== undefined) payload.mode          = updates.mode
  if ('rating' in updates)                payload.rating        = updates.rating ?? null
  if (updates.deliveryTime !== undefined) payload.delivery_time = updates.deliveryTime || null
  if ('coverImage' in updates)            payload.cover_image   = updates.coverImage ?? null
  const { error } = await getSupabase().from('stores').update(payload).eq('id', storeId)
  return { error: error ? friendlyError(error.message) : null }
}

export async function apiToggleStore(
  storeId: number, status: StoreStatus
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const { error } = await getSupabase().from('stores').update({ status }).eq('id', storeId)
  return { error: error ? friendlyError(error.message) : null }
}

export async function apiDeleteStore(
  storeId: number
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const { error } = await getSupabase().from('stores').delete().eq('id', storeId)
  return { error: error ? friendlyError(error.message) : null }
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function apiAddProduct(
  storeId: number, product: Omit<Product, 'id'>
): Promise<{ id: number | null; error: string | null }> {
  if (!isSupabaseConfigured()) return { id: Date.now(), error: null }
  const { data, error } = await getSupabase()
    .from('products')
    .insert({
      store_id: storeId, name: product.name, description: product.description,
      price: product.price, section: product.section, image: product.image ?? null,
      oferta_dia:   product.ofertaDia   ?? false,
      oferta_preco: product.ofertaPreco ?? null,
      product_type: product.productType ?? 'item',
      allow_half:   product.allowHalf   ?? false,
      sizes:        product.sizes       ?? null,
      crusts:       product.crusts      ?? null,
      active:       product.active      ?? true,
    })
    .select('id').single()
  if (error) return { id: null, error: friendlyError(error.message) }
  return { id: data.id, error: null }
}

export async function apiUpdateProduct(
  productId: number, updates: Partial<Omit<Product, 'id'>>
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const payload: Record<string, unknown> = {}
  if (updates.name        !== undefined) payload.name         = updates.name
  if (updates.description !== undefined) payload.description  = updates.description
  if (updates.price       !== undefined) payload.price        = updates.price
  if (updates.section     !== undefined) payload.section      = updates.section
  if (updates.image       !== undefined) payload.image        = updates.image ?? null
  if (updates.ofertaDia    !== undefined) payload.oferta_dia   = updates.ofertaDia
  if (updates.ofertaPreco  !== undefined) payload.oferta_preco = updates.ofertaPreco ?? null
  if ('productType' in updates)           payload.product_type = updates.productType ?? 'item'
  if ('allowHalf'   in updates)           payload.allow_half   = updates.allowHalf   ?? false
  if ('sizes'       in updates)           payload.sizes        = updates.sizes        ?? null
  if ('crusts'      in updates)           payload.crusts       = updates.crusts       ?? null
  if ('active'      in updates)           payload.active       = updates.active       ?? true
  const { error } = await getSupabase().from('products').update(payload).eq('id', productId)
  return { error: error ? friendlyError(error.message) : null }
}

export async function apiToggleProduct(
  productId: number, active: boolean
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const { error } = await getSupabase().from('products').update({ active }).eq('id', productId)
  return { error: error ? friendlyError(error.message) : null }
}

export async function apiDeleteProduct(
  productId: number
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const { error } = await getSupabase().from('products').delete().eq('id', productId)
  return { error: error ? friendlyError(error.message) : null }
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface SaveOrderParams {
  storeId:       number
  storeName:     string
  customerName:  string
  customerPhone: string
  address:       string
  items:         OrderItem[]
  total:         number
  payment:       string
  discount:      number
  finalTotal:    number
}

export async function apiSaveOrder(
  params: SaveOrderParams
): Promise<{ id: string | null; error: string | null }> {
  if (!isSupabaseConfigured()) return { id: String(Date.now()), error: null }
  const { data, error } = await getSupabase()
    .from('orders')
    .insert({
      store_id:       params.storeId,
      store_name:     params.storeName,
      customer_name:  params.customerName,
      customer_phone: params.customerPhone,
      address:        params.address,
      items:          params.items,
      total:          params.total,
      payment:        params.payment,
      discount:       params.discount,
      final_total:    params.finalTotal,
      status:         'recebido',
    })
    .select('id').single()
  if (error) return { id: null, error: error.message }
  return { id: String(data.id), error: null }
}

export async function apiGetRecentOrders(
  storeId?: number,
  limit = 30
): Promise<{ orders: Order[]; error: string | null }> {
  if (!isSupabaseConfigured()) return { orders: [], error: null }
  let query = getSupabase()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (storeId !== undefined) query = query.eq('store_id', storeId)
  const { data, error } = await query
  if (error) return { orders: [], error: error.message }
  const orders: Order[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id:            String(row.id),
    store_id:      row.store_id      as number,
    storeName:     (row.store_name   as string) ?? '',
    customerName:  row.customer_name  as string,
    customerPhone: row.customer_phone as string,
    address:       row.address        as string,
    items:         row.items          as OrderItem[],
    total:         row.total          as number,
    payment:       row.payment        as string,
    discount:      row.discount       as number,
    final_total:   row.final_total    as number,
    status:        (row.status        as string ?? 'recebido') as Order['status'],
    created_at:    row.created_at     as string,
  }))
  return { orders, error: null }
}

export async function apiUpdateOrderStatus(
  orderId: string,
  status: string
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const { error } = await getSupabase()
    .from('orders')
    .update({ status })
    .eq('id', Number(orderId))
  return { error: error ? error.message : null }
}

export async function apiDeleteOrder(
  orderId: string
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null }
  const { error } = await getSupabase()
    .from('orders')
    .delete()
    .eq('id', Number(orderId))
  return { error: error ? error.message : null }
}
