// src/components/LastOrderBanner.tsx
// Exibe o último pedido salvo e permite repetir com 1 toque.

import { useState, useEffect } from 'react'
import type { Store } from '../types/types'
import { formatBRL } from '../lib/format'

interface LastOrder {
  storeId:   number
  storeName: string
  items:     { name: string; qty: number }[]
  total:     number
  date:      string
}

interface LastOrderBannerProps {
  stores:   Store[]
  onRepeat: (store: Store) => void
}

export function saveLastOrder(data: {
  storeId:   number
  storeName: string
  items:     { name: string; qty: number }[]
  total:     number
}): void {
  try {
    localStorage.setItem('pj_last_order', JSON.stringify({
      ...data,
      date: new Date().toISOString(),
    }))
  } catch { /* ignora erros de storage */ }
}

export default function LastOrderBanner({ stores, onRepeat }: LastOrderBannerProps) {
  const [last, setLast] = useState<LastOrder | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pj_last_order')
      if (raw) setLast(JSON.parse(raw) as LastOrder)
    } catch { /* ignora */ }
  }, [])

  if (!last) return null

  const store = stores.find(s => s.id === last.storeId)
  if (!store || store.status === 'closed') return null

  const summary = last.items
    .slice(0, 2)
    .map(i => `${i.qty}x ${i.name}`)
    .join(', ')
  const extra  = last.items.length > 2 ? ` +${last.items.length - 2} itens` : ''

  const diffMs  = Date.now() - new Date(last.date).getTime()
  const daysAgo = Math.floor(diffMs / 86_400_000)
  const dateLabel =
    daysAgo === 0 ? 'Hoje' :
    daysAgo === 1 ? 'Ontem' :
    `Há ${daysAgo} dias`

  return (
    <section aria-label="Pedido recente">
      <button
        onClick={() => onRepeat(store)}
        className="w-full text-left flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
        style={{
          borderRadius: '16px',
          border:       '1.5px solid var(--md-primary)',
          background:   'var(--md-primary-container)',
        }}
      >
        {/* Ícone */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{ background: 'var(--md-primary)', color: '#fff' }}
          aria-hidden="true"
        >
          🔄
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold" style={{ color: 'var(--md-on-surface-variant)' }}>
            {dateLabel} · {last.storeName}
          </p>
          <p className="text-sm font-black" style={{ color: 'var(--md-on-primary-container)' }}>
            Pedir novamente
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--md-on-surface-variant)' }}>
            {summary}{extra}
          </p>
        </div>

        {/* Preço e seta */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-black" style={{ color: 'var(--md-primary)' }}>
            {formatBRL(last.total)}
          </p>
          <p className="text-xs font-bold" style={{ color: 'var(--md-primary)' }}>→</p>
        </div>
      </button>
    </section>
  )
}
