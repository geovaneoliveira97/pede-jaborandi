// src/pages/Points.tsx
//
// Material You — Fidelidade / Pontos
// Hero card com gradiente primary, barra de progresso com primary-container,
// chips de info com tertiary-container, histórico com surface-lowest.
// Lógica 100% idêntica ao original.

import { useState, useCallback } from 'react'
import { getPoints, getPointsHistory, type PointsHistory } from '../lib/loyaltyApi'
import { useLoyalty } from '../hooks/useLoyalty'
import { formatBRL } from '../lib/format'

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2)  return digits.length ? `(${digits}` : ''
  if (digits.length <= 6)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
}

function isPhoneValid(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 10
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Points() {
  const [phone,    setPhone]    = useState('')
  const [points,   setPoints]   = useState<number | null>(null)
  const [history,  setHistory]  = useState<PointsHistory[]>([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)

  const { config } = useLoyalty()

  const handleSearch = useCallback(async () => {
    if (!isPhoneValid(phone)) return
    setLoading(true)
    setSearched(true)
    const [pts, hist] = await Promise.all([getPoints(phone), getPointsHistory(phone)])
    setPoints(pts)
    setHistory(hist)
    setLoading(false)
  }, [phone])

  const threshold = config?.pts_threshold ?? 10
  const rewardBrl = config?.reward_brl    ?? 5
  const ptsToGo   = points !== null ? Math.max(0, threshold - points) : threshold
  const progress  = points !== null ? Math.min(100, (points / threshold) * 100) : 0

  return (
    <div className="space-y-4 animate-enter">

      {/* ── Hero informativo ── */}
      <section
        className="rounded-[28px] p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--md-primary) 0%, #7A2F00 100%)' }}
      >
        {/* Círculo decorativo */}
        <div
          className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          aria-hidden="true"
        />
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">⭐</span>
          <div>
            <p
              className="font-bold text-lg text-white"
              style={{ fontFamily: 'Google Sans Display, sans-serif' }}
            >
              Fidelidade Jaborandi
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {config?.active
                ? `${threshold} pontos = ${formatBRL(rewardBrl)} de desconto em qualquer comércio`
                : 'Programa em pausa no momento'}
            </p>
          </div>
        </div>

        {config?.active && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: '🛍️', label: 'Compre em qualquer comércio' },
              { icon: '⭐', label: `Ganhe ${config.pts_per_purchase} ponto por compra` },
              { icon: '🎁', label: `${threshold} pontos = ${formatBRL(rewardBrl)} off` },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <p className="text-xl mb-1">{icon}</p>
                <p className="text-[10px] font-semibold text-white leading-tight">{label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Busca por telefone ── */}
      <section
        className="p-5 space-y-3"
        style={{
          borderRadius: 'var(--shape-xl)',
          border:       '1px solid var(--md-outline-variant)',
          background:   'var(--md-surface-lowest)',
        }}
      >
        <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--md-on-surface-variant)' }}>
          📱 Consultar pontos
        </h2>
        <div className="flex gap-2">
          <input
            type="tel" inputMode="numeric" value={phone}
            onChange={e => {
              setPhone(maskPhone(e.target.value))
              setSearched(false)
              setPoints(null)
            }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="(19) 99999-9999"
            autoComplete="tel" maxLength={15}
            className="form-input flex-1"
          />
          <button
            onClick={handleSearch}
            disabled={!isPhoneValid(phone) || loading}
            className="btn-primary px-5 disabled:opacity-50"
          >
            {loading ? '...' : 'Ver'}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--md-on-surface-variant)' }}>
          Use o mesmo número que informa nos pedidos.
        </p>
      </section>

      {/* ── Resultado ── */}
      {searched && !loading && points !== null && (
        <>
          {/* Saldo e barra de progresso */}
          <section
            className="p-5 space-y-4 animate-enter"
            style={{
              borderRadius: 'var(--shape-xl)',
              border:       '1px solid var(--md-outline-variant)',
              background:   'var(--md-surface-lowest)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--md-on-surface-variant)' }}>
                  Seu saldo
                </p>
                <p className="text-5xl font-black" style={{ color: 'var(--md-primary)', fontFamily: 'Google Sans Display, sans-serif' }}>
                  {points}
                  <span className="text-xl ml-2 font-semibold" style={{ color: 'var(--md-on-surface-variant)' }}>pts</span>
                </p>
              </div>

              {points >= threshold ? (
                <div
                  className="rounded-2xl px-4 py-3 text-center"
                  style={{ background: 'var(--md-tertiary-container)', border: '1px solid color-mix(in srgb, var(--md-tertiary) 30%, transparent)' }}
                >
                  <p className="text-2xl">🎁</p>
                  <p className="text-xs font-black mt-1" style={{ color: 'var(--md-on-tertiary-container)' }}>
                    Pronto<br/>para resgatar!
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-2xl px-4 py-3 text-center"
                  style={{ background: 'var(--md-primary-container)', border: '1px solid color-mix(in srgb, var(--md-primary) 30%, transparent)' }}
                >
                  <p className="text-2xl">🔥</p>
                  <p className="text-xs font-black mt-1" style={{ color: 'var(--md-on-primary-container)' }}>
                    Faltam<br/>{ptsToGo} ponto{ptsToGo !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Barra de progresso */}
            <div>
              <div
                className="flex justify-between text-[10px] font-bold mb-1.5"
                style={{ color: 'var(--md-on-surface-variant)' }}
              >
                <span>0</span>
                <span>{threshold} pontos → {formatBRL(rewardBrl)}</span>
              </div>
              <div
                className="w-full h-3 rounded-full overflow-hidden"
                style={{ background: 'var(--md-surface-highest)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width:      `${progress}%`,
                    background: 'linear-gradient(90deg, var(--md-primary), #7A2F00)',
                  }}
                />
              </div>
            </div>

            {points >= threshold && (
              <div
                className="rounded-xl p-3"
                style={{ background: 'var(--md-tertiary-container)' }}
              >
                <p className="text-sm font-semibold text-center" style={{ color: 'var(--md-on-tertiary-container)' }}>
                  🎉 Na próxima compra, informe seu telefone no checkout e use o desconto de {formatBRL(rewardBrl)}!
                </p>
              </div>
            )}
          </section>

          {/* Histórico */}
          <section
            className="p-5 space-y-3 animate-enter"
            style={{
              borderRadius: 'var(--shape-xl)',
              border:       '1px solid var(--md-outline-variant)',
              background:   'var(--md-surface-lowest)',
            }}
          >
            <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--md-on-surface-variant)' }}>
              📋 Histórico
            </h2>

            {history.length === 0 ? (
              <p className="text-center text-sm py-6" style={{ color: 'var(--md-on-surface-variant)' }}>
                Nenhuma movimentação encontrada.
              </p>
            ) : (
              <div className="space-y-1">
                {history.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0"
                    style={{ borderColor: 'var(--md-outline-variant)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                      style={{
                        background: item.type === 'earn'
                          ? 'var(--md-primary-container)'
                          : 'var(--md-tertiary-container)',
                      }}
                    >
                      {item.type === 'earn' ? '⭐' : '🎁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--md-on-surface)' }}>
                        {item.type === 'earn' ? 'Compra realizada' : 'Desconto resgatado'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                    <span
                      className="text-sm font-black shrink-0"
                      style={{ color: item.type === 'earn' ? 'var(--md-primary)' : '#1B6B3A' }}
                    >
                      {item.delta > 0 ? '+' : ''}{item.delta} pt{Math.abs(item.delta) !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Estado vazio */}
      {searched && !loading && points === 0 && history.length === 0 && (
        <div className="text-center py-8 space-y-2 animate-enter">
          <p className="text-4xl">🛍️</p>
          <p className="font-bold" style={{ color: 'var(--md-on-surface)' }}>Nenhum ponto ainda</p>
          <p className="text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
            Faça seu primeiro pedido e ganhe pontos automaticamente!
          </p>
        </div>
      )}
    </div>
  )
}
