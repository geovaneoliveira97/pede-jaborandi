// src/hooks/useLoyalty.ts
//
// Hook que carrega a config do sistema de pontos e o saldo do usuário.
// Usado no Checkout para mostrar/esconder a opção de resgate.

import { useState, useEffect, useCallback } from 'react'
import { getLoyaltyConfig, getPoints, type LoyaltyConfig } from '../lib/loyaltyApi'

interface UseLoyaltyResult {
  config:       LoyaltyConfig | null
  points:       number
  loading:      boolean
  refreshPoints: (phone: string) => Promise<void>
}

export function useLoyalty(phone?: string): UseLoyaltyResult {
  const [config,  setConfig]  = useState<LoyaltyConfig | null>(null)
  const [points,  setPoints]  = useState(0)
  const [loading, setLoading] = useState(true)

  // Carrega a config uma vez na montagem
  useEffect(() => {
    getLoyaltyConfig().then(cfg => {
      setConfig(cfg)
      setLoading(false)
    })
  }, [])

  // Recarrega o saldo sempre que o telefone mudar (mínimo 10 dígitos)
  useEffect(() => {
    const digits = phone?.replace(/\D/g, '') ?? ''
    if (digits.length < 10) { setPoints(0); return }

    getPoints(digits).then(setPoints)
  }, [phone])

  const refreshPoints = useCallback(async (ph: string) => {
    const digits = ph.replace(/\D/g, '')
    if (digits.length < 10) return
    const pts = await getPoints(digits)
    setPoints(pts)
  }, [])

  return { config, points, loading, refreshPoints }
}
