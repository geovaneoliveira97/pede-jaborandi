// src/components/QuickRating.tsx
// Bottom-sheet de avaliação rápida exibido após o pedido ser enviado.

interface QuickRatingProps {
  storeName: string
  onRate:    (stars: number) => void
  onClose:   () => void
}

export default function QuickRating({ storeName, onRate, onClose }: QuickRatingProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Avalie seu pedido"
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm text-center animate-enter"
        style={{
          background:   'var(--md-surface-lowest)',
          borderRadius: 'var(--shape-xl) var(--shape-xl) 0 0',
          padding:      '24px 24px 40px',
          boxShadow:    'var(--md-elev-3)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--md-outline-variant)' }} />
        </div>

        <div
          className="w-14 h-14 flex items-center justify-center text-3xl mx-auto mb-3"
          style={{ borderRadius: 'var(--shape-full)', background: '#E6F4EC' }}
          aria-hidden="true"
        >
          😊
        </div>

        <p className="font-black text-lg mb-1"
          style={{ color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display, sans-serif' }}>
          Como foi seu pedido?
        </p>
        <p className="text-sm mb-5" style={{ color: 'var(--md-on-surface-variant)' }}>
          {storeName}
        </p>

        {/* Estrelas */}
        <div className="flex justify-center gap-2 mb-5" role="group" aria-label="Selecione a nota">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => onRate(star)}
              aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
              className="text-4xl transition-all active:scale-90"
              style={{ border: 'none', background: 'none', cursor: 'pointer', lineHeight: 1 }}
            >
              ⭐
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="text-sm font-medium"
          style={{ color: 'var(--md-on-surface-variant)', border: 'none', background: 'none', cursor: 'pointer' }}
        >
          Pular avaliação
        </button>
      </div>
    </div>
  )
}
