// src/hooks/useCart.ts
//
// Hook do carrinho com suporte a pizzas configuradas (tamanho, borda, metade).
// Mantém retrocompatibilidade total com itens simples (bebidas, lanches, etc.).
//
// Para pizzas, cada configuração diferente cria um item separado no carrinho
// (uma Pizza Grande Catupiry é diferente de uma Pizza Broto sem borda),
// identificada pela chave composta: productId + size + crust + half.

import { useState, useCallback, useMemo } from 'react'
import type { CartItem, Store, Product } from '../types/types'

const STORAGE_KEY = 'pj_cart'

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

function saveToStorage(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignora erros de storage (modo privativo etc.)
  }
}

/** Chave única para identificar a combinação de produto + configuração */
function itemKey(productId: number, size?: string, crust?: string, half?: string): string {
  return [productId, size ?? '', crust ?? '', half ?? ''].join('|')
}

export interface PizzaOptions {
  size:        string   // ex: 'Grande 35cm'
  crust:       string   // ex: 'Catupiry'
  half?:       string   // ex: 'Calabresa'
  finalPrice:  number   // preço já calculado (tamanho + borda)
}

export interface UseCartResult {
  items:      CartItem[]
  totalItems: number
  totalPrice: number
  addItem:         (store: Store, product: Product, pizza?: PizzaOptions) => 'added' | 'different_store'
  changeQty:       (key: string, delta: number) => void
  clearCart:       () => void
  /** Para compatibilidade com código legado que usa productId */
  changeQtyById:   (productId: number, delta: number) => void
}

export function useCart(): UseCartResult {
  const [items, setItems] = useState<CartItem[]>(loadFromStorage)

  const update = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setItems(prev => {
      const next = updater(prev)
      saveToStorage(next)
      return next
    })
  }, [])

  const addItem = useCallback(
    (store: Store, product: Product, pizza?: PizzaOptions): 'added' | 'different_store' => {
      let result: 'added' | 'different_store' = 'added'

      update(prev => {
        if (prev.length > 0 && prev[0].storeId !== store.id) {
          result = 'different_store'
          return prev
        }

        const key = itemKey(
          product.id,
          pizza?.size,
          pizza?.crust,
          pizza?.half,
        )

        const existing = prev.find(i => i._key === key)
        if (existing) {
          return prev.map(i => i._key === key ? { ...i, qty: i.qty + 1 } : i)
        }

        const newItem: CartItem & { _key: string } = {
          _key:      key,
          storeId:   store.id,
          productId: product.id,
          name:      product.name,
          price:     pizza ? pizza.finalPrice : product.price,
          qty:       1,
          image:     product.image,
          size:      pizza?.size,
          crust:     pizza?.crust,
          half:      pizza?.half,
        }

        return [...prev, newItem]
      })

      return result
    },
    [update],
  )

  /** Altera quantidade pelo identificador único da configuração */
  const changeQty = useCallback((key: string, delta: number) => {
    update(prev =>
      prev
        .map(i => (i as CartItem & { _key?: string })._key === key ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0),
    )
  }, [update])

  /** Retrocompatibilidade: altera pelo productId (pega o primeiro match) */
  const changeQtyById = useCallback((productId: number, delta: number) => {
    update(prev =>
      prev
        .map(i => i.productId === productId ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0),
    )
  }, [update])

  const clearCart = useCallback(() => update(() => []), [update])

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.qty, 0),
    [items],
  )

  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items],
  )

  return { items, totalItems, totalPrice, addItem, changeQty, changeQtyById, clearCart }
}
