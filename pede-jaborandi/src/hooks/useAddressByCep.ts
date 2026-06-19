// src/hooks/useAddressByCep.ts
//
// Hook que dispara a busca na ViaCEP automaticamente quando o CEP
// atingir 8 dígitos, sem precisar de botão de confirmar.
//
// Comportamentos:
//   • Busca automática ao detectar 8 dígitos numéricos no CEP
//   • Debounce de 500ms — evita requisições a cada tecla digitada
//   • Cancela a requisição anterior se o usuário digitar antes da resposta
//   • Distingue estado: idle | loading | success | not_found | error
//   • Expõe os dados do endereço para preencher os campos do formulário

import { useState, useEffect, useRef } from 'react'
import { fetchAddressByCep, CepNotFoundError } from '../lib/viacep'
import type { ViaCepResponse } from '../lib/viacep'

type CepStatus = 'idle' | 'loading' | 'success' | 'not_found' | 'error'

interface UseAddressByCepResult {
  address:  ViaCepResponse | null
  status:   CepStatus
}

const DEBOUNCE_MS = 500

export function useAddressByCep(cep: string): UseAddressByCepResult {
  const [address, setAddress] = useState<ViaCepResponse | null>(null)
  const [status,  setStatus]  = useState<CepStatus>('idle')

  // Ref para o AbortController — cancela a requisição anterior
  // se o CEP mudar antes da resposta chegar.
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const digits = cep.replace(/\D/g, '')

    // Menos de 8 dígitos: reseta para idle sem fazer requisição
    if (digits.length < 8) {
      setAddress(null)
      setStatus('idle')
      return
    }

    // Debounce: aguarda o usuário parar de digitar antes de buscar
    const timer = setTimeout(async () => {
      // Cancela requisição anterior se ainda estiver pendente
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setStatus('loading')

      try {
        const data = await fetchAddressByCep(digits)
        setAddress(data)
        setStatus('success')
      } catch (err) {
        setAddress(null)
        if (err instanceof CepNotFoundError) {
          setStatus('not_found')
        } else {
          setStatus('error')
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [cep])

  return { address, status }
}
