// src/components/BottomNav.tsx
// Admin removido do menu público — acessível via 5 toques no logo do Header

import type { ReactElement } from 'react'
import type { AppView } from '../types/types'

type IconComponent = () => ReactElement

interface NavItem {
  id:    AppView
  label: string
  Icon:  IconComponent
}

interface BottomNavProps {
  view:       AppView
  onNavigate: (view: AppView) => void
  cartCount:  number
}

const NAV_ITEMS: NavItem[] = [
  {
    id:    'home',
    label: 'Início',
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
        className="w-5 h-5" aria-hidden="true">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    id:    'cart',
    label: 'Carrinho',
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
        className="w-5 h-5" aria-hidden="true">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    id:    'pontos',
    label: 'Pontos',
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
        className="w-5 h-5" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
]

export default function BottomNav({ view, onNavigate, cartCount }: BottomNavProps) {
  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-2 pt-2"
      style={{ background: 'transparent' }}
    >
      <div
        className="flex justify-around items-center mx-auto max-w-sm"
        style={{
          background:   '#ffffff',
          border:       '1px solid var(--md-outline-variant)',
          borderRadius: '9999px',
          padding:      '6px 8px',
          boxShadow:    '0 4px 20px rgba(0,0,0,0.10)',
        }}
      >
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = view === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-label={`Ir para ${label}`}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center gap-1 transition-all duration-200 active:scale-90"
              style={{ border: 'none', background: 'none', cursor: 'pointer', minWidth: '64px' }}
            >
              <div
                className="relative flex items-center justify-center"
                style={{
                  padding:      '6px 18px',
                  borderRadius: '9999px',
                  background:   isActive ? 'rgba(232,93,38,0.10)' : 'transparent',
                  color:        isActive ? '#B54A00' : 'var(--md-on-surface-variant)',
                  transition:   'background 0.2s, color 0.2s',
                }}
              >
                {id === 'cart' && cartCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                    style={{ background: '#E85D26', color: '#fff' }}
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
                <Icon />
              </div>
              <span
                aria-hidden="true"
                className="text-[11px] font-medium"
                style={{ color: isActive ? '#B54A00' : 'var(--md-on-surface-variant)' }}
              >
                {label}
              </span>
              {isActive && (
                <span
                  aria-hidden="true"
                  style={{
                    width:        '4px',
                    height:       '4px',
                    borderRadius: '9999px',
                    background:   '#E85D26',
                    marginTop:    '-2px',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
