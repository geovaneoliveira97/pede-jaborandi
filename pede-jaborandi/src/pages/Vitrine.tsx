// src/pages/Vitrine.tsx
// Vitrine digital — mercado sem entrega
// Só exibe produtos com preço. Sem carrinho, sem WhatsApp de pedido.
// Organizado por seção igual ao Menu.

import type { Store } from '../types/types'
import { formatBRL } from '../lib/format'

interface VitrineProps {
  store: Store
}

function groupBySection(products: Store['products']) {
  const map = new Map<string, Store['products']>()
  for (const p of products) {
    const key = p.section || 'Produtos'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return map
}

export default function Vitrine({ store }: VitrineProps) {
  const sections = groupBySection(store.products)

  return (
    <div className="space-y-4 animate-enter">

      {/* Banner informativo */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
      >
        <span style={{ fontSize: '22px' }}>🏪</span>
        <div>
          <p className="font-bold text-sm" style={{ color: '#1e40af' }}>
            Vitrine de preços — {store.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#3b82f6' }}>
            Consulte os preços e vá pessoalmente ou ligue para o comércio.
          </p>
        </div>
      </div>

      {/* Seções de produtos */}
      {sections.size === 0 ? (
        <div className="flex flex-col items-center py-14 gap-3 text-center">
          <span style={{ fontSize: '32px' }}>📦</span>
          <p className="font-bold text-sm" style={{ color: '#111827' }}>Nenhum produto cadastrado</p>
        </div>
      ) : (
        Array.from(sections.entries()).map(([section, products]) => (
          <section key={section} aria-label={section}>
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: '#9ca3af' }}
            >
              {section}
            </h2>
            <div className="space-y-2">
              {products.map(product => (
                <div
                  key={product.id}
                  className="flex items-center gap-3"
                  style={{
                    background:   '#ffffff',
                    border:       '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding:      '10px 12px',
                  }}
                >
                  {/* Imagem ou emoji */}
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="shrink-0 object-cover"
                      style={{ width: '48px', height: '48px', borderRadius: '8px' }}
                    />
                  ) : (
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{
                        width: '48px', height: '48px', borderRadius: '8px',
                        background: '#f3f4f6', fontSize: '22px',
                      }}
                      aria-hidden="true"
                    >
                      {store.category.split(' ')[0]}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: '#111827' }}>
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#9ca3af' }}>
                        {product.description}
                      </p>
                    )}
                    {product.ofertaDia && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#FEF9C3', color: '#92400E' }}
                      >
                        🔥 Oferta do dia
                      </span>
                    )}
                  </div>

                  {/* Preço */}
                  <div className="shrink-0 text-right">
                    {product.ofertaDia && product.ofertaPreco ? (
                      <>
                        <p className="text-xs line-through" style={{ color: '#9ca3af' }}>
                          {formatBRL(product.price)}
                        </p>
                        <p className="font-black text-sm" style={{ color: '#E85D26' }}>
                          {formatBRL(product.ofertaPreco)}
                        </p>
                      </>
                    ) : (
                      <p className="font-black text-sm" style={{ color: '#111827' }}>
                        {formatBRL(product.price)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
