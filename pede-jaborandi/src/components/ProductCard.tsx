// src/components/ProductCard.tsx

import { memo, useState } from 'react'
import type { Product } from '../types/types'
import { formatBRL } from '../lib/format'

interface ProductCardProps {
  product:       Product
  categoryEmoji: string
  onAdd:         (product: Product) => void
  cartQty?:      number
  onDecrement?:  () => void
}

const isPizza = (p: Product) => Array.isArray(p.sizes) && p.sizes.length > 0

function ProductCard({ product, categoryEmoji, onAdd, cartQty = 0, onDecrement }: ProductCardProps) {
  const [imgError, setImgError] = useState(false)
  const pizza  = isPizza(product)
  const inCart = cartQty > 0

  const hasOffer      = product.ofertaDia && typeof product.ofertaPreco === 'number'
  const displayPrice  = hasOffer ? product.ofertaPreco! : product.price

  return (
    <div
      className="flex gap-3 p-4 transition-all duration-150"
      style={{
        borderRadius: 'var(--shape-lg)',
        border:       `1px solid ${inCart ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
        background:   inCart ? 'var(--md-primary-container)' : 'var(--md-surface-lowest)',
      }}
    >
      {/* ── Texto ── */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm leading-snug" style={{ color: 'var(--md-on-surface)' }}>
              {product.name}
            </p>
            {pizza && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: 'var(--md-primary)', color: '#fff' }}
              >
                🍕 Montar
              </span>
            )}
            {hasOffer && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: '#fbbf24', color: '#78350f' }}
              >
                🔥 Oferta
              </span>
            )}
          </div>
          {product.description && (
            <p className="text-xs mt-1 leading-relaxed line-clamp-2"
              style={{ color: 'var(--md-on-surface-variant)' }}>
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Preço */}
          <div>
            {hasOffer && (
              <p className="text-[11px] line-through" style={{ color: 'var(--md-on-surface-variant)' }}>
                {formatBRL(product.price)}
              </p>
            )}
            <p className="text-sm font-black" style={{ color: 'var(--md-primary)' }}>
              {formatBRL(displayPrice)}
            </p>
          </div>

          {/* Controles */}
          {inCart && !pizza ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onDecrement}
                aria-label={`Remover ${product.name} do carrinho`}
                className="flex items-center justify-center text-lg font-bold transition-all active:scale-90"
                style={{
                  width:        '44px',
                  height:       '44px',
                  borderRadius: 'var(--shape-full)',
                  border:       '1.5px solid var(--md-primary)',
                  background:   'transparent',
                  color:        'var(--md-primary)',
                  flexShrink:   0,
                }}
              >
                −
              </button>
              <span
                className="text-sm font-black text-center"
                style={{ minWidth: '1.4rem', color: 'var(--md-primary)' }}
              >
                {cartQty}
              </span>
              <button
                onClick={() => onAdd(product)}
                aria-label={`Adicionar ${product.name} ao carrinho`}
                className="flex items-center justify-center text-lg font-bold transition-all active:scale-90"
                style={{
                  width:        '44px',
                  height:       '44px',
                  borderRadius: 'var(--shape-full)',
                  background:   'var(--md-primary)',
                  color:        '#fff',
                  border:       'none',
                  flexShrink:   0,
                }}
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAdd(product)}
              aria-label={pizza ? `Montar ${product.name}` : `Adicionar ${product.name} ao carrinho`}
              className="ripple flex items-center gap-1 px-3 h-10 text-sm font-bold transition-all active:scale-90"
              style={{
                borderRadius: 'var(--shape-md)',
                background:   inCart ? 'var(--md-primary)' : 'var(--md-primary-container)',
                color:        inCart ? '#fff' : 'var(--md-on-primary-container)',
                border:       'none',
                flexShrink:   0,
              }}
            >
              {pizza ? (inCart ? `🍕 ${cartQty}` : '+') : '+'}
            </button>
          )}
        </div>
      </div>

      {/* ── Imagem ── */}
      <div
        className="flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          width:        '88px',
          height:       '88px',
          borderRadius: 'var(--shape-md)',
          background:   'linear-gradient(135deg, var(--md-primary-container), var(--md-tertiary-container))',
        }}
      >
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={88}
            height={88}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-4xl" aria-hidden="true">{categoryEmoji}</span>
        )}
      </div>
    </div>
  )
}

export default memo(ProductCard)
