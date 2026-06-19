// src/hooks/useToast.ts
//
// Hook para exibir notificações temporárias (toast).
// Encapsula o timer de auto-ocultação — o chamador apenas chama showToast()
// e não precisa gerenciar nenhum setTimeout diretamente.

import { useState, useCallback, useRef } from 'react'

const TOAST_DURATION_MS = 2500

interface UseToastResult {
  message:   string
  visible:   boolean
  showToast: (msg: string) => void
}

export function useToast(): UseToastResult {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    // Cancela qualquer timer anterior antes de iniciar um novo,
    // evitando que um toast anterior feche o toast atual cedo demais.
    if (timerRef.current) clearTimeout(timerRef.current)

    setMessage(msg)
    setVisible(true)

    timerRef.current = setTimeout(() => {
      setVisible(false)
    }, TOAST_DURATION_MS)
  }, [])

  return { message, visible, showToast }
}
