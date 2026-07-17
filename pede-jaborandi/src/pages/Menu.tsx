// src/pages/Menu.tsx

import { useMemo, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Store, Product, CartItem } from '../types/types'
import type { UseCartResult } from '../hooks/useCart'
import ProductCard from '../components/ProductCard'
import PizzaModal from '../components/PizzaModal'
import { DEFAULT_STORE_COLOR } from '../types/types'
import { formatBRL } from '../lib/format'

type AddItemFn  = UseCartResult['addItem']
type ChangeQty  = UseCartResult['changeQty']

interface MenuProps {
  store:       Store
  addItem:     AddItemFn
  clearCart:   () => void
  showToast:   (msg: string) => void
  cartItems:   CartItem[]
  cartTotal:   number
  onChangeQty: ChangeQty
  onGoToCart:  () => void
}

interface SwitchStoreModalProps {
  fromStore: string
  toStore:   string
  onConfirm: () => void
  onCancel:  () => void
}

function SwitchStoreModal({ fromStore, toStore, onConfirm, onCancel }: SwitchStoreModalProps) {
  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label="Trocar comércio"
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div className="w-full max-w-sm p-6 space-y-4"
        style={{ background: 'var(--md-surface-lowest)', borderRadius: 'var(--shape-xl)', boxShadow: 'var(--md-elev-3)' }}
      >
        <div className="text-center space-y-1">
          <span className="text-3xl">🔄</span>
          <p className="font-bold text-lg" style={{ color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display, sans-serif' }}>
            Trocar comércio?
          </p>
          <p className="text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
            Você tem itens de <strong>{fromStore}</strong> no carrinho.
            Para adicionar de <strong>{toStore}</strong>, o carrinho será esvaziado.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-bold rounded-full transition-all active:scale-95"
            style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}
          >
            Manter carrinho
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-bold rounded-full transition-all active:scale-95"
            style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)', border: 'none' }}
          >
            Trocar loja
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function groupBySection(products: Product[]): Map<string, Product[]> {
  return products.reduce((map, p) => {
    const group = map.get(p.section) ?? []
    group.push(p)
    return map.set(p.section, group)
  }, new Map<string, Product[]>())
}

function isPizza(product: Product): boolean {
  return Array.isArray(product.sizes) && product.sizes.length > 0
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function Menu({
  store, addItem, clearCart, showToast,
  cartItems, cartTotal, onChangeQty, onGoToCart,
}: MenuProps) {
  const color         = store.color || DEFAULT_STORE_COLOR
  const categoryEmoji = store.category.split(' ')[0]
  const rating        = typeof store.rating === 'number' ? store.rating : null

  // Quantidade de cada produto no carrinho (soma todos os configs do mesmo productId)
  const qtyByProductId = useMemo(() => {
    const map = new Map<number, string>()  // productId → _key do primeiro item
    const qty = new Map<number, number>()
    for (const item of cartItems) {
      qty.set(item.productId, (qty.get(item.productId) ?? 0) + item.qty)
      if (!map.has(item.productId)) map.set(item.productId, item._key ?? String(item.productId))
    }
    return qty
  }, [cartItems])

  const keyByProductId = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of cartItems) {
      if (!map.has(item.productId)) map.set(item.productId, item._key ?? String(item.productId))
    }
    return map
  }, [cartItems])

  const totalCartItems = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.qty, 0),
    [cartItems],
  )

  const [search, setSearch] = useState('')

  const groups = useMemo(() => {
    const q = normalize(search)
    const active = store.products.filter(p => p.active !== false)
    const filtered = q
      ? active.filter(p =>
          normalize(p.name).includes(q) || normalize(p.description ?? '').includes(q)
        )
      : active
    return groupBySection(filtered)
  }, [store.products, search])

  const [pendingProduct, setPendingProduct] = useState<Product | null>(null)
  const [pizzaProduct,   setPizzaProduct]   = useState<Product | null>(null)

  const addSimple = useCallback((product: Product) => {
    const result = addItem(store, product)
    if (result === 'different_store') {
      setPendingProduct(product)
      return
    }
    showToast(`✓ ${product.name} adicionado!`)
  }, [store, addItem, showToast])

  const handleAdd = useCallback((product: Product) => {
    if (isPizza(product)) {
      setPizzaProduct(product)
    } else {
      addSimple(product)
    }
  }, [addSimple])

  const confirmSwitch = useCallback(() => {
    if (!pendingProduct) return
    clearCart()
    if (isPizza(pendingProduct)) {
      setPizzaProduct(pendingProduct)
    } else {
      addItem(store, pendingProduct)
      showToast(`✓ ${pendingProduct.name} adicionado!`)
    }
    setPendingProduct(null)
  }, [pendingProduct, store, addItem, clearCart, showToast])

  // Pizzas da mesma seção para metade/metade
  const getPizzasFromSameSection = useCallback((product: Product) => {
    return store.products.filter(p =>
      p.id !== product.id &&
      p.section === product.section &&
      Array.isArray(p.sizes) && p.sizes.length > 0
    )
  }, [store.products])

  return (
    <div className="animate-enter">

      {pendingProduct && (
        <SwitchStoreModal
          fromStore="outro comércio"
          toStore={store.name}
          onConfirm={confirmSwitch}
          onCancel={() => setPendingProduct(null)}
        />
      )}

      {pizzaProduct && (
        <PizzaModal
          product={pizzaProduct}
          allPizzas={getPizzasFromSameSection(pizzaProduct)}
          storeColor={color}
          onConfirm={(config, finalPrice) => {
            const sizeLabel = config.size?.label ?? pizzaProduct.sizes?.[0]?.label ?? ''
            const result = addItem(store, pizzaProduct, {
              size:       sizeLabel,
              crust:      config.crust.label,
              half:       config.half?.name,
              finalPrice,
            })
            if (result === 'different_store') {
              showToast('Esvazie o carrinho para adicionar de outra loja.')
            } else {
              const halfText = config.half ? ` + ½ ${config.half.name}` : ''
              showToast(`✓ ${pizzaProduct.name}${halfText} adicionado!`)
            }
            setPizzaProduct(null)
          }}
          onClose={() => setPizzaProduct(null)}
        />
      )}

      {/* Banner */}
      <div
        className="relative flex items-end"
        style={{ height: '200px', borderRadius: '0 0 var(--shape-xl) var(--shape-xl)', overflow: 'hidden', backgroundColor: color }}
        aria-hidden="true"
      >
        {store.coverImage ? (
          <img src={store.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-9xl filter drop-shadow-lg">{categoryEmoji}</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }} />
        <div className="relative w-full px-5 pb-5">
          <p className="text-white font-bold text-xl leading-snug drop-shadow" style={{ fontFamily: 'Google Sans Display, sans-serif' }}>
            {store.name}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {rating !== null && <span className="text-[12px] font-bold text-white opacity-90">★ {rating.toFixed(1)}</span>}
            {store.deliveryTime && (
              <>
                <span className="text-white opacity-50 text-xs">·</span>
                <span className="text-[12px] text-white opacity-90">🕐 {store.deliveryTime}</span>
              </>
            )}
            <span className="text-white opacity-50 text-xs">·</span>
            <span className="text-[12px] text-white opacity-90">🛵 Entrega grátis</span>
          </div>
        </div>
      </div>

      {/* Busca */}
      {store.status !== 'closed' && store.products.length > 4 && (
        <div className="relative px-4 pt-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
            className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input
            type="text"
            aria-label="Buscar produto no cardápio"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm"
            style={{
              height: '40px', borderRadius: '11px',
              border: '1px solid var(--md-outline-variant)',
              background: 'var(--md-surface-lowest)', color: 'var(--md-on-surface)',
              outline: 'none', paddingLeft: '36px', paddingRight: '14px', fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Cardápio */}
      {store.status === 'closed' ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
          <span className="text-5xl">😴</span>
          <p className="font-bold text-lg" style={{ color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display, sans-serif' }}>Fechado no momento</p>
          <p className="text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>Este comércio está fechado. Tente novamente mais tarde.</p>
        </div>
      ) : (
        <div className="px-4 py-5 space-y-6">
          {[...groups.entries()].map(([section, products]) => (
            <section key={section} aria-label={section}>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--md-on-surface-variant)' }}>
                {section}
              </h2>
              <div className="space-y-3">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categoryEmoji={categoryEmoji}
                    onAdd={handleAdd}
                    cartQty={qtyByProductId.get(product.id) ?? 0}
                    onDecrement={() => {
                      const key = keyByProductId.get(product.id)
                      if (key) onChangeQty(key, -1)
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
          {store.products.length === 0 && (
            <p className="text-center text-sm py-12" style={{ color: 'var(--md-on-surface-variant)' }}>
              Nenhum produto cadastrado neste comércio.
            </p>
          )}
          {store.products.length > 0 && groups.size === 0 && (
            <div className="flex flex-col items-center py-14 gap-3 text-center">
              <span className="text-3xl">🔍</span>
              <p className="font-bold text-sm" style={{ color: 'var(--md-on-surface)' }}>Nenhum produto encontrado</p>
              <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>Tente buscar por outro nome.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Banner flutuante do carrinho ──────────────────────────────────── */}
      {totalCartItems > 0 && (
        <div
          className="fixed left-0 right-0 z-40 px-4"
          style={{ bottom: '84px' }}
        >
          <button
            onClick={onGoToCart}
            className="w-full max-w-lg mx-auto flex items-center justify-between gap-3 px-5 py-3.5 transition-all active:scale-[0.98]"
            style={{
              display:      'flex',
              background:   'var(--md-primary)',
              borderRadius: 'var(--shape-full)',
              boxShadow:    '0 4px 20px rgba(0,0,0,0.25)',
              border:       'none',
              cursor:       'pointer',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
              >
                {totalCartItems > 9 ? '9+' : totalCartItems}
              </span>
              <span className="text-sm font-bold text-white">
                {totalCartItems === 1 ? '1 item' : `${totalCartItems} itens`}
              </span>
            </div>
            <span className="text-sm font-black text-white">
              {formatBRL(cartTotal)} · Ver carrinho →
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
