// src/pages/Checkout.tsx

import { useState, useCallback, useEffect } from 'react'
import type { CartItem, Store, CustomerData, PaymentMethod } from '../types/types'
import { PAYMENT_LABELS } from '../types/types'
import { buildOrderMessage, openWhatsApp } from '../lib/whatsapp'
import { useAddressByCep } from '../hooks/useAddressByCep'
import { useLoyalty } from '../hooks/useLoyalty'
import { creditPoint, redeemPoints } from '../lib/loyaltyApi'
import { formatBRL } from '../lib/format'
import { apiSaveOrder } from '../lib/adminApi'
import { saveLastOrder } from '../components/LastOrderBanner'

type DeliveryType = 'delivery' | 'pickup'

interface CheckoutProps {
  items:      CartItem[]
  stores:     Store[]
  totalPrice: number
  onSuccess:  () => void
  showToast:  (msg: string) => void
}

const PAYMENT_OPTIONS: { value: PaymentMethod; icon: string }[] = [
  { value: 'dinheiro', icon: '💵' },
  { value: 'pix',      icon: '📱' },
  { value: 'cartao',   icon: '💳' },
]

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2)  return digits.length ? `(${digits}` : ''
  if (digits.length <= 6)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
}

function isPhoneValid(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 10
}

// ── Modal de confirmação ──────────────────────────────────────────────────────
interface ConfirmModalProps {
  onConfirm: () => void
  onCancel:  () => void
}

function ConfirmModal({ onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Pedido enviado"
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div className="w-full max-w-sm p-6 space-y-4 text-center"
        style={{ background: 'var(--md-surface-lowest)', borderRadius: 'var(--shape-xl)', boxShadow: 'var(--md-elev-3)' }}>
        <div className="w-16 h-16 flex items-center justify-center text-3xl mx-auto"
          style={{ borderRadius: 'var(--shape-full)', background: '#E6F4EC' }}>
          🎉
        </div>
        <div>
          <p className="font-bold text-lg"
            style={{ color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display, sans-serif' }}>
            Pedido enviado!
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--md-on-surface-variant)' }}>
            Deseja limpar o carrinho e voltar para o início?
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-bold rounded-full transition-all active:scale-95"
            style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>
            Continuar comprando
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-bold rounded-full transition-all active:scale-95"
            style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)', border: 'none' }}>
            Voltar ao início
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Estilos reutilizáveis ─────────────────────────────────────────────────────
const sectionStyle: React.CSSProperties = {
  borderRadius: 'var(--shape-xl)',
  border:       '1px solid var(--md-outline-variant)',
  background:   'var(--md-surface-lowest)',
  padding:      '20px',
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize:      '11px',
  fontWeight:    600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color:         'var(--md-on-surface-variant)',
  marginBottom:  '14px',
}

export default function Checkout({ items, stores, totalPrice, onSuccess, showToast }: CheckoutProps) {
  const [customer, setCustomer] = useState<CustomerData>({
    name: '', phone: '', cep: '', street: '', number: '',
    complement: '', neighborhood: '', city: '', reference: '', payment: 'dinheiro',
  })
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery')
  const [sending,      setSending]      = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [useDiscount,  setUseDiscount]  = useState(false)
  const [redeeming,    setRedeeming]    = useState(false)

  const store = stores.find(s => s.id === items[0]?.storeId)
  const { address: cepData, status: cepStatus } = useAddressByCep(
    deliveryType === 'delivery' ? customer.cep : '',
  )
  const { config: loyaltyConfig, points, refreshPoints } = useLoyalty(customer.phone)

  useEffect(() => {
    if (!cepData) return
    setCustomer(prev => ({
      ...prev,
      street:       cepData.logradouro || prev.street,
      neighborhood: cepData.bairro     || prev.neighborhood,
      city:         cepData.localidade || prev.city,
    }))
  }, [cepData])

  useEffect(() => {
    if (useDiscount && !isPhoneValid(customer.phone)) setUseDiscount(false)
  }, [customer.phone, useDiscount])

  // Ao trocar para retirada, limpa campos de endereço para não bloquear validação
  useEffect(() => {
    if (deliveryType === 'pickup') {
      setCustomer(prev => ({
        ...prev, cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', reference: '',
      }))
    }
  }, [deliveryType])

  const setField = useCallback(
    <K extends keyof CustomerData>(field: K, value: CustomerData[K]) =>
      setCustomer(prev => ({ ...prev, [field]: value })),
    [],
  )
  const handleCepChange   = useCallback((raw: string) => setField('cep',   maskCep(raw)),   [setField])
  const handlePhoneChange = useCallback((raw: string) => setField('phone', maskPhone(raw)), [setField])

  const canRedeem =
    loyaltyConfig?.active === true &&
    points >= (loyaltyConfig?.pts_threshold ?? 10) &&
    isPhoneValid(customer.phone)

  const discount   = useDiscount && canRedeem ? (loyaltyConfig?.reward_brl ?? 5) : 0
  const finalPrice = Math.max(0, totalPrice - discount)

  const handleSubmit = useCallback(async () => {
    if (!store) return
    const { name, phone, street, number, city } = customer

    if (!name.trim())         { showToast('Informe seu nome!');                      return }
    if (!phone.trim())        { showToast('Informe seu telefone!');                  return }
    if (!isPhoneValid(phone)) { showToast('Telefone inválido — mínimo 10 dígitos!'); return }

    // Endereço só obrigatório para delivery
    if (deliveryType === 'delivery') {
      if (!street.trim() || !city.trim()) { showToast('Busque o CEP ou preencha o endereço!'); return }
      if (!number.trim())                 { showToast('Informe o número do imóvel!');           return }
    }

    setSending(true)

    if (useDiscount && canRedeem) {
      setRedeeming(true)
      const { ok, error: redeemErr } = await redeemPoints(phone)
      setRedeeming(false)
      if (!ok) {
        showToast(redeemErr ?? 'Erro ao resgatar pontos. Tente novamente.')
        setSending(false)
        return
      }
      await refreshPoints(phone)
    }

    const addressParts = deliveryType === 'delivery'
      ? [street, `nº ${number}`, customer.complement, customer.neighborhood, city].filter(Boolean).join(', ')
      : 'Retirada no local'

    const { error: saveErr } = await apiSaveOrder({
      storeId:       store.id,
      storeName:     store.name,
      customerName:  name.trim(),
      customerPhone: phone.replace(/\D/g, ''),
      address:       addressParts,
      items:         items.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })),
      total:      totalPrice,
      payment:    customer.payment,
      discount,
      finalTotal: finalPrice,
    })

    if (saveErr) {
      console.error('[apiSaveOrder]', saveErr)
      showToast('Erro ao registrar pedido. Verifique sua conexão e tente novamente.')
      setSending(false)
      return
    }

    // Salva último pedido para "Pedir Novamente"
    saveLastOrder({
      storeId:   store.id,
      storeName: store.name,
      items:     items.map(i => ({ name: i.name, qty: i.qty })),
      total:     finalPrice,
    })

    const message = buildOrderMessage(store, items, customer, discount, deliveryType)
    const opened  = openWhatsApp(store.phone, message)
    if (!opened) {
      showToast('Número do comércio inválido — entre em contato diretamente.')
      setSending(false)
      return
    }

    creditPoint(phone, store.id)
    setTimeout(() => { setSending(false); setShowConfirm(true) }, 800)
  }, [store, items, customer, deliveryType, showToast, useDiscount, canRedeem, discount, finalPrice, refreshPoints, totalPrice])

  const cepFeedbackMsg: Record<typeof cepStatus, string> = {
    idle: '', loading: '🔍 Buscando endereço...', success: '✓ Endereço encontrado',
    not_found: '✕ CEP não encontrado', error: '✕ Erro ao buscar — verifique sua conexão',
  }
  const cepFeedbackColor: Record<typeof cepStatus, string> = {
    idle: '', loading: 'var(--md-on-surface-variant)', success: '#1B6B3A',
    not_found: 'var(--md-error)', error: 'var(--md-error)',
  }
  const cepBorderColor =
    cepStatus === 'not_found' || cepStatus === 'error' ? 'var(--md-error)'
    : cepStatus === 'success' ? '#1B6B3A'
    : undefined

  return (
    <div className="space-y-4 animate-enter">

      {showConfirm && (
        <ConfirmModal
          onConfirm={() => { setShowConfirm(false); onSuccess() }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* ── Dados pessoais ── */}
      <section style={sectionStyle} aria-label="Seus dados">
        <p style={sectionLabelStyle}>👤 Seus dados</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="customer-name" className="form-label">Nome completo *</label>
            <input id="customer-name" type="text" value={customer.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Seu nome" autoComplete="name" className="form-input" />
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-phone" className="form-label">WhatsApp / Telefone *</label>
            <input id="customer-phone" type="tel" inputMode="numeric"
              value={customer.phone} onChange={e => handlePhoneChange(e.target.value)}
              placeholder="(19) 99999-9999" autoComplete="tel" maxLength={15}
              className="form-input"
              style={customer.phone && !isPhoneValid(customer.phone) ? { borderColor: 'var(--md-error)' } : undefined} />
            {customer.phone && !isPhoneValid(customer.phone) && (
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--md-error)' }}>
                Número incompleto — informe o DDD + número
              </p>
            )}
            {loyaltyConfig?.active && isPhoneValid(customer.phone) && (
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--md-primary)' }}>
                ⭐ Você tem {points} ponto{points !== 1 ? 's' : ''} de fidelidade
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Banner de resgate ── */}
      {canRedeem && (
        <section className="animate-enter" aria-label="Resgate de pontos">
          <button onClick={() => setUseDiscount(prev => !prev)}
            className="w-full flex items-center gap-4 p-4 transition-all"
            style={{
              borderRadius: 'var(--shape-xl)',
              border:       `2px ${useDiscount ? 'solid' : 'dashed'} ${useDiscount ? 'var(--md-primary)' : 'color-mix(in srgb, var(--md-primary) 50%, transparent)'}`,
              background:   useDiscount ? 'var(--md-primary-container)' : 'var(--md-surface-lowest)',
            }}>
            <span className="text-2xl shrink-0">🎁</span>
            <div className="flex-1 text-left">
              <p className="font-black text-sm" style={{ color: 'var(--md-on-surface)' }}>
                Usar {loyaltyConfig?.pts_threshold} pontos → -{formatBRL(loyaltyConfig?.reward_brl ?? 5)} de desconto
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>
                Você tem {points} ponto{points !== 1 ? 's' : ''}
                {useDiscount ? ' · Desconto será aplicado!' : ' · Toque para usar'}
              </p>
            </div>
            <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
              style={{ borderColor: useDiscount ? 'var(--md-primary)' : 'var(--md-outline)', background: useDiscount ? 'var(--md-primary)' : 'transparent' }}
              aria-hidden="true">
              {useDiscount && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
            </span>
          </button>
        </section>
      )}

      {/* ── Tipo de entrega ── */}
      <section style={sectionStyle} aria-label="Tipo de entrega">
        <p style={sectionLabelStyle}>🚚 Como vai receber?</p>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de entrega">
          {([
            { value: 'delivery' as DeliveryType, icon: '🛵', label: 'Entrega',          sub: 'Receber em casa' },
            { value: 'pickup'   as DeliveryType, icon: '🏪', label: 'Retirada',         sub: 'Buscar no local' },
          ] as const).map(opt => {
            const isSelected = deliveryType === opt.value
            return (
              <button key={opt.value} role="radio" aria-checked={isSelected}
                onClick={() => setDeliveryType(opt.value)}
                className="flex flex-col items-center gap-1.5 py-4 px-2 transition-all active:scale-95"
                style={{
                  borderRadius: 'var(--shape-lg)',
                  border:       `2px solid ${isSelected ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                  background:   isSelected ? 'var(--md-primary-container)' : 'var(--md-surface-lowest)',
                }}>
                <span className="text-2xl">{opt.icon}</span>
                <p className="text-sm font-bold" style={{ color: 'var(--md-on-surface)' }}>{opt.label}</p>
                <p className="text-[11px]" style={{ color: 'var(--md-on-surface-variant)' }}>{opt.sub}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Endereço (somente para delivery) ── */}
      {deliveryType === 'delivery' && (
        <section style={sectionStyle} aria-label="Endereço de entrega" className="animate-enter">
          <p style={sectionLabelStyle}>📍 Endereço de entrega</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="customer-cep" className="form-label">CEP *</label>
              <div className="relative">
                <input id="customer-cep" type="text" inputMode="numeric"
                  value={customer.cep} onChange={e => handleCepChange(e.target.value)}
                  placeholder="00000-000" autoComplete="postal-code" maxLength={9}
                  className="form-input pr-10"
                  style={cepBorderColor ? { borderColor: cepBorderColor } : undefined} />
                {cepStatus === 'loading' && (
                  <div aria-hidden="true"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--md-primary)', borderTopColor: 'transparent' }} />
                )}
              </div>
              {cepFeedbackMsg[cepStatus] && (
                <p className="text-xs font-semibold mt-1" style={{ color: cepFeedbackColor[cepStatus] }}>
                  {cepFeedbackMsg[cepStatus]}
                </p>
              )}
              <p className="text-[11px]" style={{ color: 'var(--md-on-surface-variant)' }}>
                Digite o CEP e o endereço será preenchido automaticamente.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="customer-street" className="form-label">Rua / Logradouro *</label>
              <input id="customer-street" type="text" value={customer.street}
                onChange={e => setField('street', e.target.value)}
                placeholder="Preenchido automaticamente pelo CEP"
                autoComplete="address-line1" className="form-input" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="customer-number" className="form-label">Número *</label>
                <input id="customer-number" type="text" inputMode="numeric"
                  value={customer.number} onChange={e => setField('number', e.target.value)}
                  placeholder="123" className="form-input" />
              </div>
              <div className="space-y-1">
                <label htmlFor="customer-complement" className="form-label">Complemento</label>
                <input id="customer-complement" type="text"
                  value={customer.complement} onChange={e => setField('complement', e.target.value)}
                  placeholder="Apto, casa..." autoComplete="address-line2" className="form-input" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="customer-neighborhood" className="form-label">Bairro</label>
              <input id="customer-neighborhood" type="text"
                value={customer.neighborhood} onChange={e => setField('neighborhood', e.target.value)}
                placeholder="Preenchido automaticamente" className="form-input" />
            </div>

            {customer.city && (
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ borderRadius: 'var(--shape-md)', border: '1px solid var(--md-outline-variant)', background: 'var(--md-surface-low)' }}>
                <span aria-hidden="true">🏙️</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--md-on-surface)' }}>
                  {customer.city}
                </span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="customer-reference" className="form-label">Referência (opcional)</label>
              <input id="customer-reference" type="text"
                value={customer.reference} onChange={e => setField('reference', e.target.value)}
                placeholder="Perto da praça, casa amarela..." className="form-input" />
            </div>
          </div>
        </section>
      )}

      {/* ── Info para retirada ── */}
      {deliveryType === 'pickup' && (
        <div className="flex items-center gap-3 p-4 animate-enter"
          style={{ borderRadius: 'var(--shape-xl)', border: '1px solid var(--md-outline-variant)', background: 'var(--md-surface-lowest)' }}>
          <span className="text-2xl shrink-0">🏪</span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--md-on-surface)' }}>
              Retirada no {store?.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>
              O comércio entrará em contato pelo WhatsApp para combinar o horário.
            </p>
          </div>
        </div>
      )}

      {/* ── Pagamento ── */}
      <section style={sectionStyle} aria-label="Forma de pagamento">
        <p style={sectionLabelStyle}>💳 Forma de pagamento</p>
        <div className="space-y-2" role="radiogroup" aria-label="Selecionar forma de pagamento">
          {PAYMENT_OPTIONS.map(({ value, icon }) => {
            const isSelected = customer.payment === value
            return (
              <button key={value} role="radio" aria-checked={isSelected}
                onClick={() => setField('payment', value)}
                className="ripple w-full flex items-center gap-3 p-3.5 transition-all"
                style={{
                  borderRadius: 'var(--shape-lg)',
                  border:       `1.5px solid ${isSelected ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                  background:   isSelected ? 'var(--md-primary-container)' : 'var(--md-surface-lowest)',
                }}>
                <span className="text-xl" aria-hidden="true">{icon}</span>
                <span className="flex-1 text-left text-sm font-bold" style={{ color: 'var(--md-on-surface)' }}>
                  {PAYMENT_LABELS[value]}
                </span>
                <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: isSelected ? 'var(--md-primary)' : 'var(--md-outline)', background: isSelected ? 'var(--md-primary)' : 'transparent' }}
                  aria-hidden="true">
                  {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Resumo ── */}
      <section style={sectionStyle} aria-label="Resumo do pedido">
        <p style={sectionLabelStyle}>🧾 Resumo</p>
        {items.map(item => (
          <div key={item.productId} className="flex justify-between text-sm mb-1.5">
            <span style={{ color: 'var(--md-on-surface-variant)' }}>{item.qty}x {item.name}</span>
            <span className="font-semibold" style={{ color: 'var(--md-on-surface)' }}>
              {formatBRL(item.price * item.qty)}
            </span>
          </div>
        ))}
        {discount > 0 && (
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold" style={{ color: '#1B6B3A' }}>🎁 Desconto fidelidade</span>
            <span className="font-semibold" style={{ color: '#1B6B3A' }}>-{formatBRL(discount)}</span>
          </div>
        )}
        <div className="h-px my-2" style={{ background: 'var(--md-outline-variant)' }} />
        <div className="flex justify-between items-baseline">
          <span className="font-bold" style={{ color: 'var(--md-on-surface)' }}>Total</span>
          <div className="text-right">
            {discount > 0 && (
              <p className="text-sm line-through" style={{ color: 'var(--md-on-surface-variant)' }}>
                {formatBRL(totalPrice)}
              </p>
            )}
            <span className="text-xl font-black" style={{ color: 'var(--md-primary)' }}>
              {formatBRL(finalPrice)}
            </span>
          </div>
        </div>
      </section>

      <button onClick={handleSubmit} disabled={sending || redeeming}
        className="btn-primary w-full py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed">
        {redeeming ? '⏳ Resgatando pontos...' : sending ? '⏳ Abrindo WhatsApp...' : '📲 Enviar Pedido no WhatsApp'}
      </button>
    </div>
  )
}
