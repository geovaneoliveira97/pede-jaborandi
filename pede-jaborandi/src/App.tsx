// src/App.tsx

import { useState, useCallback, lazy, Suspense, useEffect, useMemo } from 'react'
import type { AppView, Store, Product, StoreStatus, Order, OrderStatus } from './types/types'
import { useStores }        from './hooks/useStores'
import { useCart }          from './hooks/useCart'
import { useToast }         from './hooks/useToast'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import {
  apiAddStore, apiUpdateStore,
  apiToggleStore,
  apiAddProduct, apiUpdateProduct, apiToggleProduct,
  apiDeleteProduct, apiDeleteStore,
} from './lib/adminApi'
import { resolveRole, type AuthUser } from './lib/auth'
import { isSupabaseConfigured, getSupabase } from './lib/supabase'

import Header        from './components/Header'
import BottomNav     from './components/BottomNav'
import InstallBanner from './components/InstallBanner'
import Toast         from './components/Toast'
import { SkeletonHome, ErrorScreen } from './components/LoadingScreen'

import Home from './pages/Home'

const Menu     = lazy(() => import('./pages/Menu'))
const Cart     = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Admin    = lazy(() => import('./pages/Admin'))
const Vitrine  = lazy(() => import('./pages/Vitrine'))

const PAGE_TITLES: Record<AppView, string> = {
  home:     'Jaborandi – SP',
  menu:     'Cardápio',
  cart:     'Meu Carrinho',
  checkout: 'Finalizar Pedido',
  admin:    'Painel Admin',
  vitrine:  'Preços',
}

const CURRENT_STORE_KEY = 'pj_current_store_id'

const BACK_VIEWS: Partial<Record<AppView, AppView>> = {
  menu:     'home',
  cart:     'menu',
  checkout: 'cart',
  vitrine:  'home',
}

export default function App() {
  const [view,         setView]         = useState<AppView>('home')
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [localStores,  setLocalStores]  = useState<Store[] | null>(null)
  const [orders,       setOrders]       = useState<Order[]>([])
const [authUser,     setAuthUser]     = useState<AuthUser | null>(null)

  const { stores: fetchedStores, loading, error, retry } = useStores()

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      const u = session?.user
      if (u?.email) setAuthUser({ id: u.id, email: u.email, role: resolveRole(u.email) })
    })
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      setAuthUser(u?.email ? { id: u.id, email: u.email, role: resolveRole(u.email) } : null)
    })
    return () => subscription.unsubscribe()
  }, [])
  const { items, totalItems, totalPrice, addItem, clearCart, changeQty } = useCart()
  const { message: toastMsg, visible: toastVisible, showToast } = useToast()
  const { canInstall, install, dismiss } = useInstallPrompt()

  const activeStores = localStores ?? fetchedStores

  // Lojas visíveis no painel admin: superadmin vê todas, comerciante vê só as suas
  const adminStores = useMemo(() => {
    if (!authUser) return []
    if (authUser.role === 'superadmin') return activeStores
    return activeStores.filter(s => s.owner_id === authUser.id)
  }, [authUser, activeStores])

  // ── History API: sincroniza botão Voltar do Android ──────────────────────
  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const v = ((e.state as { view?: string })?.view ?? 'home') as AppView
      setView(v)
    }
    window.addEventListener('popstate', handlePop)

    // Inicializa com hash da URL se disponível (ex: PWA bookmark)
    const hash = window.location.hash.replace('#', '') as AppView
    const validViews: AppView[] = ['home', 'menu', 'cart', 'checkout', 'vitrine']
    if (hash && validViews.includes(hash)) setView(hash)

    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const navigateTo = useCallback((newView: AppView) => {
    window.history.pushState({ view: newView }, '', `#${newView}`)
    setView(newView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSelectStore = useCallback((store: Store) => {
    setCurrentStore(store)
    try { localStorage.setItem(CURRENT_STORE_KEY, String(store.id)) } catch { /* ignora erro de storage */ }
    navigateTo(store.mode === 'vitrine' ? 'vitrine' : 'menu')
  }, [navigateTo])

  // Restaura a loja selecionada depois de um reload de página real (ex: gesto
  // de deslizar/atualizar no mobile). A view volta pela URL (#menu), mas o
  // objeto Store em si só existe na memória — sem isso, a tela de Menu/Vitrine
  // fica em branco porque currentStore continua null.
  useEffect(() => {
    if (currentStore) return
    if (view !== 'menu' && view !== 'vitrine') return
    if (loading || activeStores.length === 0) return

    try {
      const savedId = localStorage.getItem(CURRENT_STORE_KEY)
      const found = savedId ? activeStores.find(s => s.id === Number(savedId)) : undefined
      if (found) { setCurrentStore(found); return }
    } catch { /* ignora erro de storage */ }

    // Não achou a loja salva (removida, ou nunca existiu) — volta pra Home
    // em vez de deixar a tela em branco.
    navigateTo('home')
  }, [view, currentStore, activeStores, loading, navigateTo])

  const handleOrderSuccess = useCallback(() => {
    clearCart()
    navigateTo('home')
  }, [clearCart, navigateTo, currentStore])

  const handleUpdateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }, [])

  // ── Acesso Admin via 5 toques no logo ────────────────────────────────────
  const handleAdminUnlock = useCallback(() => {
    navigateTo('admin')
  }, [navigateTo])

  // ── Mutações Admin ────────────────────────────────────────────────────────

  const handleToggleStore = useCallback(async (storeId: number, status: StoreStatus) => {
    setLocalStores(prev => (prev ?? fetchedStores).map(s => s.id === storeId ? { ...s, status } : s))
    const { error: err } = await apiToggleStore(storeId, status)
    if (err) showToast('Erro ao atualizar status — tente novamente')
  }, [fetchedStores, showToast])

  const handleAddStore = useCallback(async (store: Omit<Store, 'id'>) => {
    const { id, error: err } = await apiAddStore(store, authUser?.id)
    if (err || !id) { showToast('Erro ao salvar comércio'); return }
    setLocalStores(prev => [...(prev ?? fetchedStores), { ...store, id, products: [], owner_id: authUser?.id }])
    showToast('✓ Comércio cadastrado!')
  }, [fetchedStores, showToast, authUser])

  const handleUpdateStore = useCallback(async (
    storeId: number,
    updates: Partial<Omit<Store, 'id' | 'products'>>
  ) => {
    const { error: err } = await apiUpdateStore(storeId, updates)
    if (err) { showToast('Erro ao atualizar comércio'); return }
    setLocalStores(prev => (prev ?? fetchedStores).map(s => s.id === storeId ? { ...s, ...updates } : s))
    setCurrentStore(prev => prev?.id === storeId ? { ...prev, ...updates } : prev)
    showToast('✓ Comércio atualizado!')
  }, [fetchedStores, showToast])

  const handleDeleteStore = useCallback(async (storeId: number) => {
    const { error: err } = await apiDeleteStore(storeId)
    if (err) { showToast('Erro ao remover comércio'); return }
    setLocalStores(prev => (prev ?? fetchedStores).filter(s => s.id !== storeId))
    showToast('✓ Comércio removido')
  }, [fetchedStores, showToast])

  const handleAddProduct = useCallback(async (storeId: number, product: Omit<Product, 'id'>) => {
    const { id, error: err } = await apiAddProduct(storeId, product)
    if (err || !id) { showToast('Erro ao salvar produto'); return }
    setLocalStores(prev => (prev ?? fetchedStores).map(s =>
      s.id === storeId ? { ...s, products: [...s.products, { ...product, id }] } : s
    ))
    showToast('✓ Produto cadastrado!')
  }, [fetchedStores, showToast])

  const handleUpdateProduct = useCallback(async (
    storeId: number, productId: number, updates: Partial<Omit<Product, 'id'>>
  ) => {
    const { error: err } = await apiUpdateProduct(productId, updates)
    if (err) { showToast('Erro ao atualizar produto'); return }
    setLocalStores(prev => (prev ?? fetchedStores).map(s =>
      s.id === storeId
        ? { ...s, products: s.products.map(p => p.id === productId ? { ...p, ...updates } : p) }
        : s
    ))
    showToast('✓ Produto atualizado!')
  }, [fetchedStores, showToast])

  const handleToggleProduct = useCallback(async (storeId: number, productId: number, active: boolean) => {
    const { error: err } = await apiToggleProduct(productId, active)
    if (err) { showToast('Erro ao pausar produto'); return }
    setLocalStores(prev => (prev ?? fetchedStores).map(s =>
      s.id === storeId
        ? { ...s, products: s.products.map(p => p.id === productId ? { ...p, active } : p) }
        : s
    ))
    showToast(active ? '✅ Produto ativado' : '⏸️ Produto pausado')
  }, [fetchedStores, showToast])

  const handleDeleteProduct = useCallback(async (storeId: number, productId: number) => {
    const { error: err } = await apiDeleteProduct(productId)
    if (err) { showToast('Erro ao remover produto'); return }
    setLocalStores(prev => (prev ?? fetchedStores).map(s =>
      s.id === storeId ? { ...s, products: s.products.filter(p => p.id !== productId) } : s
    ))
    showToast('✓ Produto removido')
  }, [fetchedStores, showToast])

  // ── Render ────────────────────────────────────────────────────────────────

  const backView = BACK_VIEWS[view]

  // Skeleton dentro do layout real (preserva Header e BottomNav)
  if (loading) {
    return (
      <div className="min-h-screen pb-28">
        {canInstall && <InstallBanner onInstall={install} onDismiss={dismiss} />}
        <Header
          title={PAGE_TITLES['home']}
          onAdminUnlock={handleAdminUnlock}
        />
        <main className="max-w-lg mx-auto px-4 py-5">
          <SkeletonHome />
        </main>
        <BottomNav view="home" onNavigate={navigateTo} cartCount={0} />
      </div>
    )
  }

  if (error) {
    return <ErrorScreen onRetry={retry} />
  }

  return (
    <div className="min-h-screen pb-28">
      {canInstall && <InstallBanner onInstall={install} onDismiss={dismiss} />}

      <Header
        title={
          view === 'menu'    && currentStore ? currentStore.name :
          view === 'vitrine' && currentStore ? currentStore.name :
          PAGE_TITLES[view]
        }
        onBack={backView ? () => navigateTo(backView) : undefined}
        cartCount={totalItems}
        onCartClick={view === 'menu' ? () => navigateTo('cart') : undefined}
        onAdminUnlock={handleAdminUnlock}
      />

      <main className="max-w-lg mx-auto px-4 py-5">
        {view === 'home' && (
          <Home stores={activeStores} onSelect={handleSelectStore} />
        )}
        {view === 'menu' && currentStore && (
          <Suspense fallback={null}>
            <Menu
              store={currentStore}
              addItem={addItem}
              clearCart={clearCart}
              showToast={showToast}
              cartItems={items}
              cartTotal={totalPrice}
              onChangeQty={changeQty}
              onGoToCart={() => navigateTo('cart')}
            />
          </Suspense>
        )}
        {view === 'vitrine' && currentStore && (
          <Suspense fallback={null}>
            <Vitrine store={currentStore} />
          </Suspense>
        )}
        {view === 'cart' && (
          <Suspense fallback={null}>
            <Cart
              items={items}
              stores={activeStores}
              totalPrice={totalPrice}
              onChangeQty={changeQty}
              onCheckout={() => navigateTo('checkout')}
              onGoHome={() => navigateTo('home')}
            />
          </Suspense>
        )}
        {view === 'checkout' && (
          <Suspense fallback={null}>
            <Checkout
              items={items}
              stores={activeStores}
              totalPrice={totalPrice}
              onSuccess={handleOrderSuccess}
              showToast={showToast}
            />
          </Suspense>
        )}
        {view === 'admin' && (
          <Suspense fallback={null}>
            <Admin
              authUser={authUser}
              stores={adminStores}
              orders={orders}
              onToggleStore={handleToggleStore}
              onAddStore={handleAddStore}
              onUpdateStore={handleUpdateStore}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onToggleProduct={handleToggleProduct}
              onDeleteProduct={handleDeleteProduct}
              onDeleteStore={handleDeleteStore}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onLogout={() => navigateTo('home')}
            />
          </Suspense>
        )}
      </main>

      <BottomNav view={view} onNavigate={navigateTo} cartCount={totalItems} />
      <Toast message={toastMsg} visible={toastVisible} />


    </div>
  )
}
