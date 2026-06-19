// src/components/OrderStatusPanel.tsx
// Painel do comerciante para atualizar status do pedido.
// Ao clicar num status, abre o WhatsApp do cliente com mensagem automática.

import { useState } from 'react'
import type { Order, OrderStatus } from '../types/types'
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW } from '../types/types'
import { buildStatusMessage, openWhatsApp } from '../lib/whatsapp'
import { formatBRL } from '../lib/format'

interface OrderStatusPanelProps {
  orders:         Order[]
  onUpdateStatus: (orderId: string, status: OrderStatus) => void
}

function statusColor(status: OrderStatus) {
  return {
    recebido:   { bg: '#EFF6FF', text: '#1d4ed8', border: '#BFDBFE' },
    preparando: { bg: '#FFF7ED', text: '#c2410c', border: '#FED7AA' },
    saiu:       { bg: '#F0FDF4', text: '#15803d', border: '#BBF7D0' },
    entregue:   { bg: '#F9FAFB', text: '#6b7280', border: '#e5e7eb' },
  }[status] ?? { bg: '#F9FAFB', text: '#6b7280', border: '#e5e7eb' }
}

// Remove tudo que não for dígito e garante o 55 do Brasil
function sanitizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  // Se já tem 55 na frente e tem 12-13 dígitos, está ok
  if (digits.startsWith('55') && digits.length >= 12) return digits
  // Se tem 10-11 dígitos (sem código do país), adiciona 55
  if (digits.length >= 10) return '55' + digits
  return digits
}

export default function OrderStatusPanel({ orders, onUpdateStatus }: OrderStatusPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (orders.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: '#9ca3af' }}>
        <p style={{ fontSize: '28px' }}>📋</p>
        <p className="text-sm mt-2 font-semibold">Nenhum pedido ainda</p>
        <p className="text-xs mt-1" style={{ opacity: 0.7 }}>
          Os pedidos aparecem aqui assim que forem enviados
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const isOpen     = expanded === order.id
        const colors     = statusColor(order.status)
        const curIdx     = ORDER_STATUS_FLOW.indexOf(order.status)
        const nextStatus = ORDER_STATUS_FLOW[curIdx + 1] as OrderStatus | undefined
        // Exibe últimos 6 caracteres do id (funciona para ids numéricos e UUIDs)
        const shortId    = String(order.id).padStart(6, '0').slice(-6).toUpperCase()

        return (
          <div
            key={order.id}
            style={{
              background:   '#ffffff',
              border:       `1px solid ${colors.border}`,
              borderRadius: '14px',
              overflow:     'hidden',
            }}
          >
            {/* Cabeçalho */}
            <button
              onClick={() => setExpanded(isOpen ? null : order.id)}
              className="w-full flex items-center gap-3 text-left"
              style={{ padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div
                className="shrink-0 flex items-center justify-center"
                style={{ width: '36px', height: '36px', borderRadius: '50%', background: colors.bg, fontSize: '16px' }}
              >
                {order.status === 'recebido'   && '📋'}
                {order.status === 'preparando' && '👨‍🍳'}
                {order.status === 'saiu'       && '🛵'}
                {order.status === 'entregue'   && '✅'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: '#111827' }}>
                  {order.customerName} · #{shortId}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                  {order.storeName} · {formatBRL(order.final_total)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <p className="text-[10px] mt-1" style={{ color: '#9ca3af' }}>{isOpen ? '▲' : '▼'}</p>
              </div>
            </button>

            {/* Detalhe expandido */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 14px' }}>

                {/* Endereço */}
                <p className="text-xs mb-3" style={{ color: '#6b7280' }}>📍 {order.address}</p>

                {/* Itens */}
                <div className="space-y-1 mb-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs" style={{ color: '#6b7280' }}>
                      <span>{item.qty}x {item.name}</span>
                      <span>{formatBRL(item.price * item.qty)}</span>
                    </div>
                  ))}
                  {order.discount > 0 && (
                    <div className="flex justify-between text-xs" style={{ color: '#16a34a' }}>
                      <span>🎁 Desconto fidelidade</span>
                      <span>-{formatBRL(order.discount)}</span>
                    </div>
                  )}
                  <div
                    className="flex justify-between text-sm font-bold pt-1"
                    style={{ color: '#111827', borderTop: '1px solid #f3f4f6', marginTop: '4px' }}
                  >
                    <span>Total</span>
                    <span>{formatBRL(order.final_total)}</span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="flex items-center gap-1 mb-4">
                  {ORDER_STATUS_FLOW.map((s, idx) => {
                    const done = idx <= curIdx
                    const c    = statusColor(s)
                    return (
                      <div key={s} className="flex-1 flex flex-col items-center gap-1">
                        <div style={{ height: '4px', borderRadius: '2px', background: done ? '#E85D26' : '#e5e7eb', width: '100%' }} />
                        <span
                          className="text-[9px] font-bold text-center"
                          style={{ color: done ? c.text : '#d1d5db', lineHeight: 1.2 }}
                        >
                          {ORDER_STATUS_LABELS[s]}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Botão próximo status → WhatsApp */}
                {nextStatus && (
                  <button
                    onClick={() => {
                      onUpdateStatus(order.id, nextStatus)
                      const msg = buildStatusMessage(
                        order.storeName,
                        String(order.id),
                        nextStatus,
                        order.customerName,
                      )
                      // Limpa o telefone antes de abrir o WhatsApp
                      openWhatsApp(sanitizePhone(order.customerPhone), msg)
                    }}
                    className="w-full font-bold text-sm rounded-full py-2.5"
                    style={{ background: '#E85D26', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    Avançar para: {ORDER_STATUS_LABELS[nextStatus]} →
                  </button>
                )}

                {order.status === 'entregue' && (
                  <p className="text-center text-xs font-semibold" style={{ color: '#16a34a' }}>
                    ✅ Pedido finalizado
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
