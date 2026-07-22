// src/pages/Admin.tsx

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Store, Product, StoreStatus, Order, OrderStatus } from '../types/types'
import type { AuthUser } from '../lib/auth'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { formatBRL } from '../lib/format'
import {
  apiListCoupons, apiCreateCoupon, apiToggleCoupon, apiDeleteCoupon,
  type Coupon, type DiscountType,
} from '../lib/couponApi'
import { apiGetRecentOrders, apiUpdateOrderStatus, apiDeleteOrder, apiSaveOrder } from '../lib/adminApi'
import { playNewOrderSound } from '../lib/sound'
import ImageUpload from '../components/ImageUpload'
import OrderStatusPanel from '../components/OrderStatusPanel'

const CATEGORY_OPTIONS = [
  '🍕 Pizzaria','🍔 Lanches','🍦 Açaí','🍗 Frango','🌮 Mexicano',
  '🥗 Saudável','🍰 Doces','🛒 Mercadinho','🥤 Bebidas','🍱 Japonês',
]

export interface AdminProps {
  authUser:              AuthUser | null
  stores:                Store[]
  orders:                Order[]
  onToggleStore:         (storeId: number, status: StoreStatus) => Promise<void>
  onAddStore:            (store: Omit<Store, 'id'>) => Promise<void>
  onUpdateStore:         (storeId: number, updates: Partial<Omit<Store, 'id' | 'products'>>) => Promise<void>
  onAddProduct:          (storeId: number, product: Omit<Product, 'id'>) => Promise<void>
  onUpdateProduct:       (storeId: number, productId: number, updates: Partial<Omit<Product, 'id'>>) => Promise<void>
  onToggleProduct:       (storeId: number, productId: number, active: boolean) => Promise<void>
  onDeleteProduct:       (storeId: number, productId: number) => Promise<void>
  onDeleteStore:         (storeId: number) => Promise<void>
  onUpdateOrderStatus:   (orderId: string, status: OrderStatus) => void
  onLogout:              () => void
}

interface StoreForm {
  name: string; category: string; description: string
  phone: string; color: string; rating: string; deliveryTime: string; coverImage: string
}

interface PizzaSizeForm  { id: string; label: string; info: string; price: string }
interface PizzaCrustForm { id: string; label: string; extra: string }

interface ProductForm {
  storeId: number; name: string; description: string
  price: string; section: string; image: string; ofertaDia: boolean; ofertaPreco: string
  isPizza: boolean; allowHalf: boolean
  sizes: PizzaSizeForm[]; crusts: PizzaCrustForm[]
}

const DEFAULT_CRUSTS: PizzaCrustForm[] = [
  { id: 'sem_borda',       label: 'Sem borda',                 extra: '0'  },
  { id: 'trad_catupiry',   label: 'Borda Tradicional Catupiry', extra: '10' },
  { id: 'trad_cheddar',    label: 'Borda Tradicional Cheddar',  extra: '10' },
  { id: 'vulcao_catupiry', label: 'Borda Vulcão Catupiry',      extra: '20' },
  { id: 'vulcao_cheddar',  label: 'Borda Vulcão Cheddar',       extra: '20' },
]

// Gera id único a partir do rótulo — se dois tamanhos/bordas tiverem nomes
// iguais (ou que gerem o mesmo slug), o app não consegue distinguir qual foi
// selecionado e passa a marcar os dois ao mesmo tempo na tela do cliente.
function assignUniqueIds<T extends { id: string; label: string }>(list: T[]): T[] {
  const seen = new Map<string, number>()
  return list.map(item => {
    const base  = item.id || item.label.trim().toLowerCase().replace(/\s+/g, '_')
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return { ...item, id: count === 0 ? base : `${base}_${count}` }
  })
}

const emptyStoreForm = (): StoreForm => ({
  name: '', category: CATEGORY_OPTIONS[0], description: '',
  phone: '', color: '#E85D26', rating: '', deliveryTime: '', coverImage: '',
})

const emptyProductForm = (storeId = 0): ProductForm => ({
  storeId, name: '', description: '', price: '', section: '', image: '', ofertaDia: false, ofertaPreco: '',
  isPizza: false, allowHalf: true, sizes: [], crusts: [],
})

// ── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, confirmLabel = 'Remover', onConfirm, onCancel }: {
  message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void
}) {
  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm p-6 space-y-4"
        style={{ background: 'var(--md-surface-lowest)', borderRadius: 'var(--shape-xl)', boxShadow: 'var(--md-elev-3)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--md-on-surface)' }}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-bold rounded-full"
            style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-bold rounded-full"
            style={{ background: 'var(--md-error)', color: 'var(--md-on-error)', border: 'none' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Edit Store Modal ─────────────────────────────────────────────────────────
function EditStoreModal({ store, onSave, onCancel }: {
  store: Store
  onSave: (updates: Partial<Omit<Store, 'id' | 'products'>>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<StoreForm>({
    name: store.name, category: store.category, description: store.description,
    phone: store.phone.replace(/^55/, ''), color: store.color,
    rating: store.rating != null ? String(store.rating) : '',
    deliveryTime: store.deliveryTime ?? '', coverImage: store.coverImage ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.phone.trim()) return
    setSaving(true)
    await onSave({
      name: form.name.trim(), category: form.category, description: form.description.trim(),
      phone: '55' + form.phone.replace(/\D/g, ''), color: form.color || '#E85D26',
      rating: form.rating ? parseFloat(form.rating) : undefined,
      deliveryTime: form.deliveryTime.trim(),
      coverImage: form.coverImage.trim() || undefined,
    })
    setSaving(false)
    onCancel()
  }, [form, onSave, onCancel])

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg p-6 space-y-3 overflow-y-auto"
        style={{ background: 'var(--md-surface-lowest)', borderRadius: 'var(--shape-xl) var(--shape-xl) 0 0', boxShadow: 'var(--md-elev-3)', maxHeight: '90vh' }}>
        <p className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>✏️ Editar comércio</p>
        <input className="form-input w-full" placeholder="Nome *" value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        <select className="form-input w-full" value={form.category}
          onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
          {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
        </select>
        <input className="form-input w-full" placeholder="Descrição" value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        <input className="form-input w-full" placeholder="WhatsApp (com DDD) *" type="tel"
          value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2">
          <input className="form-input" placeholder="Avaliação (ex: 4.8)" type="number" step="0.1" min="0" max="5"
            value={form.rating} onChange={e => setForm(p => ({ ...p, rating: e.target.value }))} />
          <input className="form-input" placeholder="Tempo (ex: 30–45 min)"
            value={form.deliveryTime} onChange={e => setForm(p => ({ ...p, deliveryTime: e.target.value }))} />
        </div>
        <ImageUpload label="Foto de capa" value={form.coverImage}
          onChange={url => setForm(p => ({ ...p, coverImage: url }))} folder="stores" id={store.id} />
        <div className="flex gap-2 items-center">
          <label className="form-label shrink-0">Cor:</label>
          <input className="w-10 h-10 rounded-lg border cursor-pointer"
            style={{ borderColor: 'var(--md-outline-variant)' }} type="color"
            value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
          <span className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>{form.color}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-bold rounded-full"
            style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Edit Product Modal ───────────────────────────────────────────────────────
function EditProductModal({ product, stores, onSave, onCancel }: {
  product: Product & { storeId: number }; stores: Store[]
  onSave: (updates: Partial<Omit<Product, 'id'>>) => Promise<void>; onCancel: () => void
}) {
  const isPizzaInit = product.productType === 'pizza' || (Array.isArray(product.sizes) && product.sizes.length > 0)
  const [form, setForm] = useState({
    name: product.name, description: product.description,
    price: String(product.price), section: product.section, image: product.image ?? '',
    ofertaDia: product.ofertaDia ?? false,
    ofertaPreco: product.ofertaPreco != null ? String(product.ofertaPreco) : '',
    isPizza: isPizzaInit,
    allowHalf: product.allowHalf !== false,
    sizes:  ((product.sizes  ?? []).map(s => ({ id: s.id, label: s.label, info: s.info ?? '', price: String(s.price) }))) as PizzaSizeForm[],
    crusts: ((product.crusts ?? []).map(c => ({ id: c.id, label: c.label, extra: String(c.extra) }))) as PizzaCrustForm[],
  })
  const [saving, setSaving] = useState(false)

  const enablePizza = (checked: boolean) =>
    setForm(p => {
      if (checked && p.sizes.length === 0)
        return { ...p, isPizza: true, sizes: [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: p.price }], crusts: DEFAULT_CRUSTS }
      return { ...p, isPizza: checked }
    })

  const addSize    = () => setForm(p => ({ ...p, sizes: [...p.sizes, { id: '', label: '', info: '', price: '' }] }))
  const removeSize = (i: number) => setForm(p => ({ ...p, sizes: p.sizes.filter((_, idx) => idx !== i) }))
  const updateSize = (i: number, field: keyof PizzaSizeForm, val: string) =>
    setForm(p => ({ ...p, sizes: p.sizes.map((s, idx) => idx === i ? { ...s, [field]: val } : s) }))

  const addCrust    = () => setForm(p => ({ ...p, crusts: [...p.crusts, { id: '', label: '', extra: '0' }] }))
  const removeCrust = (i: number) => setForm(p => ({ ...p, crusts: p.crusts.filter((_, idx) => idx !== i) }))
  const updateCrust = (i: number, field: keyof PizzaCrustForm, val: string) =>
    setForm(p => ({ ...p, crusts: p.crusts.map((c, idx) => idx === i ? { ...c, [field]: val } : c) }))

  const handleSave = useCallback(async () => {
    const price = parseFloat(form.price)
    if (!form.name.trim() || isNaN(price) || price <= 0) return
    const ofertaPreco = form.ofertaPreco.trim() ? parseFloat(form.ofertaPreco) : undefined

    const pizzaFields: Partial<Omit<Product, 'id'>> = form.isPizza ? {
      productType: 'pizza', allowHalf: form.allowHalf,
      sizes:  assignUniqueIds(form.sizes.filter(s => s.label.trim() && s.price.trim()))
                .map(s => ({ id: s.id, label: s.label.trim(), info: s.info.trim(), price: parseFloat(s.price) })),
      crusts: assignUniqueIds(form.crusts.filter(c => c.label.trim()))
                .map(c => ({ id: c.id, label: c.label.trim(), extra: parseFloat(c.extra) || 0 })),
    } : { productType: 'item', allowHalf: false, sizes: undefined, crusts: undefined }

    setSaving(true)
    await onSave({
      name: form.name.trim(), description: form.description.trim(),
      price, section: form.section.trim() || 'Produtos',
      image: form.image.trim() || undefined,
      ofertaDia: form.ofertaDia,
      ofertaPreco: ofertaPreco != null && !isNaN(ofertaPreco) && ofertaPreco > 0 ? ofertaPreco : undefined,
      ...pizzaFields,
    })
    setSaving(false)
    onCancel()
  }, [form, onSave, onCancel])

  const storeName = stores.find(s => s.id === product.storeId)?.name ?? ''

  const pizzaBg: React.CSSProperties = { background: 'var(--md-primary-container)', borderRadius: 'var(--shape-xl)', padding: '16px' }

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg p-6 space-y-3 overflow-y-auto"
        style={{ background: 'var(--md-surface-lowest)', borderRadius: 'var(--shape-xl) var(--shape-xl) 0 0', boxShadow: 'var(--md-elev-3)', maxHeight: '92vh' }}>
        <p className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>
          ✏️ Editar produto · {storeName}
        </p>
        <input className="form-input w-full" placeholder="Nome do produto *" value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        <input className="form-input w-full" placeholder="Descrição" value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2">
          <input className="form-input" placeholder="Preço *" type="number" step="0.01" min="0"
            value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
          <input className="form-input" placeholder="Seção (ex: Pizzas)" value={form.section}
            onChange={e => setForm(p => ({ ...p, section: e.target.value }))} />
        </div>
        {/* Oferta */}
        <div className="flex items-center gap-3 py-1">
          <input type="checkbox" id="edit-oferta-dia" checked={form.ofertaDia}
            onChange={e => setForm(p => ({ ...p, ofertaDia: e.target.checked }))} />
          <label htmlFor="edit-oferta-dia" className="text-sm font-semibold" style={{ color: 'var(--md-on-surface)' }}>
            🔥 Oferta do dia
          </label>
        </div>
        {form.ofertaDia && (
          <input className="form-input w-full" placeholder="Preço em oferta (ex: 9.90)" type="number" step="0.01" min="0"
            value={form.ofertaPreco} onChange={e => setForm(p => ({ ...p, ofertaPreco: e.target.value }))} />
        )}
        {/* Toggle pizza */}
        <div className="flex items-center gap-3 py-1">
          <input type="checkbox" id="edit-is-pizza" checked={form.isPizza}
            onChange={e => enablePizza(e.target.checked)} />
          <label htmlFor="edit-is-pizza" className="text-sm font-semibold" style={{ color: 'var(--md-on-surface)' }}>
            🍕 É uma pizza (modal de borda e sabores)
          </label>
        </div>
        {/* Configuração pizza */}
        {form.isPizza && (
          <div className="space-y-4" style={pizzaBg}>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="edit-allow-half" checked={form.allowHalf}
                onChange={e => setForm(p => ({ ...p, allowHalf: e.target.checked }))} />
              <label htmlFor="edit-allow-half" className="text-sm font-semibold" style={{ color: 'var(--md-on-primary-container)' }}>
                🍕½ Permite metade/metade (dois sabores)
              </label>
            </div>
            {/* Tamanhos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-primary-container)' }}>Tamanhos</p>
                <button onClick={addSize} className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)', border: 'none' }}>
                  + Tamanho
                </button>
              </div>
              {form.sizes.map((size, i) => (
                <div key={i} className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 5rem auto' }}>
                  <input className="form-input" placeholder="Nome (ex: Grande)" value={size.label}
                    onChange={e => updateSize(i, 'label', e.target.value)} />
                  <input className="form-input" placeholder="Preço" type="number" step="0.01" value={size.price}
                    onChange={e => updateSize(i, 'price', e.target.value)} />
                  <button onClick={() => removeSize(i)} className="px-2 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', border: 'none' }}>✕</button>
                </div>
              ))}
            </div>
            {/* Bordas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-primary-container)' }}>Bordas</p>
                <button onClick={addCrust} className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)', border: 'none' }}>
                  + Borda
                </button>
              </div>
              {form.crusts.map((crust, i) => (
                <div key={i} className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 5rem auto' }}>
                  <input className="form-input" placeholder="Nome (ex: Sem borda)" value={crust.label}
                    onChange={e => updateCrust(i, 'label', e.target.value)} />
                  <input className="form-input" placeholder="+R$" type="number" step="0.50" min="0" value={crust.extra}
                    onChange={e => updateCrust(i, 'extra', e.target.value)} />
                  <button onClick={() => removeCrust(i)} className="px-2 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', border: 'none' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <ImageUpload label="Foto do produto" value={form.image}
          onChange={url => setForm(p => ({ ...p, image: url }))} folder="products" id={product.id} />
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-bold rounded-full"
            style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Login ────────────────────────────────────────────────────────────────────
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [pwd,   setPwd]   = useState('')
  const [loading, setLoading] = useState(false)
  const [err,   setErr]   = useState('')

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !pwd) return
    setLoading(true); setErr('')
    if (!isSupabaseConfigured()) { setLoading(false); onLogin(); return }
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password: pwd })
    setLoading(false)
    if (error) { setErr('Email ou senha incorretos.'); setPwd('') } else { onLogin() }
  }, [email, pwd, onLogin])

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 px-8 text-center animate-enter">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: 'linear-gradient(135deg, var(--md-primary), #7A2F00)' }}>🔐</div>
      <div>
        <p className="font-bold text-xl" style={{ color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display, sans-serif' }}>Área Admin</p>
        <p className="text-sm mt-1" style={{ color: 'var(--md-on-surface-variant)' }}>
          {isSupabaseConfigured() ? 'Entre com seu email e senha' : 'Modo dev — Supabase não configurado'}
        </p>
      </div>
      <div className="w-full space-y-3">
        <input type="email" aria-label="Email" placeholder="admin@exemplo.com"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="form-input w-full" autoComplete="email" />
        <input type="password" aria-label="Senha" placeholder="Senha"
          value={pwd} onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="form-input w-full"
          style={err ? { borderColor: 'var(--md-error)' } : undefined}
          autoComplete="current-password" />
        {err && <p className="text-sm font-semibold" style={{ color: 'var(--md-error)' }}>{err}</p>}
        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

// ── Coupon Section ───────────────────────────────────────────────────────────
function CouponSection() {
  const [coupons,  setCoupons]  = useState<Coupon[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [code,      setCode]      = useState('')
  const [type,      setType]      = useState<DiscountType>('fixed')
  const [value,     setValue]     = useState('')
  const [maxUses,   setMaxUses]   = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { coupons: data } = await apiListCoupons()
    setCoupons(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = useCallback(async () => {
    const v = parseFloat(value)
    if (!code.trim() || isNaN(v) || v <= 0) return
    setSaving(true)
    setFormError(null)
    const { error } = await apiCreateCoupon({
      code: code.trim(), discountType: type, discountValue: v,
      maxUses:   maxUses.trim() ? parseInt(maxUses, 10) : null,
      // "T23:59:59" sem "Z" é interpretado no fuso local do navegador —
      // sem isso, uma data pura ("2026-07-14") vira meia-noite UTC, que já
      // fica no passado durante boa parte do dia em fusos negativos (Brasil).
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    })
    setSaving(false)
    if (error) {
      setFormError(error.includes('duplicate') || error.includes('unique')
        ? 'Já existe um cupom com esse código.' : error)
      return
    }
    setCode(''); setValue(''); setMaxUses(''); setExpiresAt(''); setType('fixed')
    setShowForm(false)
    load()
  }, [code, type, value, maxUses, expiresAt, load])

  // Atualização otimista com reversão: se a chamada falhar (ex: sessão
  // expirada, RLS), recarrega do banco para não deixar a tela mentindo
  // sobre o estado real do cupom.
  const handleToggle = useCallback(async (c: Coupon) => {
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x))
    const { error } = await apiToggleCoupon(c.id, !c.active)
    if (error) load()
  }, [load])

  const handleDelete = useCallback(async (id: number) => {
    setCoupons(prev => prev.filter(x => x.id !== id))
    const { error } = await apiDeleteCoupon(id)
    if (error) load()
  }, [load])

  if (loading) return (
    <section className="p-5" style={{ borderRadius: 'var(--shape-xl)', border: '1px solid var(--md-outline-variant)', background: 'var(--md-surface-lowest)' }}>
      <p className="text-sm text-center py-4" style={{ color: 'var(--md-on-surface-variant)' }}>Carregando...</p>
    </section>
  )

  return (
    <section className="p-5 space-y-4" aria-label="Cupons de desconto"
      style={{ borderRadius: 'var(--shape-xl)', border: '1px solid var(--md-outline-variant)', background: 'var(--md-surface-lowest)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>🎟️ Cupons</h2>
        <button onClick={() => setShowForm(v => !v)} className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', border: 'none' }}>
          {showForm ? 'Fechar' : '+ Novo'}
        </button>
      </div>

      {showForm && (
        <div className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--md-primary-container)' }}>
          <input className="form-input w-full" placeholder="Código (ex: JABORANDI10)" value={code}
            onChange={e => setCode(e.target.value.toUpperCase())} />
          <div className="grid grid-cols-2 gap-2">
            <select className="form-input" value={type} onChange={e => setType(e.target.value as DiscountType)}>
              <option value="fixed">R$ fixo</option>
              <option value="percent">% percentual</option>
            </select>
            <input className="form-input" placeholder={type === 'percent' ? 'Ex: 10' : 'Ex: 5.00'}
              type="number" step="0.01" min="0" value={value} onChange={e => setValue(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="form-input" placeholder="Limite de usos (opcional)" type="number" min="1"
              value={maxUses} onChange={e => setMaxUses(e.target.value)} />
            <input className="form-input" placeholder="Validade (opcional)" type="date"
              value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
          {formError && (
            <p className="text-xs font-semibold" style={{ color: 'var(--md-error)' }}>{formError}</p>
          )}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1 py-2 text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : 'Criar cupom'}
            </button>
            <button onClick={() => { setShowForm(false); setFormError(null) }} className="flex-1 py-2 text-sm font-bold rounded-full"
              style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {coupons.length === 0 ? (
          <p className="text-center text-sm py-4" style={{ color: 'var(--md-on-surface-variant)' }}>Nenhum cupom cadastrado.</p>
        ) : coupons.map(c => (
          <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0"
            style={{ borderColor: 'var(--md-outline-variant)' }}>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: 'var(--md-on-surface)' }}>{c.code}</p>
              <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                {c.discount_type === 'percent' ? `${c.discount_value}%` : formatBRL(c.discount_value)}
                {' · '}{c.used_count}{c.max_uses != null ? `/${c.max_uses}` : ''} usos
                {c.expires_at ? ` · até ${new Date(c.expires_at).toLocaleDateString('pt-BR')}` : ''}
              </p>
            </div>
            <button role="switch" aria-checked={c.active} onClick={() => handleToggle(c)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0"
              style={{ background: c.active ? '#dcfce7' : '#FEE2E2', color: c.active ? '#16a34a' : '#dc2626', border: '1px solid var(--md-outline-variant)' }}>
              {c.active ? '✅' : '⏸️'}
            </button>
            <button onClick={() => handleDelete(c.id)} className="text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0"
              style={{ background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', border: 'none' }}>
              Remover
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Orders Section ────────────────────────────────────────────────────────────
function OrdersSection({
  stores, orders, onUpdateOrderStatus, defaultStoreId,
}: {
  stores: Store[]
  orders: Order[]
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void
  defaultStoreId?: number
}) {
  const [loading,       setLoading]       = useState(false)
  const [dbOrders,      setDbOrders]      = useState<Order[]>([])
  const [loaded,        setLoaded]        = useState(false)
  const [filterStoreId, setFilterStoreId] = useState<number | undefined>(defaultStoreId)
  const load = useCallback(async () => {
    setLoading(true)
    const { orders: data } = await apiGetRecentOrders(filterStoreId, 50)
    setDbOrders(data)
    setLoaded(true)
    setLoading(false)
  }, [filterStoreId])

  useEffect(() => { load() }, [load])

  // Realtime: escuta novos pedidos e toca som
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const channel = getSupabase()
      .channel('admin-orders-rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          if (filterStoreId && row.store_id !== filterStoreId) return
          const newOrder: Order = {
            id:               String(row.id),
            storeOrderNumber: row.store_order_number as number,
            store_id:      row.store_id      as number,
            storeName:     (row.store_name   as string) ?? '',
            customerName:  row.customer_name  as string,
            customerPhone: row.customer_phone as string,
            address:       row.address        as string,
            items:         row.items          as Order['items'],
            total:         row.total          as number,
            payment:       row.payment        as string,
            discount:      row.discount       as number,
            final_total:   row.final_total    as number,
            status:        (row.status        as string ?? 'recebido') as Order['status'],
            created_at:    row.created_at     as string,
          }
          setDbOrders(prev => [newOrder, ...prev])
          playNewOrderSound()
        }
      )
      .subscribe()
    return () => { getSupabase().removeChannel(channel) }
  }, [filterStoreId])

  const merged = loaded
    ? dbOrders.map(db => {
        const inMemory = orders.find(o => o.id === db.id)
        return inMemory ?? db
      })
    : orders

  const handleUpdateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    onUpdateOrderStatus(orderId, status)
    setDbOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    await apiUpdateOrderStatus(orderId, status)
  }, [onUpdateOrderStatus])

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    await apiDeleteOrder(orderId)
    setDbOrders(prev => prev.filter(o => o.id !== orderId))
  }, [])

  // Vazio quando "todas as lojas" está selecionado — cada pedido já carrega
  // seu próprio storeName correto, não dá pra assumir stores[0] como padrão.
  const currentStoreName = filterStoreId
    ? (stores.find(s => s.id === filterStoreId)?.name ?? '')
    : ''

  return (
    <section aria-label="Pedidos recentes" style={{
      borderRadius: 'var(--shape-xl)', border: '1px solid var(--md-outline-variant)',
      background: 'var(--md-surface-lowest)', padding: '20px',
    }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>
          🛵 Pedidos recentes
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', border: 'none' }}>
            ↺ Atualizar
          </button>
        </div>
      </div>
      {stores.length > 1 && (
        <select className="form-input w-full mb-3" value={filterStoreId ?? ''}
          onChange={e => setFilterStoreId(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Todos os comércios</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      {loading ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--md-on-surface-variant)' }}>Carregando...</p>
      ) : (
        <OrderStatusPanel
          orders={merged}
          storeName={currentStoreName}
          onUpdateStatus={handleUpdateStatus}
          onDeleteOrder={handleDeleteOrder}
        />
      )}
    </section>
  )
}

// ── Admin principal ──────────────────────────────────────────────────────────
export default function Admin({
  authUser, stores, orders, onToggleStore, onAddStore, onUpdateStore,
  onAddProduct, onUpdateProduct, onToggleProduct, onDeleteProduct, onDeleteStore,
  onUpdateOrderStatus, onLogout,
}: AdminProps) {
  const isSuperAdmin = authUser?.role === 'superadmin'

  const [storeForm,   setStoreForm]   = useState<StoreForm>(emptyStoreForm())
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm(stores[0]?.id ?? 0))
  const [showStoreForm,   setShowStoreForm]   = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingStore,   setEditingStore]   = useState<Store | null>(null)
  const [editingProduct, setEditingProduct] = useState<(Product & { storeId: number }) | null>(null)
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<{ storeId: number; productId: number; name: string } | null>(null)
  const [confirmDeleteStore,   setConfirmDeleteStore]   = useState<{ storeId: number; name: string } | null>(null)

  const handleSaveStore = useCallback(() => {
    const { name, category, description, phone, color, rating, deliveryTime, coverImage } = storeForm
    if (!name.trim() || !phone.trim()) return
    onAddStore({
      name: name.trim(), category, description: description.trim(),
      phone: '55' + phone.replace(/\D/g, ''), color: color || '#E85D26', status: 'open',
      mode: 'delivery', products: [],
      rating: rating ? parseFloat(rating) : undefined,
      deliveryTime: deliveryTime.trim() || undefined, coverImage: coverImage.trim() || undefined,
    })
    setStoreForm(emptyStoreForm()); setShowStoreForm(false)
  }, [storeForm, onAddStore])

  const handleSaveProduct = useCallback(() => {
    const { storeId, name, description, price, section, image, ofertaDia, ofertaPreco, isPizza, allowHalf, sizes, crusts } = productForm
    const parsedPrice = parseFloat(price)
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice <= 0) return
    const parsedOfertaPreco = ofertaPreco.trim() ? parseFloat(ofertaPreco) : undefined

    const pizzaFields: Partial<Omit<Product, 'id'>> = isPizza ? {
      productType: 'pizza', allowHalf,
      sizes:  assignUniqueIds(sizes.filter(s => s.label.trim() && s.price.trim()))
                .map(s => ({ id: s.id, label: s.label.trim(), info: s.info.trim(), price: parseFloat(s.price) })),
      crusts: assignUniqueIds(crusts.filter(c => c.label.trim()))
                .map(c => ({ id: c.id, label: c.label.trim(), extra: parseFloat(c.extra) || 0 })),
    } : { productType: 'item' }

    onAddProduct(storeId, {
      name: name.trim(), description: description.trim(), price: parsedPrice,
      section: section.trim() || 'Produtos', image: image.trim() || undefined,
      ofertaDia, ofertaPreco: parsedOfertaPreco != null && !isNaN(parsedOfertaPreco) && parsedOfertaPreco > 0
        ? parsedOfertaPreco : undefined,
      ...pizzaFields,
    })
    setProductForm(prev => ({ ...prev, name: '', description: '', price: '', section: '', image: '', ofertaDia: false, ofertaPreco: '', isPizza: false, allowHalf: true, sizes: [], crusts: [] }))
    setShowProductForm(false)
  }, [productForm, onAddProduct])

  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured()) await getSupabase().auth.signOut()
    onLogout()
  }, [onLogout])

  // Enquanto não está autenticado, mostra o formulário de login
  if (!authUser) return <LoginForm onLogin={() => {}} />

  const totalProducts = stores.reduce((sum, s) => sum + s.products.length, 0)
  const openStores    = stores.filter(s => s.status === 'open').length

  // Para comerciante com 1 loja, pré-filtra os pedidos nessa loja
  const defaultOrderStoreId = !isSuperAdmin && stores.length === 1 ? stores[0].id : undefined

  const sectionStyle: React.CSSProperties = {
    borderRadius: 'var(--shape-xl)', border: '1px solid var(--md-outline-variant)',
    background: 'var(--md-surface-lowest)', padding: '20px',
  }
  const formBgStyle: React.CSSProperties = {
    background: 'var(--md-primary-container)', borderRadius: 'var(--shape-xl)', padding: '16px',
  }

  return (
    <div className="space-y-4 animate-enter">
      {editingStore && (
        <EditStoreModal store={editingStore}
          onSave={updates => onUpdateStore(editingStore.id, updates)}
          onCancel={() => setEditingStore(null)} />
      )}
      {editingProduct && (
        <EditProductModal product={editingProduct} stores={stores}
          onSave={updates => onUpdateProduct(editingProduct.storeId, editingProduct.id, updates)}
          onCancel={() => setEditingProduct(null)} />
      )}
      {confirmDeleteProduct && (
        <ConfirmDialog
          message={`Remover "${confirmDeleteProduct.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => { onDeleteProduct(confirmDeleteProduct.storeId, confirmDeleteProduct.productId); setConfirmDeleteProduct(null) }}
          onCancel={() => setConfirmDeleteProduct(null)} />
      )}
      {confirmDeleteStore && (
        <ConfirmDialog message={`Remover "${confirmDeleteStore.name}" e todos os seus produtos?`}
          confirmLabel="Remover comércio"
          onConfirm={() => { onDeleteStore(confirmDeleteStore.storeId); setConfirmDeleteStore(null) }}
          onCancel={() => setConfirmDeleteStore(null)} />
      )}

      {/* Cabeçalho do painel */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: isSuperAdmin ? 'linear-gradient(135deg,#7A2F00,#E85D26)' : 'var(--md-secondary-container)' }}>
          {isSuperAdmin ? '👑' : '🏪'}
        </div>
        <div>
          <p className="font-black text-base" style={{ color: 'var(--md-on-surface)', fontFamily: 'Google Sans Display,sans-serif' }}>
            {isSuperAdmin ? 'Superadmin' : (stores[0]?.name ?? 'Meu Painel')}
          </p>
          <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
            {isSuperAdmin ? 'Visão geral de todos os comércios' : 'Gerencie sua loja e pedidos'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: isSuperAdmin ? 'Comércios' : 'Produtos', value: isSuperAdmin ? stores.length : totalProducts },
          { label: 'Abertos agora', value: openStores },
          { label: isSuperAdmin ? 'Produtos' : 'Loja', value: isSuperAdmin ? totalProducts : (stores[0]?.name ?? '—') },
          { label: 'Fechados', value: stores.length - openStores },
        ].map(stat => (
          <div key={stat.label} className="p-4 text-center" style={{ ...sectionStyle, padding: '16px' }}>
            <p className="text-2xl font-black truncate" style={{ color: 'var(--md-primary)', fontFamily: 'Google Sans Display, sans-serif' }}>{stat.value}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: 'var(--md-on-surface-variant)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pedidos */}
      <OrdersSection
        stores={stores}
        orders={orders}
        onUpdateOrderStatus={onUpdateOrderStatus}
        defaultStoreId={defaultOrderStoreId}
      />

      {/* Cupons — apenas superadmin */}
      {isSuperAdmin && <CouponSection />}

      {/* Comércios */}
      <section style={sectionStyle} aria-label="Gerenciar comércios">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>
            🏪 {isSuperAdmin ? 'Comércios' : 'Minha Loja'}
          </h2>
          {isSuperAdmin && (
            <button onClick={() => setShowStoreForm(v => !v)} className="btn-primary py-1.5 px-4 text-xs">+ Novo</button>
          )}
        </div>

        {/* Formulário de novo comércio — apenas superadmin */}
        {isSuperAdmin && showStoreForm && (
          <div className="space-y-3 mb-4" style={formBgStyle}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-primary-container)' }}>Novo comércio</p>
            <input className="form-input w-full" placeholder="Nome *" value={storeForm.name}
              onChange={e => setStoreForm(p => ({ ...p, name: e.target.value }))} />
            <select className="form-input w-full" value={storeForm.category}
              onChange={e => setStoreForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
            <input className="form-input w-full" placeholder="Descrição" value={storeForm.description}
              onChange={e => setStoreForm(p => ({ ...p, description: e.target.value }))} />
            <input className="form-input w-full" placeholder="WhatsApp (com DDD) *" type="tel"
              value={storeForm.phone} onChange={e => setStoreForm(p => ({ ...p, phone: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="form-input" placeholder="Avaliação (ex: 4.8)" type="number" step="0.1" min="0" max="5"
                value={storeForm.rating} onChange={e => setStoreForm(p => ({ ...p, rating: e.target.value }))} />
              <input className="form-input" placeholder="Tempo (ex: 30–45 min)"
                value={storeForm.deliveryTime} onChange={e => setStoreForm(p => ({ ...p, deliveryTime: e.target.value }))} />
            </div>
            <ImageUpload label="Foto de capa" value={storeForm.coverImage}
              onChange={url => setStoreForm(p => ({ ...p, coverImage: url }))} folder="temp" />
            <div className="flex gap-2 items-center">
              <label className="form-label shrink-0">Cor:</label>
              <input className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ borderColor: 'var(--md-outline-variant)' }} type="color"
                value={storeForm.color} onChange={e => setStoreForm(p => ({ ...p, color: e.target.value }))} />
              <span className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>{storeForm.color}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveStore} className="btn-primary flex-1 py-2 text-sm">Salvar</button>
              <button onClick={() => setShowStoreForm(false)} className="flex-1 py-2 text-sm font-bold rounded-full"
                style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {stores.map(store => (
            <div key={store.id} className="flex items-center gap-3">
              <span className="text-2xl shrink-0">{store.category.split(' ')[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: 'var(--md-on-surface)' }}>{store.name}</p>
                <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                  {store.category} · {store.products.length} produtos{store.deliveryTime ? ` · ${store.deliveryTime}` : ''}
                </p>
              </div>
              <button role="switch" aria-checked={store.status === 'open'}
                onClick={() => onToggleStore(store.id, store.status === 'open' ? 'closed' : 'open')}
                className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                style={{ background: store.status === 'open' ? '#16A34A' : 'var(--md-outline-variant)', border: 'none' }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: store.status === 'open' ? '22px' : '2px' }} />
              </button>
              <button
                onClick={() => onUpdateStore(store.id, { visible: store.visible === false })}
                title={store.visible === false ? 'Oculto da vitrine — clique para mostrar' : 'Visível na vitrine — clique para ocultar'}
                className="text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0"
                style={{
                  background: store.visible === false ? 'var(--md-error-container)' : 'var(--md-secondary-container)',
                  color:      store.visible === false ? 'var(--md-on-error-container)' : 'var(--md-on-secondary-container)',
                  border: 'none',
                }}>
                {store.visible === false ? '🙈 Oculto' : '👁️ Visível'}
              </button>
              <button onClick={() => setEditingStore(store)} className="text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0"
                style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)', border: 'none' }}>
                Editar
              </button>
              {/* Remover comércio — apenas superadmin */}
              {isSuperAdmin && (
                <button onClick={() => setConfirmDeleteStore({ storeId: store.id, name: store.name })}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', border: 'none' }}>
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Produtos */}
      <section style={sectionStyle} aria-label="Gerenciar produtos">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>🍔 Produtos</h2>
          <button onClick={() => setShowProductForm(v => !v)} className="btn-primary py-1.5 px-4 text-xs">+ Novo</button>
        </div>
        {showProductForm && (
          <div className="space-y-3 mb-4" style={formBgStyle}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-primary-container)' }}>Novo produto</p>
            {/* Seletor de loja — superadmin escolhe, comerciante já tem a sua */}
            {isSuperAdmin ? (
              <select className="form-input w-full" value={productForm.storeId}
                onChange={e => setProductForm(p => ({ ...p, storeId: Number(e.target.value) }))}>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <p className="text-sm font-semibold px-1" style={{ color: 'var(--md-on-primary-container)' }}>
                Loja: {stores[0]?.name ?? ''}
              </p>
            )}
            <input className="form-input w-full" placeholder="Nome do produto *" value={productForm.name}
              onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} />
            <input className="form-input w-full" placeholder="Descrição" value={productForm.description}
              onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="form-input" placeholder="Preço *" type="number" step="0.01" min="0"
                value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} />
              <input className="form-input" placeholder="Seção (ex: Pizzas)" value={productForm.section}
                onChange={e => setProductForm(p => ({ ...p, section: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3 py-1">
              <input type="checkbox" id="new-oferta-dia" checked={productForm.ofertaDia}
                onChange={e => setProductForm(p => ({ ...p, ofertaDia: e.target.checked }))} />
              <label htmlFor="new-oferta-dia" className="text-sm font-semibold" style={{ color: 'var(--md-on-primary-container)' }}>
                🔥 Oferta do dia
              </label>
            </div>
            {productForm.ofertaDia && (
              <input className="form-input w-full" placeholder="Preço em oferta (ex: 9.90)" type="number" step="0.01" min="0"
                value={productForm.ofertaPreco} onChange={e => setProductForm(p => ({ ...p, ofertaPreco: e.target.value }))} />
            )}
            {/* Toggle pizza */}
            <div className="flex items-center gap-3 py-1">
              <input type="checkbox" id="new-is-pizza" checked={productForm.isPizza}
                onChange={e => {
                  const checked = e.target.checked
                  setProductForm(p => {
                    if (checked && p.sizes.length === 0)
                      return { ...p, isPizza: true, sizes: [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: p.price }], crusts: DEFAULT_CRUSTS }
                    return { ...p, isPizza: checked }
                  })
                }} />
              <label htmlFor="new-is-pizza" className="text-sm font-semibold" style={{ color: 'var(--md-on-primary-container)' }}>
                🍕 É uma pizza (modal de borda e sabores)
              </label>
            </div>
            {/* Configuração pizza */}
            {productForm.isPizza && (
              <div className="space-y-4 p-4 rounded-2xl" style={{ background: 'rgba(0,0,0,0.12)' }}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="new-allow-half" checked={productForm.allowHalf}
                    onChange={e => setProductForm(p => ({ ...p, allowHalf: e.target.checked }))} />
                  <label htmlFor="new-allow-half" className="text-sm font-semibold" style={{ color: 'var(--md-on-primary-container)' }}>
                    🍕½ Permite metade/metade (dois sabores)
                  </label>
                </div>
                {/* Tamanhos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-primary-container)' }}>Tamanhos</p>
                    <button onClick={() => setProductForm(p => ({ ...p, sizes: [...p.sizes, { id: '', label: '', info: '', price: '' }] }))}
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)', border: 'none' }}>
                      + Tamanho
                    </button>
                  </div>
                  {productForm.sizes.map((size, i) => (
                    <div key={i} className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 5rem auto' }}>
                      <input className="form-input" placeholder="Nome (ex: Grande)" value={size.label}
                        onChange={e => setProductForm(p => ({ ...p, sizes: p.sizes.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s) }))} />
                      <input className="form-input" placeholder="Preço" type="number" step="0.01" value={size.price}
                        onChange={e => setProductForm(p => ({ ...p, sizes: p.sizes.map((s, idx) => idx === i ? { ...s, price: e.target.value } : s) }))} />
                      <button onClick={() => setProductForm(p => ({ ...p, sizes: p.sizes.filter((_, idx) => idx !== i) }))}
                        className="px-2 rounded-lg text-xs font-bold"
                        style={{ background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', border: 'none' }}>✕</button>
                    </div>
                  ))}
                </div>
                {/* Bordas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-primary-container)' }}>Bordas</p>
                    <button onClick={() => setProductForm(p => ({ ...p, crusts: [...p.crusts, { id: '', label: '', extra: '0' }] }))}
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)', border: 'none' }}>
                      + Borda
                    </button>
                  </div>
                  {productForm.crusts.map((crust, i) => (
                    <div key={i} className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 5rem auto' }}>
                      <input className="form-input" placeholder="Nome (ex: Sem borda)" value={crust.label}
                        onChange={e => setProductForm(p => ({ ...p, crusts: p.crusts.map((c, idx) => idx === i ? { ...c, label: e.target.value } : c) }))} />
                      <input className="form-input" placeholder="+R$" type="number" step="0.50" min="0" value={crust.extra}
                        onChange={e => setProductForm(p => ({ ...p, crusts: p.crusts.map((c, idx) => idx === i ? { ...c, extra: e.target.value } : c) }))} />
                      <button onClick={() => setProductForm(p => ({ ...p, crusts: p.crusts.filter((_, idx) => idx !== i) }))}
                        className="px-2 rounded-lg text-xs font-bold"
                        style={{ background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', border: 'none' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ImageUpload label="Foto do produto" value={productForm.image}
              onChange={url => setProductForm(p => ({ ...p, image: url }))} folder="temp" />
            <div className="flex gap-2">
              <button onClick={handleSaveProduct} className="btn-primary flex-1 py-2 text-sm">Salvar</button>
              <button onClick={() => setShowProductForm(false)} className="flex-1 py-2 text-sm font-bold rounded-full"
                style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>Cancelar</button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {stores.flatMap(store =>
            store.products.map(product => (
              <div key={`${store.id}-${product.id}`} className="flex items-center gap-3 py-2 border-b last:border-0"
                style={{ borderColor: 'var(--md-outline-variant)' }}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--md-on-surface)' }}>{product.name}</p>
                  <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                    {isSuperAdmin && `${store.name} · `}{formatBRL(product.price)}
                    {product.ofertaDia && (
                      <span style={{ color: '#E85D26', fontWeight: 700 }}>
                        {product.ofertaPreco ? ` → 🔥 oferta ${formatBRL(product.ofertaPreco)}` : ' → 🔥 Oferta do dia'}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  role="switch" aria-checked={product.active !== false}
                  onClick={() => onToggleProduct(store.id, product.id, product.active === false)}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0"
                  title={product.active !== false ? 'Pausar item (não aparece no cardápio)' : 'Ativar item'}
                  style={{ background: product.active !== false ? '#dcfce7' : '#FEE2E2', color: product.active !== false ? '#16a34a' : '#dc2626', border: '1px solid var(--md-outline-variant)' }}>
                  {product.active !== false ? '✅' : '⏸️'}
                </button>
                <button
                  role="switch" aria-checked={product.ofertaDia}
                  onClick={() => onUpdateProduct(store.id, product.id, { ofertaDia: !product.ofertaDia })}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0"
                  style={{ background: product.ofertaDia ? '#FEF9C3' : 'var(--md-surface-high)', color: product.ofertaDia ? '#92400E' : 'var(--md-on-surface-variant)', border: '1px solid var(--md-outline-variant)' }}>
                  {product.ofertaDia ? '🔥 Oferta' : '🔥'}
                </button>
                <button onClick={() => setEditingProduct({ ...product, storeId: store.id })}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)', border: 'none' }}>
                  Editar
                </button>
                <button onClick={() => setConfirmDeleteProduct({ storeId: store.id, productId: product.id, name: product.name })}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', border: 'none' }}>
                  Remover
                </button>
              </div>
            ))
          )}
          {totalProducts === 0 && (
            <p className="text-center text-sm py-4" style={{ color: 'var(--md-on-surface-variant)' }}>Nenhum produto cadastrado.</p>
          )}
        </div>
      </section>

      {/* ── Relatórios ─────────────────────────────────────────── */}
      <ReportsSection stores={stores} defaultStoreId={defaultOrderStoreId} sectionStyle={sectionStyle} />

      {/* ── PDV ────────────────────────────────────────────────── */}
      <PDVSection stores={stores} isSuperAdmin={isSuperAdmin} sectionStyle={sectionStyle} formBgStyle={formBgStyle} />

      <button onClick={handleLogout} className="w-full py-3 text-sm font-bold rounded-full transition-colors"
        style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>
        Sair do painel
      </button>
    </div>
  )
}

// ── Relatórios ────────────────────────────────────────────────────────────────
function ReportsSection({ stores, defaultStoreId, sectionStyle }: {
  stores: Store[]; defaultStoreId?: number; sectionStyle: React.CSSProperties
}) {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [storeId, setStoreId] = useState<number | undefined>(defaultStoreId)

  useEffect(() => {
    setLoading(true)
    apiGetRecentOrders(storeId, 200).then(({ orders: data }) => {
      setOrders(data); setLoading(false)
    })
  }, [storeId])

  const tzOpt = { timeZone: 'America/Sao_Paulo' } as const
  const todayStr = new Date().toLocaleDateString('pt-BR', tzOpt)
  const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)

  const todayOrders = orders.filter(o =>
    new Date(o.created_at).toLocaleDateString('pt-BR', tzOpt) === todayStr
  )
  const weekOrders  = orders.filter(o => new Date(o.created_at) >= weekAgo)
  const monthOrders = orders.filter(o => new Date(o.created_at) >= monthAgo)

  const topProducts = Object.values(
    orders.flatMap(o => o.items).reduce<Record<string, { name: string; qty: number; total: number }>>((acc, item) => {
      if (!acc[item.name]) acc[item.name] = { name: item.name, qty: 0, total: 0 }
      acc[item.name].qty   += item.qty
      acc[item.name].total += item.price * item.qty
      return acc
    }, {})
  ).sort((a, b) => b.qty - a.qty).slice(0, 5)

  const stat = (label: string, count: number, total: number) => (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--md-surface-high)' }}>
      <p className="text-xl font-black" style={{ color: 'var(--md-primary)' }}>{count}</p>
      <p className="text-[10px] font-bold" style={{ color: 'var(--md-on-surface-variant)' }}>{label}</p>
      <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--md-on-surface)' }}>{formatBRL(total)}</p>
    </div>
  )

  return (
    <section style={sectionStyle} aria-label="Relatórios">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>
          📊 Relatórios
        </h2>
        {stores.length > 1 && (
          <select className="form-input text-xs py-1" value={storeId ?? ''}
            onChange={e => setStoreId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Todos</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--md-on-surface-variant)' }}>Calculando...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {stat('Hoje',   todayOrders.length, todayOrders.reduce((s, o) => s + o.final_total, 0))}
            {stat('7 dias', weekOrders.length,  weekOrders.reduce((s, o) => s + o.final_total, 0))}
            {stat('30 dias',monthOrders.length, monthOrders.reduce((s, o) => s + o.final_total, 0))}
          </div>
          {topProducts.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--md-on-surface-variant)' }}>
                🏆 Mais vendidos (30 dias)
              </p>
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between py-1.5 border-b last:border-0"
                  style={{ borderColor: 'var(--md-outline-variant)' }}>
                  <span className="text-sm" style={{ color: 'var(--md-on-surface)' }}>
                    <span className="font-black mr-2" style={{ color: 'var(--md-primary)' }}>#{i + 1}</span>
                    {p.name}
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--md-on-surface-variant)' }}>
                    {p.qty}x · {formatBRL(p.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ── PDV — Lançar Pedido Manual ────────────────────────────────────────────────
interface PDVItem { productId: number; name: string; price: number; qty: number }

function PDVSection({ stores, isSuperAdmin, sectionStyle, formBgStyle }: {
  stores: Store[]; isSuperAdmin: boolean
  sectionStyle: React.CSSProperties; formBgStyle: React.CSSProperties
}) {
  const [open,      setOpen]      = useState(false)
  const [storeId,   setStoreId]   = useState(stores[0]?.id ?? 0)
  const [items,     setItems]     = useState<PDVItem[]>([])
  const [name,      setName]      = useState('')
  const [phone,     setPhone]     = useState('')
  const [address,   setAddress]   = useState('')
  const [retirada,  setRetirada]  = useState(false)
  const [payment,   setPayment]   = useState('dinheiro')
  const [saving,    setSaving]    = useState(false)
  const [success,   setSuccess]   = useState(false)

  const store = stores.find(s => s.id === storeId) ?? stores[0]
  const activeProducts = (store?.products ?? []).filter(p => p.active !== false)

  const addItem = (product: Product) => {
    setItems(prev => {
      const ex = prev.find(i => i.productId === product.id)
      if (ex) return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1 }]
    })
  }

  const removeItem = (productId: number) =>
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0))

  const total = items.reduce((s, i) => s + i.price * i.qty, 0)

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || items.length === 0) return
    setSaving(true)
    await apiSaveOrder({
      storeId:       store!.id,
      storeName:     store!.name,
      customerName:  name.trim(),
      customerPhone: phone.replace(/\D/g, ''),
      address:       retirada ? 'Retirada no local' : address.trim(),
      items:         items.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })),
      total,
      payment,
      discount:      0,
      finalTotal:    total,
    })
    setSaving(false)
    setSuccess(true)
    setItems([]); setName(''); setPhone(''); setAddress('')
    setTimeout(() => setSuccess(false), 3000)
  }, [name, phone, address, retirada, payment, items, total, store])

  return (
    <section style={sectionStyle} aria-label="PDV">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>
          🖥️ PDV — Lançar Pedido
        </h2>
        <button onClick={() => setOpen(v => !v)} className="btn-primary py-1.5 px-4 text-xs">
          {open ? 'Fechar' : '+ Pedido'}
        </button>
      </div>
      {success && (
        <p className="text-sm font-bold text-center py-2 rounded-xl mb-3" style={{ background: '#dcfce7', color: '#16a34a' }}>
          ✅ Pedido lançado com sucesso!
        </p>
      )}
      {open && (
        <div className="space-y-3" style={formBgStyle}>
          {isSuperAdmin && stores.length > 1 && (
            <select className="form-input w-full" value={storeId}
              onChange={e => { setStoreId(Number(e.target.value)); setItems([]) }}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {/* Itens */}
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-primary-container)' }}>
            Produtos
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {activeProducts.map(p => {
              const inCart = items.find(i => i.productId === p.id)
              return (
                <div key={p.id} className="flex items-center justify-between py-1.5 rounded-lg px-2"
                  style={{ background: inCart ? 'rgba(0,0,0,0.08)' : 'transparent' }}>
                  <span className="text-xs font-semibold flex-1 truncate" style={{ color: 'var(--md-on-primary-container)' }}>
                    {p.name} · {formatBRL(p.price)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {inCart && (
                      <>
                        <button onClick={() => removeItem(p.id)} className="w-6 h-6 rounded-full font-bold text-sm flex items-center justify-center"
                          style={{ background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', border: 'none' }}>−</button>
                        <span className="text-xs font-bold w-4 text-center" style={{ color: 'var(--md-on-primary-container)' }}>{inCart.qty}</span>
                      </>
                    )}
                    <button onClick={() => addItem(p)} className="w-6 h-6 rounded-full font-bold text-sm flex items-center justify-center"
                      style={{ background: 'var(--md-primary)', color: '#fff', border: 'none' }}>+</button>
                  </div>
                </div>
              )
            })}
          </div>
          {items.length > 0 && (
            <p className="text-sm font-black text-right" style={{ color: 'var(--md-on-primary-container)' }}>
              Total: {formatBRL(total)}
            </p>
          )}
          {/* Cliente */}
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-primary-container)' }}>
            Cliente
          </p>
          <input className="form-input w-full" placeholder="Nome *" value={name} onChange={e => setName(e.target.value)} />
          <input className="form-input w-full" placeholder="Telefone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="pdv-retirada" checked={retirada} onChange={e => setRetirada(e.target.checked)} />
            <label htmlFor="pdv-retirada" className="text-sm font-semibold" style={{ color: 'var(--md-on-primary-container)' }}>
              🏃 Retirada no local
            </label>
          </div>
          {!retirada && (
            <input className="form-input w-full" placeholder="Endereço de entrega" value={address} onChange={e => setAddress(e.target.value)} />
          )}
          <select className="form-input w-full" value={payment} onChange={e => setPayment(e.target.value)}>
            <option value="dinheiro">💵 Dinheiro</option>
            <option value="pix">📱 Pix</option>
            <option value="cartao">💳 Cartão na entrega</option>
          </select>
          <button onClick={handleSubmit} disabled={saving || !name.trim() || items.length === 0}
            className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">
            {saving ? 'Salvando...' : `🛒 Lançar pedido · ${formatBRL(total)}`}
          </button>
        </div>
      )}
    </section>
  )
}
