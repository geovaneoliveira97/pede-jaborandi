// src/components/Header.tsx
// 5 toques rápidos no logo J desbloqueiam o painel Admin.

import { useRef } from 'react'

interface HeaderProps {
  title:          string
  onBack?:        () => void
  cartCount?:     number
  onCartClick?:   () => void
  onAdminUnlock?: () => void
}

function LogoJ({ onAdminUnlock }: { onAdminUnlock?: () => void }) {
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleTap() {
    if (!onAdminUnlock) return
    tapCount.current += 1

    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 2000)

    if (tapCount.current >= 5) {
      tapCount.current = 0
      if (tapTimer.current) clearTimeout(tapTimer.current)
      onAdminUnlock()
    }
  }

  return (
    <button
      onClick={handleTap}
      aria-label="Logo Pede Jaborandi"
      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90"
      style={{ background: '#E85D26', border: 'none', cursor: onAdminUnlock ? 'pointer' : 'default' }}
    >
      <span style={{
        fontFamily: 'Google Sans Display, Georgia, serif',
        fontSize: '19px', fontWeight: 700,
        color: '#fff', lineHeight: 1,
        display: 'block', marginTop: '1px',
      }}>
        J
      </span>
    </button>
  )
}

export default function Header({ title, onBack, cartCount, onCartClick, onAdminUnlock }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 px-4 flex items-center gap-3"
      style={{
        background:   '#ffffff',
        borderBottom: '1px solid var(--md-outline-variant)',
        height:       '52px',
      }}
    >
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
          style={{ color: 'var(--md-on-surface-variant)', border: 'none', background: 'none', cursor: 'pointer' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
            className="w-5 h-5" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <LogoJ onAdminUnlock={onAdminUnlock} />
      )}

      <div className="flex-1 min-w-0">
        {!onBack && (
          <p className="text-[10px] font-semibold uppercase tracking-widest leading-none mb-0.5"
            style={{ color: '#B54A00' }}>
            Pede Jaborandi
          </p>
        )}
        <p className="text-sm font-bold leading-snug truncate"
          style={{ color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display, sans-serif' }}>
          {title}
        </p>
      </div>

      {onCartClick !== undefined && (
        <button
          onClick={onCartClick}
          aria-label={`Carrinho com ${cartCount ?? 0} ${cartCount === 1 ? 'item' : 'itens'}`}
          className="relative flex items-center gap-1.5 font-bold text-sm px-3 py-2 rounded-full transition-all active:scale-95"
          style={{ background: '#E85D26', color: '#fff', border: 'none', cursor: 'pointer', minHeight: '40px' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            className="w-4 h-4" aria-hidden="true">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {(cartCount ?? 0) > 0 && (
            <span
              aria-hidden="true"
              className="rounded-full text-[10px] font-black px-1.5 py-0.5 leading-none"
              style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
            >
              {cartCount}
            </span>
          )}
        </button>
      )}
    </header>
  )
}
