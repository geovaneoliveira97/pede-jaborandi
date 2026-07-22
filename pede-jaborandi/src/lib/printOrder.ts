// src/lib/printOrder.ts — Impressão de cupom térmico 58mm

import type { Order, OrderItem } from '../types/types'
import { PICKUP_ADDRESS } from '../types/types'
import { formatBRL, describeItem, paymentLabel, splitChangeFor } from './format'

// Dados do pedido (nome, telefone, endereço, itens) vêm de texto livre digitado
// pelo cliente no checkout — nunca interpolar sem escapar, ou HTML/JS injetado
// no nome do cliente executa nesta janela com acesso ao localStorage do admin.
function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

// Codifica uma string UTF-8 em base64 (btoa só aceita Latin1 nativamente).
function toBase64Utf8(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
}

// ── Cupom em HTML (impressão padrão do navegador / impressoras normais) ────

function buildReceiptStyle(): string {
  return `
  @page { size: 58mm auto; margin: 0mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 10px; width: 58mm; padding: 4px 5px; }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .big    { font-size: 13px; }
  .dash   { border-top: 1px dashed #000; margin: 4px 0; }
  .row    { display: flex; justify-content: space-between; margin: 2px 0; }
  .total  { font-size: 12px; font-weight: bold; }`
}

function buildReceiptBody(order: Order, storeName: string, shortId: string, dateStr: string): string {
  const { address, changeFor } = splitChangeFor(order.address)

  const itemsHtml = order.items.map(item => {
    const { title, extra } = describeItem(item)
    const extraHtml = extra.map(l => `<div style="font-size:9px;color:#444;padding-left:6px">${escapeHtml(l)}</div>`).join('')
    return `
    <div class="row">
      <span>${item.qty}x ${escapeHtml(title)}</span>
      <span>${formatBRL(item.price * item.qty)}</span>
    </div>${extraHtml}`
  }).join('')

  return `
  <div class="center bold big">${escapeHtml(storeName)}</div>
  <div class="center">Pedido #${shortId}</div>
  <div class="center" style="font-size:9px">${dateStr}</div>
  <div class="dash"></div>
  <div class="bold">Cliente: ${escapeHtml(order.customerName)}</div>
  <div>Tel: ${escapeHtml(order.customerPhone)}</div>
  ${address === PICKUP_ADDRESS ? '<div style="margin-top:2px">🏃 Retirada no local</div>' : `<div style="margin-top:2px">End: ${escapeHtml(address)}</div>`}
  <div class="dash"></div>
  <div class="bold" style="margin-bottom:3px">ITENS</div>
  ${itemsHtml}
  <div class="dash"></div>
  ${order.discount > 0 ? `<div class="row"><span>Desconto (cupom)</span><span>- ${formatBRL(order.discount)}</span></div>` : ''}
  <div class="row total"><span>TOTAL</span><span>${formatBRL(order.final_total)}</span></div>
  <div class="dash"></div>
  <div>Pagamento: ${escapeHtml(paymentLabel(order.payment))}</div>
  ${changeFor ? `<div>Troco para: R$ ${escapeHtml(changeFor)}</div>` : ''}
  <div class="dash"></div>
  <div class="center" style="margin-top:6px">Obrigado pela preferência!</div>`
}

// ── Cupom em texto puro (RawBT → impressora térmica Bluetooth) ─────────────
// RawBT só imprime de fato no formato "data:text/plain" ou "data:image/*";
// "text/html" nesse esquema apenas abre a página no navegador, não imprime.
// Por isso o cupom para o RawBT precisa ser texto simples, alinhado manualmente
// para a largura de 32 colunas (padrão de bobina 58mm em fonte normal).

const LINE_WIDTH = 32
const DASH_LINE  = '-'.repeat(LINE_WIDTH)

// Normaliza espaço-fixo (ex: o que Intl.NumberFormat usa em "R$ 10,00")
// para espaço comum, evitando caracteres que a impressora não reconheça.
function plain(value: string): string {
  return value.replace(new RegExp(String.fromCharCode(160), "g"), " ")
}

function wrapText(text: string, width: number): string[] {
  const words = plain(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > width) {
      if (current) lines.push(current)
      current = word.length > width ? word.slice(0, width) : word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function centerLine(text: string): string {
  const t = plain(text)
  const pad = Math.max(0, Math.floor((LINE_WIDTH - t.length) / 2))
  return ' '.repeat(pad) + t
}

function twoCol(left: string, right: string): string {
  const l = plain(left)
  const r = plain(right)
  const space = Math.max(1, LINE_WIDTH - l.length - r.length)
  return l + ' '.repeat(space) + r
}

function itemLines(item: OrderItem): string[] {
  const { title, extra } = describeItem(item)
  const priceStr = formatBRL(item.price * item.qty)
  const label    = `${item.qty}x ${plain(title)}`

  const mainLines = label.length + 1 + priceStr.length <= LINE_WIDTH
    ? [twoCol(label, priceStr)]
    : (() => {
        const wrapped = wrapText(label, LINE_WIDTH)
        const lastIdx = wrapped.length - 1
        wrapped[lastIdx] = twoCol(wrapped[lastIdx], priceStr)
        return wrapped
      })()

  const extraLines = extra.flatMap(l => wrapText(l, LINE_WIDTH))
  return [...mainLines, ...extraLines]
}

function buildReceiptText(order: Order, storeName: string, shortId: string, dateStr: string): string {
  const lines: string[] = []
  const { address, changeFor } = splitChangeFor(order.address)

  lines.push(centerLine(storeName))
  lines.push(centerLine(`Pedido #${shortId}`))
  lines.push(centerLine(dateStr))
  lines.push(DASH_LINE)
  lines.push(`Cliente: ${plain(order.customerName)}`)
  lines.push(`Tel: ${plain(order.customerPhone)}`)
  if (address === PICKUP_ADDRESS) {
    lines.push('Retirada no local')
  } else {
    wrapText(`End: ${address}`, LINE_WIDTH).forEach(l => lines.push(l))
  }
  lines.push(DASH_LINE)
  lines.push('ITENS')
  for (const item of order.items) {
    itemLines(item).forEach(l => lines.push(l))
  }
  lines.push(DASH_LINE)
  if (order.discount > 0) {
    lines.push(twoCol('Desconto (cupom)', `-${formatBRL(order.discount)}`))
  }
  lines.push(twoCol('TOTAL', formatBRL(order.final_total)))
  lines.push(DASH_LINE)
  lines.push(`Pagamento: ${plain(paymentLabel(order.payment))}`)
  if (changeFor) lines.push(`Troco para: R$ ${plain(changeFor)}`)
  lines.push(DASH_LINE)
  lines.push(centerLine('Obrigado pela preferência!'))
  lines.push('')
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

export function printOrder(order: Order, storeName: string) {
  const win = window.open('', '_blank', 'width=420,height=700')
  if (!win) return

  const shortId = String(order.storeOrderNumber).padStart(2, '0')
  const dateStr = new Date(order.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const style    = buildReceiptStyle()
  const body     = buildReceiptBody(order, storeName, shortId, dateStr)

  const rawbtText = buildReceiptText(order, storeName, shortId, dateStr)
  const rawbtB64  = toBase64Utf8(rawbtText)

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Pedido #${shortId}</title>
<style>
  ${style}
  @media print { button, a { display: none; } }
</style>
</head>
<body>
  ${body}
  <a href="rawbt:data:text/plain;base64,${rawbtB64}" style="display:block;width:100%;margin-top:10px;padding:8px;font-size:12px;font-weight:bold;border:none;border-radius:6px;background:#16a34a;color:#fff;text-align:center;text-decoration:none;">
    📲 Imprimir (RawBT / Bluetooth)
  </a>
  <button onclick="window.print()" style="display:block;width:100%;margin-top:6px;padding:8px;font-size:12px;font-weight:bold;border:none;border-radius:6px;background:#1e293b;color:#fff;">
    🖨️ Imprimir (padrão do navegador)
  </button>
  <script>window.onafterprint = function(){ window.close(); }</script>
</body>
</html>`)
  win.document.close()
}
