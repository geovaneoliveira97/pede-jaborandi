// src/lib/printOrder.ts — Impressão de cupom térmico 58mm

import type { Order } from '../types/types'
import { formatBRL } from './format'

// Dados do pedido (nome, telefone, endereço, itens) vêm de texto livre digitado
// pelo cliente no checkout — nunca interpolar sem escapar, ou HTML/JS injetado
// no nome do cliente executa nesta janela com acesso ao localStorage do admin.
function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

export function printOrder(order: Order, storeName: string) {
  const win = window.open('', '_blank', 'width=420,height=700')
  if (!win) return

  const shortId = String(order.id).padStart(6, '0').slice(-6).toUpperCase()
  const dateStr = new Date(order.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const itemsHtml = order.items.map(item => `
    <div class="row">
      <span>${item.qty}x ${escapeHtml(item.name)}</span>
      <span>${formatBRL(item.price * item.qty)}</span>
    </div>`).join('')

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Pedido #${shortId}</title>
<style>
  @page { size: 58mm auto; margin: 0mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 10px; width: 58mm; padding: 4px 5px; }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .big    { font-size: 13px; }
  .dash   { border-top: 1px dashed #000; margin: 4px 0; }
  .row    { display: flex; justify-content: space-between; margin: 2px 0; }
  .total  { font-size: 12px; font-weight: bold; }
  @media print { button { display: none; } }
</style>
</head>
<body>
  <div class="center bold big">${escapeHtml(storeName)}</div>
  <div class="center">Pedido #${shortId}</div>
  <div class="center" style="font-size:9px">${dateStr}</div>
  <div class="dash"></div>
  <div class="bold">Cliente: ${escapeHtml(order.customerName)}</div>
  <div>Tel: ${escapeHtml(order.customerPhone)}</div>
  ${order.address ? `<div style="margin-top:2px">End: ${escapeHtml(order.address)}</div>` : '<div style="margin-top:2px">🏃 Retirada no local</div>'}
  <div class="dash"></div>
  <div class="bold" style="margin-bottom:3px">ITENS</div>
  ${itemsHtml}
  <div class="dash"></div>
  ${order.discount > 0 ? `<div class="row"><span>Desconto (cupom)</span><span>- ${formatBRL(order.discount)}</span></div>` : ''}
  <div class="row total"><span>TOTAL</span><span>${formatBRL(order.final_total)}</span></div>
  <div class="dash"></div>
  <div>Pagamento: ${escapeHtml(order.payment)}</div>
  <div class="dash"></div>
  <div class="center" style="margin-top:6px">Obrigado pela preferência!</div>
  <script>window.onload = function(){ window.print(); window.close(); }</script>
</body>
</html>`)
  win.document.close()
}
