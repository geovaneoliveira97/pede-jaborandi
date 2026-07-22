// src/lib/whatsapp.ts
import type { CartItem, CustomerData, Store, OrderStatus } from '../types/types'
import { PAYMENT_LABELS, ORDER_STATUS_LABELS } from '../types/types'
import { formatBRL } from './format'

function buildFullAddress(c: CustomerData): string {
  return [
    c.street,
    c.number      ? `nº ${c.number}`    : '',
    c.complement  ? `(${c.complement})` : '',
    c.neighborhood,
    c.city,
    c.cep         ? `CEP ${c.cep}`      : '',
  ].filter(Boolean).join(', ')
}

function formatItem(i: CartItem): string {
  const isPizza = !!(i.size || i.half || i.crust)

  if (isPizza) {
    const sabores = i.half
      ? `½ ${i.name} + ½ ${i.half}`
      : i.name

    const lines = [
      `🍕 *${i.qty}x ${i.size ?? 'Pizza'}* — ${formatBRL(i.price * i.qty)}`,
      `   Sabor: ${sabores}`,
    ]

    if (i.crust && i.crust !== 'Sem borda') {
      lines.push(`   Borda: ${i.crust}`)
    }

    return lines.join('\n')
  }

  return `▪️ ${i.qty}x ${i.name} — ${formatBRL(i.price * i.qty)}`
}

export function buildOrderMessage(
  store:         Store,
  items:         CartItem[],
  customer:      CustomerData,
  discount       = 0,
  deliveryType: 'delivery' | 'pickup' = 'delivery',
): string {
  const total      = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const finalTotal = Math.max(0, total - discount)
  const itemsText  = items.map(formatItem).join('\n')
  const now        = new Date().toLocaleString('pt-BR', {
    timeZone:  'America/Sao_Paulo',
    hour:      '2-digit',
    minute:    '2-digit',
    day:       '2-digit',
    month:     '2-digit',
  })

  const lines: string[] = [
    `🛒 *NOVO PEDIDO — ${store.name}*`,
    `🕐 ${now} · via Pede Jaborandi`,
    ``,
    `👤 *Cliente:* ${customer.name}`,
    `📱 *WhatsApp:* ${customer.phone}`,
  ]

  if (deliveryType === 'pickup') {
    lines.push(`🏪 *Tipo:* Retirada no local`)
  } else {
    const fullAddress = buildFullAddress(customer)
    lines.push(`📍 *Endereço:* ${fullAddress}`)
    if (customer.reference.trim()) {
      lines.push(`📌 *Referência:* ${customer.reference.trim()}`)
    }
  }

  lines.push(``)
  lines.push(`━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🛍️ *ITENS:*`)
  lines.push(itemsText)
  lines.push(`━━━━━━━━━━━━━━━━━━━`)

  if (discount > 0) {
    lines.push(`💰 Subtotal: ${formatBRL(total)}`)
    lines.push(`🎟️ Desconto (cupom): -${formatBRL(discount)}`)
    lines.push(`✅ *TOTAL: ${formatBRL(finalTotal)}*`)
  } else {
    lines.push(`✅ *TOTAL: ${formatBRL(total)}*`)
  }

  lines.push(`💳 *Pagamento:* ${PAYMENT_LABELS[customer.payment]}`)

  if (customer.payment === 'dinheiro') {
    lines.push(
      customer.changeFor.trim()
        ? `   💵 Troco para: R$ ${customer.changeFor.trim()}`
        : `   _(não precisa de troco)_`
    )
  }

  lines.push(``)
  lines.push(`_Pede Jaborandi — ${store.name}_`)

  return lines.join('\n')
}

export function buildStatusMessage(
  storeName:    string,
  orderId:      string,
  status:       OrderStatus,
  customerName: string,
): string {
  const label = ORDER_STATUS_LABELS[status]
  const msgs: Record<OrderStatus, string> = {
    recebido:   `Olá *${customerName}*! Seu pedido foi *recebido* por ${storeName} e já está na fila. 📋`,
    preparando: `Olá *${customerName}*! ${storeName} está *preparando* seu pedido agora. 👨‍🍳`,
    saiu:       `Olá *${customerName}*! Seu pedido *saiu para entrega*! Aguarde em breve. 🛵`,
    entregue:   `Olá *${customerName}*! Seu pedido foi *entregue*. Bom apetite! ✅\n\nObrigado por usar o Pede Jaborandi! 🧡`,
  }
  return [
    `${label}`,
    ``,
    msgs[status],
    ``,
    `_Pedido #${orderId.slice(-6).toUpperCase()} · Pede Jaborandi_`,
  ].join('\n')
}

export function openWhatsApp(phone: string, message: string): boolean {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return false
  const encoded = encodeURIComponent(message)
  window.open(`https://wa.me/${digits}?text=${encoded}`, '_blank', 'noopener,noreferrer')
  return true
}
