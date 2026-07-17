// src/components/PizzaModal.tsx
//
// Bottom-sheet de configuração de pizza.
// Fluxo de cima a baixo:
//   0. Tamanho (Grande / Broto) — se houver mais de uma opção
//   1. Inteira ou Metade/Metade?
//   2. Escolher 2º sabor (aparece se metade)
//   3. Escolher borda
// Resumo visual fixo no rodapé.

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Product, PizzaCrust, PizzaSize } from '../types/types'
import { formatBRL } from '../lib/format'

export interface PizzaConfig {
  size:  PizzaSize | null
  half:  Product | null
  crust: PizzaCrust
}

interface PizzaModalProps {
  product:    Product
  allPizzas:  Product[]
  storeColor: string
  onConfirm:  (config: PizzaConfig, finalPrice: number) => void
  onClose:    () => void
}

// Ícone visual da pizza — círculo partido ao meio
function PizzaHalfIcon({ color, isHalf }: { color: string; isHalf: boolean }) {
  return (
    <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        background: `conic-gradient(${color}cc 0deg, ${color} 360deg)`,
        overflow: 'hidden', display: 'flex',
      }}>
        {isHalf && (
          <>
            <div style={{ flex: 1, background: color }} />
            <div style={{ flex: 1, background: `${color}55` }} />
          </>
        )}
      </div>
      {isHalf && (
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          width: '2px', height: '100%',
          background: 'rgba(255,255,255,0.7)',
          transform: 'translateX(-50%)',
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px',
      }}>
        🍕
      </div>
    </div>
  )
}

export default function PizzaModal({ product, allPizzas, storeColor, onConfirm, onClose }: PizzaModalProps) {
  const sizes      = product.sizes ?? []
  const crusts     = product.crusts ?? []
  const allowHalf  = product.allowHalf !== false
  const otherPizzas = allPizzas.filter(p => p.id !== product.id)
  const hasMultipleSizes = sizes.length > 1

  const [selectedSize, setSelectedSize] = useState<PizzaSize | null>(sizes[0] ?? null)
  const [wantHalf,     setWantHalf]     = useState(false)
  const [halfFlavor,   setHalfFlavor]   = useState<Product | null>(null)
  const [crust,        setCrust]        = useState<PizzaCrust | null>(crusts[0] ?? null)

  const halfSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (wantHalf && halfSectionRef.current) {
      setTimeout(() => {
        halfSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [wantHalf])

  const basePrice = useMemo(() => {
    if (selectedSize) return selectedSize.price
    return sizes[0]?.price ?? product.price
  }, [selectedSize, sizes, product.price])

  const finalPrice = useMemo(() => {
    let price = basePrice
    if (wantHalf && halfFlavor) {
      const halfBase = halfFlavor.sizes?.[0]?.price ?? halfFlavor.price
      price = Math.max(basePrice, halfBase)
    }
    return price + (crust?.extra ?? 0)
  }, [basePrice, wantHalf, halfFlavor, crust])

  const canConfirm = crust !== null && (!wantHalf || halfFlavor !== null)

  function handleConfirm() {
    if (!canConfirm || !crust) return
    onConfirm(
      { size: selectedSize, half: wantHalf ? halfFlavor : null, crust },
      finalPrice,
    )
  }

  // Contagem de seções para o badge numérico
  let sectionCounter = 0
  const nextSection = () => { sectionCounter += 1; return sectionCounter }

  // ── Estilos reutilizáveis ────────────────────────────────────────────────
  const sectionTitle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    marginBottom: '12px',
  }

  const badge = (_n: number): React.CSSProperties => ({
    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
    background: storeColor, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: 800,
  })

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Configurar pizza ${product.name}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--md-surface-lowest)',
        borderRadius: 'var(--shape-xl) var(--shape-xl) 0 0',
        boxShadow: 'var(--md-elev-3)',
        maxHeight: '94dvh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--md-outline-variant)' }} />
        </div>

        {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontWeight: 800, fontSize: '17px',
              color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display, sans-serif',
              lineHeight: 1.2,
            }}>
              {product.name}
            </p>
            {product.description && (
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--md-on-surface-variant)', lineHeight: 1.4 }}>
                {product.description}
              </p>
            )}
            <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: '15px', color: storeColor }}>
              {formatBRL(basePrice)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: 'var(--md-surface-high)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', cursor: 'pointer', flexShrink: 0,
              color: 'var(--md-on-surface-variant)', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Divisor */}
        <div style={{ height: '1px', background: 'var(--md-outline-variant)', margin: '14px 20px 0' }} />

        {/* ── Conteúdo scrollável ──────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Seção 0: Tamanho (Grande / Broto) ── */}
          {hasMultipleSizes && (
            <section>
              <div style={sectionTitle}>
                <div style={badge(nextSection())}>{sectionCounter}</div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--md-on-surface)' }}>
                  Qual o tamanho?
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sizes.map(size => {
                  const isSelected = selectedSize?.id === size.id
                  return (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 16px', borderRadius: 'var(--shape-lg)',
                        border: `2px solid ${isSelected ? storeColor : 'var(--md-outline-variant)'}`,
                        background: isSelected ? `${storeColor}12` : 'var(--md-surface-lowest)',
                        cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--md-on-surface)' }}>
                          {size.label}
                        </p>
                        {size.info && (
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--md-on-surface-variant)' }}>
                            {size.info}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? storeColor : 'var(--md-on-surface-variant)' }}>
                          {formatBRL(size.price)}
                        </span>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${isSelected ? storeColor : 'var(--md-outline-variant)'}`,
                          background: isSelected ? storeColor : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Seção 1: Inteira ou Metade/Metade ── */}
          {allowHalf && otherPizzas.length > 0 && (
            <section>
              <div style={sectionTitle}>
                <div style={badge(nextSection())}>{sectionCounter}</div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--md-on-surface)' }}>
                  Como você quer sua pizza?
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Inteira */}
                <button
                  onClick={() => { setWantHalf(false); setHalfFlavor(null) }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    padding: '14px 12px', borderRadius: 'var(--shape-lg)',
                    border: `2px solid ${!wantHalf ? storeColor : 'var(--md-outline-variant)'}`,
                    background: !wantHalf ? `${storeColor}12` : 'var(--md-surface-lowest)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <PizzaHalfIcon color={storeColor} isHalf={false} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--md-on-surface)' }}>Pizza inteira</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--md-on-surface-variant)', textAlign: 'center' }}>Um sabor só</p>
                  {!wantHalf && (
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: storeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
                    </div>
                  )}
                </button>

                {/* Metade/Metade */}
                <button
                  onClick={() => setWantHalf(true)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    padding: '14px 12px', borderRadius: 'var(--shape-lg)',
                    border: `2px solid ${wantHalf ? storeColor : 'var(--md-outline-variant)'}`,
                    background: wantHalf ? `${storeColor}12` : 'var(--md-surface-lowest)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <PizzaHalfIcon color={storeColor} isHalf={true} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--md-on-surface)' }}>Metade/Metade</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--md-on-surface-variant)', textAlign: 'center' }}>Dois sabores</p>
                  {wantHalf && (
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: storeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
                    </div>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* ── Seção 2: 2º Sabor ── */}
          {wantHalf && (
            <section ref={halfSectionRef}>
              <div style={sectionTitle}>
                <div style={badge(nextSection())}>{sectionCounter}</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--md-on-surface)' }}>
                    Qual o 2º sabor?
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: '11px', color: 'var(--md-on-surface-variant)' }}>
                    Cobra o valor do sabor mais caro
                  </p>
                </div>
              </div>

              {/* 1º sabor fixo */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', marginBottom: '8px', borderRadius: 'var(--shape-md)',
                background: `${storeColor}12`, border: `1px solid ${storeColor}40`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '99px', background: storeColor, color: '#fff' }}>½ 1</span>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--md-on-surface)' }}>{product.name}</p>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: storeColor }}>{formatBRL(basePrice)}</span>
              </div>

              {/* Lista de 2º sabor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {otherPizzas.map(p => {
                  const pPrice   = p.sizes?.[0]?.price ?? p.price
                  const selected = halfFlavor?.id === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => setHalfFlavor(p)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', borderRadius: 'var(--shape-md)',
                        border: `2px solid ${selected ? storeColor : 'var(--md-outline-variant)'}`,
                        background: selected ? `${storeColor}12` : 'var(--md-surface-lowest)',
                        cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '99px',
                          background: selected ? storeColor : 'var(--md-outline-variant)',
                          color: selected ? '#fff' : 'var(--md-on-surface-variant)', flexShrink: 0,
                        }}>½ 2</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--md-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </p>
                          {p.description && (
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--md-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-on-surface-variant)' }}>
                          {formatBRL(pPrice)}
                        </span>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${selected ? storeColor : 'var(--md-outline-variant)'}`,
                          background: selected ? storeColor : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff' }} />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Seção 3: Borda ── */}
          {crusts.length > 0 && (
            <section>
              <div style={sectionTitle}>
                <div style={badge(nextSection())}>{sectionCounter}</div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--md-on-surface)' }}>
                  Qual a borda?
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {crusts.map(c => {
                  const selected = crust?.id === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCrust(c)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 16px', borderRadius: 'var(--shape-lg)',
                        border: `2px solid ${selected ? storeColor : 'var(--md-outline-variant)'}`,
                        background: selected ? `${storeColor}12` : 'var(--md-surface-lowest)',
                        cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--md-on-surface)' }}>
                        {c.label}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: c.extra === 0 ? '#16A34A' : 'var(--md-on-surface-variant)' }}>
                          {c.extra === 0 ? 'Grátis' : `+ ${formatBRL(c.extra)}`}
                        </span>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${selected ? storeColor : 'var(--md-outline-variant)'}`,
                          background: selected ? storeColor : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <div style={{ height: '8px' }} />
        </div>

        {/* ── Footer fixo ────────────────────────────────────────────────────── */}
        <div style={{
          padding: '12px 20px 28px',
          borderTop: '1px solid var(--md-outline-variant)',
          background: 'var(--md-surface-lowest)',
        }}>
          {/* Resumo */}
          <div style={{
            padding: '10px 14px', marginBottom: '12px',
            borderRadius: 'var(--shape-md)',
            background: 'var(--md-surface-container, #f5f5f5)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--md-on-surface-variant)' }}>Seu pedido</p>
              <p style={{
                margin: '2px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--md-on-surface)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {selectedSize ? `${selectedSize.label} · ` : ''}
                {wantHalf && halfFlavor
                  ? `½ ${product.name} + ½ ${halfFlavor.name}`
                  : product.name}
              </p>
              {crust && (
                <p style={{ margin: '1px 0 0', fontSize: '11px', color: 'var(--md-on-surface-variant)' }}>
                  Borda: {crust.label}{crust.extra > 0 ? ` (+${formatBRL(crust.extra)})` : ''}
                </p>
              )}
            </div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '20px', color: storeColor, flexShrink: 0 }}>
              {formatBRL(finalPrice)}
            </p>
          </div>

          {wantHalf && !halfFlavor && (
            <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, textAlign: 'center', color: '#B45309' }}>
              👆 Escolha o 2º sabor para continuar
            </p>
          )}

          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              width: '100%', padding: '15px', borderRadius: 'var(--shape-full)',
              border: 'none', cursor: canConfirm ? 'pointer' : 'not-allowed',
              background: canConfirm ? storeColor : 'var(--md-outline-variant)',
              color: '#fff', fontWeight: 800, fontSize: '15px',
              transition: 'background 0.2s, transform 0.1s',
              transform: canConfirm ? 'scale(1)' : 'scale(0.98)',
            }}
          >
            🛒 Adicionar ao carrinho · {formatBRL(finalPrice)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
