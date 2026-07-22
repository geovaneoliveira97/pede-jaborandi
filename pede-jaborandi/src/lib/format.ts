// src/lib/format.ts
//
// Utilitários de formatação usados em todo o projeto.
// Centralizar aqui elimina a duplicação de formatBRL que existia em
// Cart.tsx, Checkout.tsx e whatsapp.ts.

import { PAYMENT_LABELS, CHANGE_FOR_MARKER, type PaymentMethod } from '../types/types'

// Formata valor em reais com separadores brasileiros (ex: R$ 1.234,50)
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:                 'currency',
    currency:              'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

interface DescribableItem {
  name:   string
  size?:  string
  crust?: string
  half?:  string
}

// Monta o título e as linhas de detalhe (sabor/borda) de um item de pedido.
// Usado no cupom impresso e no painel de pedidos — pizzas meio a meio só têm
// o sabor completo nesses campos opcionais, "name" sozinho não basta.
export function describeItem(item: DescribableItem): { title: string; extra: string[] } {
  const isPizza = !!(item.size || item.half || item.crust)
  if (!isPizza) return { title: item.name, extra: [] }

  const extra: string[] = []
  extra.push(`Sabor: ${item.half ? `½ ${item.name} + ½ ${item.half}` : item.name}`)
  if (item.crust && item.crust !== 'Sem borda') extra.push(`Borda: ${item.crust}`)

  return { title: item.size ?? 'Pizza', extra }
}

// Order.payment guarda a chave crua ('dinheiro' | 'pix' | 'cartao'); a
// mensagem de WhatsApp usa o rótulo (PAYMENT_LABELS). Mantém os dois iguais.
export function paymentLabel(payment: string): string {
  return PAYMENT_LABELS[payment as PaymentMethod] ?? payment
}

// Separa o valor do troco embutido no fim de Order.address (ver CHANGE_FOR_MARKER).
export function splitChangeFor(address: string): { address: string; changeFor: string | null } {
  const idx = address.indexOf(CHANGE_FOR_MARKER)
  if (idx === -1) return { address, changeFor: null }
  return {
    address:   address.slice(0, idx),
    changeFor: address.slice(idx + CHANGE_FOR_MARKER.length),
  }
}
