// src/pages/Cart.tsx
//
// Bug corrigido: onChangeQty usa a _key única do item (não productId),
// garantindo que pizzas com configurações diferentes sejam alteradas corretamente.

import type { CartItem, Store } from '../types/types'
import { formatBRL, describeItem } from '../lib/format'

interface CartProps {
  items:       CartItem[]
  stores:      Store[]
  totalPrice:  number
  onChangeQty: (key: string, delta: number) => void
  onCheckout:  () => void
  onGoHome:    () => void
}

function getKey(item: CartItem): string {
  return (item as CartItem & { _key?: string })._key ?? String(item.productId)
}

export default function Cart({
  items,
  stores,
  totalPrice,
  onChangeQty,
  onCheckout,
  onGoHome,
}: CartProps) {

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-8 animate-enter">
        <div
          className="w-20 h-20 flex items-center justify-center text-4xl"
          style={{ borderRadius: 'var(--shape-full)', background: 'var(--md-surface-container, var(--md-surface-highest))' }}
        >
          🛒
        </div>
        <p className="font-bold text-xl"
          style={{ color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display, sans-serif' }}>
          Carrinho vazio
        </p>
        <p className="text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
          Adicione produtos do cardápio de um comércio para começar.
        </p>
        <button onClick={onGoHome} className="btn-primary mt-2">
          Ver comércios
        </button>
      </div>
    )
  }

  const currentStore = stores.find(s => s.id === items[0].storeId)

  return (
    <div className="space-y-4 animate-enter">

      {currentStore && (
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}
          >
            🏪 {currentStore.name}
          </span>
        </div>
      )}

      {/* ── Itens ── */}
      <section aria-label="Itens do carrinho">
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={getKey(item)}
              className="flex items-center gap-4 p-4"
              style={{
                borderRadius: 'var(--shape-lg)',
                border:       '1px solid var(--md-outline-variant)',
                background:   'var(--md-surface-lowest)',
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: 'var(--md-on-surface)' }}>
                  {item.name}
                </p>

                {/* Chips de configuração de pizza */}
                {(item.size || item.crust || item.half) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.size && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}>
                        {item.size}
                      </span>
                    )}
                    {item.half && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--md-secondary-container, var(--md-surface-container))', color: 'var(--md-on-secondary-container, var(--md-on-surface-variant))' }}>
                        ½ {item.half}
                      </span>
                    )}
                    {item.crust && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--md-surface-container, var(--md-surface-highest))', color: 'var(--md-on-surface-variant)' }}>
                        Borda: {item.crust}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-sm font-black mt-1" style={{ color: 'var(--md-primary)' }}>
                  {formatBRL(item.price * item.qty)}
                </p>
              </div>

              {/* Controles de quantidade — usam _key para identificar o item correto */}
              <div
                className="flex items-center gap-2 shrink-0"
                role="group"
                aria-label={`Quantidade de ${item.name}`}
              >
                <button
                  onClick={() => onChangeQty(getKey(item), -1)}
                  aria-label={`Remover um ${item.name}`}
                  className="flex items-center justify-center text-lg font-bold transition-all active:scale-90"
                  style={{
                    width:        '44px',
                    height:       '44px',
                    borderRadius: 'var(--shape-full)',
                    border:       '1px solid var(--md-outline-variant)',
                    background:   'var(--md-surface-lowest)',
                    color:        'var(--md-on-surface)',
                  }}
                >
                  −
                </button>

                <span
                  className="text-sm font-black text-center"
                  style={{ minWidth: '1.5rem', color: 'var(--md-on-surface)' }}
                >
                  {item.qty}
                </span>

                <button
                  onClick={() => onChangeQty(getKey(item), +1)}
                  aria-label={`Adicionar um ${item.name}`}
                  className="flex items-center justify-center text-lg font-bold transition-all active:scale-90"
                  style={{
                    width:        '44px',
                    height:       '44px',
                    borderRadius: 'var(--shape-full)',
                    background:   'var(--md-primary)',
                    color:        'var(--md-on-primary)',
                    border:       'none',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Resumo ── */}
      <div
        className="p-4 space-y-2"
        style={{
          borderRadius: 'var(--shape-xl)',
          border:       '1px solid var(--md-outline-variant)',
          background:   'var(--md-surface-low)',
        }}
      >
        {items.map(item => {
          const { title, extra } = describeItem(item)
          return (
            <div key={getKey(item)} className="flex justify-between text-sm">
              <span style={{ color: 'var(--md-on-surface-variant)' }}>
                <span>{item.qty}x {title}</span>
                {extra.map((line, i) => (
                  <span key={i} style={{ display: 'block', fontSize: '11px', paddingLeft: '10px' }}>
                    {line}
                  </span>
                ))}
              </span>
              <span className="font-semibold" style={{ color: 'var(--md-on-surface)' }}>
                {formatBRL(item.price * item.qty)}
              </span>
            </div>
          )
        })}
        <div className="h-px my-2" style={{ background: 'var(--md-outline-variant)' }} />
        <div className="flex justify-between items-baseline">
          <span className="font-bold" style={{ color: 'var(--md-on-surface)' }}>Total</span>
          <span className="text-xl font-black" style={{ color: 'var(--md-primary)' }}>
            {formatBRL(totalPrice)}
          </span>
        </div>
      </div>

      <button onClick={onCheckout} className="btn-primary w-full py-4 text-base">
        📲 Finalizar pedido
      </button>
    </div>
  )
}
