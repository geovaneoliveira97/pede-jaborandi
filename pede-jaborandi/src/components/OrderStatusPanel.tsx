// src/components/OrderStatusPanel.tsx

import { useState } from 'react'
import type { Order, OrderStatus } from '../types/types'
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW } from '../types/types'
import { buildStatusMessage, openWhatsApp } from '../lib/whatsapp'
import { formatBRL } from '../lib/format'

type FilterTab = 'ativos' | 'todos' | 'entregues'

interface OrderStatusPanelProps {
  orders:         Order[]
  onUpdateStatus: (orderId: string, status: OrderStatus) => void
  onDeleteOrder:  (orderId: string) => void
}

function statusColor(status: OrderStatus) {
  return {
    recebido:   { bg: '#EFF6FF', text: '#1d4ed8', border: '#BFDBFE' },
    preparando: { bg: '#FFF7ED', text: '#c2410c', border: '#FED7AA' },
    saiu:       { bg: '#F0FDF4', text: '#15803d', border: '#BBF7D0' },
    entregue:   { bg: '#F9FAFB', text: '#6b7280', border: '#e5e7eb' },
  }[status] ?? { bg: '#F9FAFB', text: '#6b7280', border: '#e5e7eb' }
}

function sanitizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length >= 10) return '55' + digits
  return digits
}

function toLocalDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function getTodayStr(): string {
  return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function getYesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function dayLabel(dateStr: string): string {
  if (dateStr === getTodayStr())     return 'Hoje'
  if (dateStr === getYesterdayStr()) return 'Ontem'
  return dateStr
}

function groupByDay(orders: Order[]) {
  const map = new Map<string, Order[]>()
  for (const order of orders) {
    const ds = toLocalDateStr(order.created_at)
    if (!map.has(ds)) map.set(ds, [])
    map.get(ds)!.push(order)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateStr, list]) => ({ dateStr, label: dayLabel(dateStr), orders: list }))
}

export default function OrderStatusPanel({ orders, onUpdateStatus, onDeleteOrder }: OrderStatusPanelProps) {
  const [expanded,      setExpanded]      = useState<string | null>(null)
  const [tab,           setTab]           = useState<FilterTab>('ativos')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const today        = getTodayStr()
  const todayOrders  = orders.filter(o => toLocalDateStr(o.created_at) === today)
  const todayTotal   = todayOrders.reduce((s, o) => s + o.final_total, 0)
  const activeCount  = orders.filter(o => o.status !== 'entregue').length

  const filtered = tab === 'ativos'
    ? orders.filter(o => o.status !== 'entregue')
    : tab === 'entregues'
    ? orders.filter(o => o.status === 'entregue')
    : orders

  const groups = groupByDay(filtered)

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'ativos',    label: 'Ativos',    count: orders.filter(o => o.status !== 'entregue').length },
    { key: 'todos',     label: 'Todos',     count: orders.length },
    { key: 'entregues', label: 'Entregues', count: orders.filter(o => o.status === 'entregue').length },
  ]

  return (
    <div className="space-y-3">

      {/* Resumo do dia + contador de ativos */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold" style={{ color: 'var(--md-on-surface-variant)' }}>
          {todayOrders.length > 0
            ? `📅 Hoje: ${todayOrders.length} pedido${todayOrders.length !== 1 ? 's' : ''} · ${formatBRL(todayTotal)}`
            : '📅 Nenhum pedido hoje ainda'}
        </p>
        {activeCount > 0 && (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: '#FEE2E2', color: '#DC2626' }}>
            🔴 {activeCount} ativo{activeCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Abas de filtro */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--md-surface-high)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors"
            style={{
              background: tab === t.key ? 'var(--md-surface-lowest)' : 'transparent',
              color:      tab === t.key ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
              border:     'none',
              boxShadow:  tab === t.key ? 'var(--md-elev-1)' : 'none',
            }}>
            {t.label}{t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Estado vazio */}
      {groups.length === 0 && (
        <div className="text-center py-8" style={{ color: '#9ca3af' }}>
          <p style={{ fontSize: '28px' }}>📋</p>
          <p className="text-sm mt-2 font-semibold">
            {tab === 'ativos' ? 'Nenhum pedido ativo no momento' : 'Nenhum pedido encontrado'}
          </p>
          <p className="text-xs mt-1" style={{ opacity: 0.7 }}>
            {tab === 'ativos' ? 'Todos os pedidos foram entregues' : 'Os pedidos aparecem aqui assim que chegarem'}
          </p>
        </div>
      )}

      {/* Grupos por dia */}
      {groups.map(group => (
        <div key={group.dateStr} className="space-y-2">

          {/* Cabeçalho do dia */}
          <div className="flex items-center gap-2 px-1">
            <p className="text-xs font-bold uppercase tracking-wider shrink-0"
              style={{ color: 'var(--md-on-surface-variant)' }}>
              {group.label}
            </p>
            <div className="flex-1 h-px" style={{ background: 'var(--md-outline-variant)' }} />
            <p className="text-xs shrink-0" style={{ color: 'var(--md-on-surface-variant)' }}>
              {group.orders.length} pedido{group.orders.length !== 1 ? 's' : ''}
              {' · '}
              {formatBRL(group.orders.reduce((s, o) => s + o.final_total, 0))}
            </p>
          </div>

          {/* Cards */}
          {group.orders.map(order => {
            const isOpen     = expanded === order.id
            const colors     = statusColor(order.status)
            const curIdx     = ORDER_STATUS_FLOW.indexOf(order.status)
            const nextStatus = ORDER_STATUS_FLOW[curIdx + 1] as OrderStatus | undefined
            const shortId    = String(order.id).padStart(6, '0').slice(-6).toUpperCase()
            const hour       = new Date(order.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
            })

            return (
              <div key={order.id}
                style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: '14px', overflow: 'hidden' }}>

                {/* Cabeçalho do card */}
                <button onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="w-full flex items-center gap-3 text-left"
                  style={{ padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div className="shrink-0 flex items-center justify-center"
                    style={{ width: '36px', height: '36px', borderRadius: '50%', background: colors.bg, fontSize: '16px' }}>
                    {order.status === 'recebido'   && '📋'}
                    {order.status === 'preparando' && '👨‍🍳'}
                    {order.status === 'saiu'       && '🛵'}
                    {order.status === 'entregue'   && '✅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: '#111827' }}>
                      {order.customerName} · #{shortId}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                      {hour} · {formatBRL(order.final_total)} · {order.payment}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: colors.bg, color: colors.text }}>
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
                      <div className="flex justify-between text-sm font-bold pt-1"
                        style={{ color: '#111827', borderTop: '1px solid #f3f4f6', marginTop: '4px' }}>
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
                            <span className="text-[9px] font-bold text-center"
                              style={{ color: done ? c.text : '#d1d5db', lineHeight: 1.2 }}>
                              {ORDER_STATUS_LABELS[s]}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Avançar status → WhatsApp */}
                    {nextStatus && (
                      <button
                        onClick={() => {
                          onUpdateStatus(order.id, nextStatus)
                          const msg = buildStatusMessage(order.storeName, String(order.id), nextStatus, order.customerName)
                          openWhatsApp(sanitizePhone(order.customerPhone), msg)
                        }}
                        className="w-full font-bold text-sm rounded-full py-2.5 mb-2"
                        style={{ background: '#E85D26', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Avançar para: {ORDER_STATUS_LABELS[nextStatus]} →
                      </button>
                    )}

                    {/* Pedido entregue: mensagem + botão excluir */}
                    {order.status === 'entregue' && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs font-semibold" style={{ color: '#16a34a' }}>✅ Pedido finalizado</p>
                        <button onClick={() => setConfirmDelete(order.id)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full"
                          style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}>
                          🗑️ Excluir
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm p-6 space-y-4"
            style={{ background: 'var(--md-surface-lowest)', borderRadius: 'var(--shape-xl)', boxShadow: 'var(--md-elev-3)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--md-on-surface)' }}>
              Excluir este pedido permanentemente?
            </p>
            <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
              Esta ação não pode ser desfeita. Use apenas para limpar pedidos antigos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 text-sm font-bold rounded-full"
                style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>
                Cancelar
              </button>
              <button onClick={() => { onDeleteOrder(confirmDelete); setConfirmDelete(null) }}
                className="flex-1 py-2.5 text-sm font-bold rounded-full"
                style={{ background: 'var(--md-error)', color: 'var(--md-on-error)', border: 'none' }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
