// src/components/Toast.tsx
//
// Material You — Snackbar
// Superfície escura (#322F30 — padrão M3), cantos arredondados md,
// elevação 3. Posição e animação idênticas ao original.

interface ToastProps {
  message: string
  visible: boolean
}

export default function Toast({ message, visible }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-24 left-4 right-4 z-50 pointer-events-none
        flex items-center gap-3
        transition-all duration-300 ${
          visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-3'
        }`}
      style={{
        background:   '#322F30',
        color:        '#ECE0DC',
        borderRadius: 'var(--shape-md)',
        padding:      '14px 16px',
        boxShadow:    'var(--md-elev-3)',
        fontFamily:   'Google Sans, sans-serif',
        fontSize:     '14px',
        fontWeight:   500,
      }}
    >
      {message}
    </div>
  )
}
