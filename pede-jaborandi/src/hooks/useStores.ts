// src/hooks/useStores.ts

import { useState, useEffect, useCallback } from 'react'
import { isSupabaseConfigured, getSupabase } from '../lib/supabase'
import { isStore } from '../types/types'
import type { Store, Product } from '../types/types'
import { MOCK_STORES } from '../data/mockStores'

const TIMEOUT_MS = 10_000

interface UseStoresResult {
  stores:  Store[]
  loading: boolean
  error:   boolean
  retry:   () => void
}

function mapProduct(raw: Record<string, unknown>): Product {
  return {
    id:          raw.id          as number,
    name:        raw.name        as string,
    description: raw.description as string,
    price:       raw.price       as number,
    section:     raw.section     as string,
    image:       raw.image       as string | undefined,
    ofertaDia:   raw.oferta_dia  === true,
    ofertaPreco: raw.oferta_preco != null ? (raw.oferta_preco as number) : undefined,
    // Campos de pizza
    productType: raw.product_type != null ? (raw.product_type as 'pizza' | 'item') : undefined,
    sizes:       Array.isArray(raw.sizes)  ? raw.sizes  as import('../types/types').PizzaSize[]  : undefined,
    crusts:      Array.isArray(raw.crusts) ? raw.crusts as import('../types/types').PizzaCrust[] : undefined,
    allowHalf:   raw.allow_half  != null ? (raw.allow_half as boolean) : undefined,
  }
}

function mapStore(raw: Record<string, unknown>): Store {
  const rawProducts = Array.isArray(raw.products)
    ? (raw.products as Record<string, unknown>[])
    : []
  return {
    id:           raw.id           as number,
    name:         raw.name         as string,
    category:     raw.category     as string,
    description:  raw.description  as string,
    phone:        raw.phone        as string,
    color:        raw.color        as string,
    status:       raw.status       as 'open' | 'closed',
    mode:         (raw.mode        as string ?? 'delivery') as 'delivery' | 'vitrine',
    rating:       raw.rating       != null ? (raw.rating       as number) : undefined,
    deliveryTime: raw.delivery_time != null ? (raw.delivery_time as string) : undefined,
    coverImage:   raw.cover_image  != null ? (raw.cover_image  as string) : undefined,
    owner_id:     raw.owner_id     != null ? (raw.owner_id     as string) : undefined,
    products:     rawProducts.map(mapProduct),
  }
}

export function useStores(): UseStoresResult {
  const [stores,   setStores]   = useState<Store[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const retry = useCallback(() => setRetryKey(k => k + 1), [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStores(MOCK_STORES)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(false)

    const timeout = setTimeout(() => {
      if (!cancelled) { setError(true); setLoading(false) }
    }, TIMEOUT_MS)

    const run = async () => {
      try {
        const { data, error: supabaseError } = await getSupabase()
          .from('stores')
          .select('*, products(*)')

        clearTimeout(timeout)
        if (cancelled) return

        if (supabaseError) {
          if (import.meta.env.DEV) console.error('Erro ao buscar comércios:', supabaseError)
          setError(true)
        } else {
          const mapped = (data ?? [])
            .map(raw => mapStore(raw as Record<string, unknown>))
            .filter(isStore)
          setStores(mapped)
        }
        setLoading(false)
      } catch {
        clearTimeout(timeout)
        if (!cancelled) { setError(true); setLoading(false) }
      }
    }
    run()

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [retryKey])

  return { stores, loading, error, retry }
}
