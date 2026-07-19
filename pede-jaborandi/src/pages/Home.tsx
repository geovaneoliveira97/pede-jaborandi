// src/pages/Home.tsx

import { useState, useMemo } from 'react'
import type { Store } from '../types/types'
import StoreCard from '../components/StoreCard'
import LastOrderBanner from '../components/LastOrderBanner'
import { formatBRL } from '../lib/format'

interface HomeProps {
  stores:   Store[]
  onSelect: (store: Store) => void
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function extractCategories(stores: Store[]): string[] {
  const seen = new Set<string>()
  const cats: string[] = ['Todos']
  for (const s of stores) {
    if (!seen.has(s.category)) { seen.add(s.category); cats.push(s.category) }
  }
  return cats
}

export default function Home({ stores: allStores, onSelect }: HomeProps) {
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('Todos')

  // Comércios marcados como não-visíveis (em preparação) não aparecem na
  // vitrine pública — mas continuam gerenciáveis normalmente no Admin.
  const stores = useMemo(() => allStores.filter(s => s.visible !== false), [allStores])

  const categories = useMemo(() => extractCategories(stores), [stores])

  const filtered = useMemo(() => {
    const q = normalize(search)
    return stores.filter(s => {
      const matchCat    = category === 'Todos' || s.category === category
      const matchSearch = q === '' || normalize(s.name).includes(q) || normalize(s.category).includes(q)
      return matchCat && matchSearch
    })
  }, [stores, search, category])

  const ofertasDia = useMemo(() => {
    const result: { store: Store; product: Store['products'][number] }[] = []
    for (const store of stores) {
      for (const product of store.products) {
        if (product.ofertaDia) result.push({ store, product })
      }
    }
    return result
  }, [stores])

  const deliveryStores = filtered.filter(s => s.mode !== 'vitrine')
  const vitrineStores  = filtered.filter(s => s.mode === 'vitrine')
  const openDelivery   = deliveryStores.filter(s => s.status === 'open')
  const closedDelivery = deliveryStores.filter(s => s.status === 'closed')

  return (
    <div className="space-y-4 animate-enter">

      {/* ── Banner hero compacto ── */}
      <section
        className="relative overflow-hidden flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #E85D26 0%, #C44D1E 100%)', borderRadius: '16px', padding: '14px 16px' }}
      >
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} aria-hidden="true" />
        <div className="absolute -right-2 -bottom-3 w-12 h-12 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} aria-hidden="true" />
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full mb-1.5" style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px' }}>
            <span style={{ fontSize: '10px' }} aria-hidden="true">📍</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Jaborandi – SP</span>
          </div>
          <h1 className="font-black text-white" style={{ fontSize: '20px', lineHeight: '1.2' }}>
            O que vai pedir hoje?
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {['Sem taxa', 'Direto no WhatsApp'].map(tag => (
              <span key={tag} className="font-bold rounded-full"
                style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                ✓ {tag}
              </span>
            ))}
          </div>
        </div>
        <span style={{ fontSize: '48px', lineHeight: 1 }} aria-hidden="true">🍔</span>
      </section>

      {/* ── Pedir Novamente ── */}
      <LastOrderBanner stores={stores} onRepeat={onSelect} />

      {/* ── Ofertas do dia ── */}
      {ofertasDia.length > 0 && (
        <section aria-label="Ofertas do dia">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--md-on-surface)' }}>🔥 Ofertas do dia</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {ofertasDia.map(({ store, product }) => (
              <button
                key={`${store.id}-${product.id}`}
                onClick={() => onSelect(store)}
                className="shrink-0 text-left transition-all active:scale-[0.98]"
                style={{
                  width:        '148px',
                  background:   'var(--md-surface-lowest)',
                  border:       '1px solid var(--md-outline-variant)',
                  borderRadius: '14px',
                  overflow:     'hidden',
                  boxShadow:    '0 1px 4px rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ height: '80px', background: store.color || '#E85D26', position: 'relative' }}
                  className="flex items-center justify-center">
                  {product.image
                    ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" width={148} height={80} loading="lazy" />
                    : <span style={{ fontSize: '30px' }}>{store.category.split(' ')[0]}</span>
                  }
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#fbbf24', color: '#78350f' }}>
                    🔥 Oferta
                  </span>
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <p className="font-bold text-xs truncate" style={{ color: 'var(--md-on-surface)' }}>{product.name}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--md-on-surface-variant)' }}>{store.name}</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    {product.ofertaPreco ? (
                      <>
                        <span className="text-xs line-through" style={{ color: 'var(--md-outline)' }}>{formatBRL(product.price)}</span>
                        <span className="text-sm font-black" style={{ color: '#E85D26' }}>{formatBRL(product.ofertaPreco)}</span>
                      </>
                    ) : (
                      <span className="text-sm font-black" style={{ color: '#E85D26' }}>{formatBRL(product.price)}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Busca ── */}
      <div className="relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--md-on-surface-variant)" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
        </svg>
        <input type="text" aria-label="Buscar comércio ou categoria"
          placeholder="Buscar comércio ou categoria..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full text-sm"
          style={{
            height: '44px', borderRadius: '11px',
            border: '1px solid var(--md-outline-variant)',
            background: 'var(--md-surface-lowest)', color: 'var(--md-on-surface)', outline: 'none',
            paddingLeft: '36px', paddingRight: '14px', fontFamily: 'inherit',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#E85D26' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--md-outline-variant)' }}
        />
      </div>

      {/* ── Chips de categoria ── */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
          aria-label="Filtrar por categoria" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => {
            const isAll    = cat === 'Todos'
            const isActive = category === cat
            return (
              <button key={cat} onClick={() => setCategory(cat)} aria-pressed={isActive}
                className="shrink-0 flex items-center gap-1 transition-all"
                style={{
                  padding:      '10px 16px',
                  minHeight:    '40px',
                  borderRadius: '9999px',
                  border:       `1px solid ${isActive ? 'transparent' : 'var(--md-outline-variant)'}`,
                  background:   isActive ? '#B54A00' : 'var(--md-surface-lowest)',
                  color:        isActive ? '#ffffff' : 'var(--md-on-surface-variant)',
                  fontSize:     '12px', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer',
                }}>
                {!isAll && <span aria-hidden="true" style={{ fontSize: '13px' }}>{cat.split(' ')[0]}</span>}
                {isAll ? 'Todos' : cat.split(' ').slice(1).join(' ')}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Comércios com delivery ── */}
      {(openDelivery.length > 0 || closedDelivery.length > 0) && (
        <section aria-label="Comércios com delivery">
          {openDelivery.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold" style={{ color: 'var(--md-on-surface)' }}>Abertos agora</h2>
                <span className="text-xs font-semibold" style={{ color: 'var(--md-on-surface-variant)' }}>
                  {openDelivery.length} {openDelivery.length === 1 ? 'comércio' : 'comércios'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {openDelivery.map((store, i) => <StoreCard key={store.id} store={store} onSelect={onSelect} variant="grid" priority={i < 6} />)}
              </div>
            </>
          )}
          {closedDelivery.length > 0 && (
            <>
              <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--md-on-surface-variant)' }}>Fechados no momento</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {closedDelivery.map((store, i) => <StoreCard key={store.id} store={store} onSelect={onSelect} variant="grid" priority={i < 4} />)}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Mercados — vitrine de preços ── */}
      {vitrineStores.length > 0 && (
        <section aria-label="Mercados — consulte preços">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--md-on-surface)' }}>🏪 Mercados — consulte preços</h2>
          </div>
          <div className="space-y-3">
            {vitrineStores.map(store => <StoreCard key={store.id} store={store} onSelect={onSelect} />)}
          </div>
        </section>
      )}

      {/* ── Estado vazio ── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-14 gap-3 text-center">
          <div className="w-14 h-14 flex items-center justify-center text-2xl rounded-full"
            style={{ background: 'var(--md-surface-highest)' }}>🔍</div>
          <p className="font-bold text-sm" style={{ color: 'var(--md-on-surface)' }}>Nenhum resultado</p>
          <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>Tente buscar por outro nome ou categoria.</p>
        </div>
      )}
    </div>
  )
}
