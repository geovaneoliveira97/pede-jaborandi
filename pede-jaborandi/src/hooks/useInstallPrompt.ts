// src/hooks/useInstallPrompt.ts
//
// Hook que captura o evento nativo 'beforeinstallprompt' do navegador
// e expõe funções para exibir e controlar o banner de instalação do PWA.
//
// O evento só é disparado quando o app ainda não está instalado e o
// navegador considera que o app é "instalável" (manifest + service worker).
// Em iOS/Safari, o evento não existe — o banner não é exibido nesses casos.

import { useState, useEffect, useCallback } from 'react'

// Tipagem mínima da interface BeforeInstallPromptEvent,
// que ainda não é reconhecida pelo TypeScript padrão (não está na lib DOM).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UseInstallPromptResult {
  canInstall: boolean
  install:    () => Promise<void>
  dismiss:    () => void
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') setPromptEvent(null)
  }, [promptEvent])

  const dismiss = useCallback(() => setPromptEvent(null), [])

  return {
    canInstall: promptEvent !== null,
    install,
    dismiss,
  }
}
