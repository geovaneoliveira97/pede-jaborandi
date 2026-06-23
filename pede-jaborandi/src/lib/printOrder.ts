// src/lib/printOrder.ts — Impressão de cupom térmico 80mm

import type { Order } from '../types/types'
import { formatBRL } from './format'

export function printOrder(order: Order, storeName: string) {
  const win = window.open('', '_blank', 'width=420,height=700')
  if (!win) return

  const shortId = String(order.id).padStart(6, '0').slice(-6).toUpperCase()
  const dateStr = new Date(order.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const itemsHtml = order.items.map(item => `
    <div class="row">
      <span>${item.qty}x ${item.name}</span>
      <span>${formatBRL(item.price * item.qty)}</span>
    </div>`).join('')

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Pedido #${shortId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 6px 8px; }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .big    { font-size: 15px; }
  .dash   { border-top: 1px dashed #000; margin: 5px 0; }
  .row    { display: flex; justify-content: space-between; margin: 2px 0; }
  .total  { font-size: 14px; font-weight: bold; }
  @media print { button { display: none; } }
</style>
</head>
<body>
  <div class="center bold big">${storeName}</div>
  <div class="center">Pedido #${shortId}</div>
  <div class="center" style="font-size:10px">${dateStr}</div>
  <div class="dash"></div>
  <div class="bold">Cliente: ${order.customerName}</div>
  <div>Tel: ${order.customerPhone}</div>
  ${order.address ? `<div style="margin-top:2px">End: ${order.address}</div>` : '<div style="margin-top:2px">🏃 Retirada no local</div>'}
  <div class="dash"></div>
  <div class="bold" style="margin-bottom:3px">ITENS</div>
  ${itemsHtml}
  <div class="dash"></div>
  ${order.discount > 0 ? `<div class="row"><span>Desconto fidelidade</span><span>- ${formatBRL(order.discount)}</span></div>` : ''}
  <div class="row total"><span>TOTAL</span><span>${formatBRL(order.final_total)}</span></div>
  <div class="dash"></div>
  <div>Pagamento: ${order.payment}</div>
  <div class="dash"></div>
  <div class="center" style="margin-top:6px">Obrigado pela preferência!</div>
  <script>window.onload = function(){ window.print(); window.close(); }</script>
</body>
</html>`)
  win.document.close()
}
