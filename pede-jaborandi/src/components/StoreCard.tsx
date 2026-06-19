// src/components/StoreCard.tsx

import { memo, useState } from 'react'
import type { Store } from '../types/types'
import { DEFAULT_STORE_COLOR } from '../types/types'

interface StoreCardProps {
  store:    Store
  onSelect: (store: Store) => void
}

function isWeekend(): boolean {
  const day = new Date().getDay()
  return day === 0 || day === 6
}

function StoreCard({ store, onSelect }: StoreCardProps) {
  const [imgError, setImgError] = useState(false)
  const isClosed  = store.status === 'closed'
  const isVitrine = store.mode === 'vitrine'
  const color     = store.color || DEFAULT_STORE_COLOR
  const emoji     = store.category.split(' ')[0]
  const rating    = typeof store.rating === 'number' ? store.rating : null

  const nextOpen = isClosed && store.openingHours
    ? (isWeekend() ? store.openingHours.weekend : store.openingHours.weekdays)
    : null

  return (
    <button
      onClick={() => !isClosed && onSelect(store)}
      disabled={isClosed}
      aria-label={
        isClosed    ? `${store.name} — fechado` :
        isVitrine   ? `Ver preços de ${store.name}` :
                      `Ver cardápio de ${store.name}`
      }
      className={`w-full text-left overflow-hidden transition-all duration-200 ${
        isClosed ? 'opacity-55 cursor-not-allowed' : 'active:scale-[0.98]'
      }`}
      style={{
        borderRadius: '20px',
        border:       isVitrine ? '1px solid #BFDBFE' : '1px solid var(--md-outline-variant)',
        background:   'var(--md-surface-lowest)',
        boxShadow:    isClosed ? 'none' : '0 2px 8px rgba(0,0,0,0.07)',
      }}
    >
      {/* ── Banner 120px ── */}
      <div className="relative" style={{ height: '120px' }}>
        {store.coverImage && !imgError ? (
          <img
            src={store.coverImage}
            alt={store.name}
            loading="lazy"
            width={400}
            height={120}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: isVitrine ? '#DBEAFE' : color }}
            aria-hidden="true"
          >
            <span style={{ fontSize: '44px' }} className="filter drop-shadow-md">{emoji}</span>
          </div>
        )}

        {/* Gradiente sobre a imagem */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }}
          aria-hidden="true"
        />

        {/* Badge status — superior esquerdo */}
        <span
          className="absolute top-2.5 left-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={
            isClosed  ? { background: 'rgba(0,0,0,0.55)', color: '#fff' } :
            isVitrine ? { background: '#1d4ed8', color: '#fff' } :
                        { background: '#16A34A', color: '#fff' }
          }
        >
          {isClosed ? '● Fechado' : isVitrine ? '🏪 Ver preços' : '● Aberto'}
        </span>

        {/* Rating — superior direito */}
        {rating !== null && (
          <span
            className="absolute top-2.5 right-2.5 text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-0.5"
            style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
          >
            ★ {rating.toFixed(1)}
          </span>
        )}

        {/* Nome sobre o gradiente */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
          <p className="font-black text-white text-base leading-tight drop-shadow">
            {store.name}
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '10px 14px 12px' }}>
        {store.description && (
          <p className="text-xs truncate mb-2" style={{ color: 'var(--md-on-surface-variant)' }}>
            {store.description}
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {isVitrine ? (
            <span className="text-xs font-semibold" style={{ color: '#1d4ed8' }}>
              📋 {store.products.length} produtos cadastrados
            </span>
          ) : (
            <>
              {store.deliveryTime && (
                <span className="text-xs font-semibold" style={{ color: 'var(--md-on-surface-variant)' }}>
                  🕐 {store.deliveryTime}
                </span>
              )}
              <span className="text-xs font-bold" style={{ color: '#16A34A' }}>
                🛵 Entrega grátis
              </span>
              <span className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                {store.products.length} {store.products.length === 1 ? 'item' : 'itens'}
              </span>
            </>
          )}
        </div>

        {/* Horário de abertura quando fechado */}
        {nextOpen && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            🕐 Abre {nextOpen}
          </p>
        )}
      </div>
    </button>
  )
}

export default memo(StoreCard)
