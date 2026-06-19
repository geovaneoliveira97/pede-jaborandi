// src/components/LoadingScreen.tsx

interface ErrorScreenProps {
  onRetry: () => void
}

// ── Skeleton atoms ────────────────────────────────────────────────────────────

function SkeletonBlock({ w, h, radius = 8 }: { w: string; h: number; radius?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{
        width:           w,
        height:          `${h}px`,
        borderRadius:    `${radius}px`,
        background:      'var(--md-surface-highest)',
      }}
    />
  )
}

function SkeletonStoreCard() {
  return (
    <div
      style={{
        borderRadius: '20px',
        border:       '1px solid var(--md-outline-variant)',
        background:   'var(--md-surface-lowest)',
        overflow:     'hidden',
      }}
    >
      {/* Banner */}
      <div className="animate-pulse" style={{ height: '120px', background: 'var(--md-surface-highest)' }} />
      {/* Body */}
      <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SkeletonBlock w="55%" h={14} radius={7} />
        <SkeletonBlock w="35%" h={11} radius={6} />
        <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
          <SkeletonBlock w="25%" h={11} radius={6} />
          <SkeletonBlock w="30%" h={11} radius={6} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonHome() {
  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <div className="animate-pulse" style={{ height: '90px', borderRadius: '16px', background: 'var(--md-primary-container)' }} />

      {/* Search bar */}
      <div className="animate-pulse" style={{ height: '40px', borderRadius: '11px', background: 'var(--md-surface-highest)' }} />

      {/* Category chips */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[80, 70, 90, 65].map((w, i) => (
          <div key={i} className="animate-pulse" style={{ width: w, height: 36, borderRadius: 9999, background: 'var(--md-surface-highest)', flexShrink: 0 }} />
        ))}
      </div>

      {/* Section title */}
      <SkeletonBlock w="40%" h={14} radius={7} />

      {/* Store cards */}
      {[1, 2, 3].map(i => <SkeletonStoreCard key={i} />)}
    </div>
  )
}

// ── Full-screen loading (usado apenas fora do layout principal) ───────────────

export function LoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando comércios"
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--md-background)' }}
    >
      <div
        className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--md-primary)', borderTopColor: 'transparent' }}
        aria-hidden="true"
      />
      <p className="text-sm font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
        Carregando comércios...
      </p>
    </div>
  )
}

export function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <div
      role="alert"
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center"
      style={{ background: 'var(--md-background)' }}
    >
      <div
        className="w-16 h-16 flex items-center justify-center"
        style={{ borderRadius: 'var(--shape-xl)', background: 'var(--md-error-container)' }}
      >
        <svg
          viewBox="0 0 24 24" fill="none"
          stroke="var(--md-on-error-container)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="w-8 h-8" aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div>
        <p className="font-bold"
          style={{ color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display, sans-serif', fontSize: '18px' }}>
          Sem conexão
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--md-on-surface-variant)' }}>
          Não foi possível carregar os comércios.
          Verifique sua internet e tente novamente.
        </p>
      </div>

      <button onClick={onRetry} className="btn-primary mt-2">
        Tentar novamente
      </button>
    </div>
  )
}
