// src/pages/Admin.tsx

import { useState, useCallback, useEffect } from 'react'
import type { Store, Product, StoreStatus, Order, OrderStatus } from '../types/types'
import type { AuthUser } from '../lib/auth'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { formatBRL } from '../lib/format'
import {
  getLoyaltyConfig, setLoyaltyActive, updateLoyaltyConfig, type LoyaltyConfig,
} from '../lib/loyaltyApi'
import { apiGetRecentOrders, apiUpdateOrderStatus, apiDeleteOrder } from '../lib/adminApi'
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
  onDeleteProduct:       (storeId: number, productId: number) => Promise<void>
  onDeleteStore:         (storeId: number) => Promise<void>
  onUpdateOrderStatus:   (orderId: string, status: OrderStatus) => void
  onLogout:              () => void
}

interface StoreForm {
  name: string; category: string; description: string
  phone: string; color: string; rating: string; deliveryTime: string; coverImage: string
}

interface ProductForm {
  storeId: number; name: string; description: string
  price: string; section: string; image: string; ofertaDia: boolean; ofertaPreco: string
}

const emptyStoreForm = (): StoreForm => ({
  name: '', category: CATEGORY_OPTIONS[0], description: '',
  phone: '', color: '#E85D26', rating: '', deliveryTime: '', coverImage: '',
})

const emptyProductForm = (storeId = 0): ProductForm => ({
  storeId, name: '', description: '', price: '', section: '', image: '', ofertaDia: false, ofertaPreco: '',
})

// ── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, confirmLabel = 'Remover', onConfirm, onCancel }: {
  message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
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
    </div>
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

  return (
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
    </div>
  )
}

// ── Edit Product Modal ───────────────────────────────────────────────────────
// edição de produto — inclui ofertaDia e ofertaPreco
function EditProductModal({ product, stores, onSave, onCancel }: {
  product: Product & { storeId: number }; stores: Store[]
  onSave: (updates: Partial<Omit<Product, 'id'>>) => Promise<void>; onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: product.name, description: product.description,
    price: String(product.price), section: product.section, image: product.image ?? '',
    ofertaDia: product.ofertaDia ?? false, ofertaPreco: product.ofertaPreco != null ? String(product.ofertaPreco) : '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    const price = parseFloat(form.price)
    if (!form.name.trim() || isNaN(price) || price <= 0) return
    const ofertaPreco = form.ofertaPreco.trim() ? parseFloat(form.ofertaPreco) : undefined
    setSaving(true)
    await onSave({
      name: form.name.trim(), description: form.description.trim(),
      price, section: form.section.trim() || 'Produtos',
      image: form.image.trim() || undefined,
      ofertaDia: form.ofertaDia, ofertaPreco: ofertaPreco != null && !isNaN(ofertaPreco) && ofertaPreco > 0 ? ofertaPreco : undefined,
    })
    setSaving(false)
    onCancel()
  }, [form, onSave, onCancel])

  const storeName = stores.find(s => s.id === product.storeId)?.name ?? ''

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg p-6 space-y-3"
        style={{ background: 'var(--md-surface-lowest)', borderRadius: 'var(--shape-xl) var(--shape-xl) 0 0', boxShadow: 'var(--md-elev-3)' }}>
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
        <div className="flex items-center gap-3 py-1">
          <input type="checkbox" id="edit-oferta-dia" checked={form.ofertaDia}
            onChange={e => setForm(p => ({ ...p, ofertaDia: e.target.checked }))} />
          <label htmlFor="edit-oferta-dia" className="text-sm font-semibold" style={{ color: 'var(--md-on-surface)' }}>
            🔥 Oferta do dia
          </label>
        </div>
        {form.ofertaDia && (
          <>
            <input className="form-input w-full" placeholder="Preço em oferta (ex: 9.90)" type="number" step="0.01" min="0"
              value={form.ofertaPreco} onChange={e => setForm(p => ({ ...p, ofertaPreco: e.target.value }))} />
            <p className="text-[11px]" style={{ color: 'var(--md-on-surface-variant)' }}>
              💡 Aparece riscado na vitrine com o preço original.
            </p>
          </>
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
    </div>
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

// ── Loyalty Section ──────────────────────────────────────────────────────────
function LoyaltySection() {
  const [config,        setConfig]        = useState<LoyaltyConfig | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [showEdit,      setShowEdit]      = useState(false)
  const [editThreshold, setEditThreshold] = useState('')
  const [editReward,    setEditReward]    = useState('')

  useEffect(() => {
    getLoyaltyConfig().then(cfg => {
      setConfig(cfg); setEditThreshold(String(cfg.pts_threshold))
      setEditReward(String(cfg.reward_brl)); setLoading(false)
    })
  }, [])

  const handleToggle = useCallback(async () => {
    if (!config) return
    const newActive = !config.active
    setSaving(true)
    const { error } = await setLoyaltyActive(newActive)
    setSaving(false)
    if (!error) setConfig(prev => prev ? { ...prev, active: newActive } : prev)
  }, [config])

  const handleSave = useCallback(async () => {
    const threshold = parseInt(editThreshold, 10)
    const reward    = parseFloat(editReward)
    if (isNaN(threshold) || isNaN(reward) || threshold < 1 || reward < 0) return
    setSaving(true)
    const { error } = await updateLoyaltyConfig({ pts_threshold: threshold, reward_brl: reward })
    setSaving(false)
    if (!error) {
      setConfig(prev => prev ? { ...prev, pts_threshold: threshold, reward_brl: reward } : prev)
      setShowEdit(false)
    }
  }, [editThreshold, editReward])

  if (loading) return (
    <section className="p-5" style={{ borderRadius: 'var(--shape-xl)', border: '1px solid var(--md-outline-variant)', background: 'var(--md-surface-lowest)' }}>
      <p className="text-sm text-center py-4" style={{ color: 'var(--md-on-surface-variant)' }}>Carregando...</p>
    </section>
  )

  return (
    <section className="p-5 space-y-4" aria-label="Sistema de fidelidade"
      style={{ borderRadius: 'var(--shape-xl)', border: '1px solid var(--md-outline-variant)', background: 'var(--md-surface-lowest)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>⭐ Fidelidade</h2>
        <button onClick={() => setShowEdit(v => !v)} className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', border: 'none' }}>
          {showEdit ? 'Fechar' : 'Configurar'}
        </button>
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: 'var(--md-surface-high)', border: '1px solid var(--md-outline-variant)' }}>
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--md-on-surface)' }}>{config?.active ? '🟢 Sistema ativo' : '🔴 Sistema inativo'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>
            {config?.active ? 'Usuários acumulando pontos' : 'Nenhum ponto será creditado'}
          </p>
        </div>
        <button role="switch" aria-checked={config?.active}
          onClick={handleToggle} disabled={saving}
          className="w-12 h-7 rounded-full relative transition-colors shrink-0 disabled:opacity-50"
          style={{ background: config?.active ? '#16A34A' : 'var(--md-outline-variant)', border: 'none' }}>
          <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
            style={{ left: config?.active ? '26px' : '4px' }} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: config?.pts_per_purchase ?? 1, label: 'ponto por compra' },
          { value: `${config?.pts_threshold ?? 10} pts = ${formatBRL(config?.reward_brl ?? 5)}`, label: 'regra de resgate' },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--md-primary-container)' }}>
            <p className="text-xl font-black" style={{ color: 'var(--md-on-primary-container)' }}>{item.value}</p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--md-on-primary-container)', opacity: 0.75 }}>{item.label}</p>
          </div>
        ))}
      </div>
      {showEdit && (
        <div className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--md-primary-container)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-primary-container)' }}>Editar regras</p>
          <div className="space-y-1">
            <label className="form-label">Pontos para resgatar</label>
            <input type="number" min="1" step="1" value={editThreshold}
              onChange={e => setEditThreshold(e.target.value)} className="form-input w-full" placeholder="Ex: 10" />
          </div>
          <div className="space-y-1">
            <label className="form-label">Valor do desconto (R$)</label>
            <input type="number" min="0" step="0.50" value={editReward}
              onChange={e => setEditReward(e.target.value)} className="form-input w-full" placeholder="Ex: 5.00" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2 text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowEdit(false)} className="flex-1 py-2 text-sm font-bold rounded-full"
              style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
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
  const [loading,      setLoading]      = useState(false)
  const [dbOrders,     setDbOrders]     = useState<Order[]>([])
  const [loaded,       setLoaded]       = useState(false)
  const [filterStoreId, setFilterStoreId] = useState<number | undefined>(defaultStoreId)

  const load = useCallback(async () => {
    setLoading(true)
    const { orders: data } = await apiGetRecentOrders(filterStoreId, 30)
    setDbOrders(data)
    setLoaded(true)
    setLoading(false)
  }, [filterStoreId])

  useEffect(() => { load() }, [load])

  // Merge: pedidos do banco + pedidos da sessão atual (em memória)
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

  return (
    <section aria-label="Pedidos recentes" style={{
      borderRadius: 'var(--shape-xl)', border: '1px solid var(--md-outline-variant)',
      background: 'var(--md-surface-lowest)', padding: '20px',
    }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--md-on-surface-variant)' }}>
          🛵 Pedidos recentes
        </h2>
        <button onClick={load} className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', border: 'none' }}>
          ↺ Atualizar
        </button>
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
        <OrderStatusPanel orders={merged} onUpdateStatus={handleUpdateStatus} onDeleteOrder={handleDeleteOrder} />
      )}
    </section>
  )
}

// ── Admin principal ──────────────────────────────────────────────────────────
export default function Admin({
  authUser, stores, orders, onToggleStore, onAddStore, onUpdateStore,
  onAddProduct, onUpdateProduct, onDeleteProduct, onDeleteStore,
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
    const { storeId, name, description, price, section, image, ofertaDia, ofertaPreco } = productForm
    const parsedPrice = parseFloat(price)
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice <= 0) return
    const parsedOfertaPreco = ofertaPreco.trim() ? parseFloat(ofertaPreco) : undefined
    onAddProduct(storeId, {
      name: name.trim(), description: description.trim(), price: parsedPrice,
      section: section.trim() || 'Produtos', image: image.trim() || undefined,
      ofertaDia, ofertaPreco: parsedOfertaPreco != null && !isNaN(parsedOfertaPreco) && parsedOfertaPreco > 0
        ? parsedOfertaPreco : undefined,
    })
    setProductForm(prev => ({ ...prev, name: '', description: '', price: '', section: '', image: '', ofertaDia: false, ofertaPreco: '' }))
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

      {/* Fidelidade — apenas superadmin */}
      {isSuperAdmin && <LoyaltySection />}

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

      <button onClick={handleLogout} className="w-full py-3 text-sm font-bold rounded-full transition-colors"
        style={{ border: '1px solid var(--md-outline-variant)', color: 'var(--md-on-surface-variant)', background: 'none' }}>
        Sair do painel
      </button>
    </div>
  )
}
