// src/App.tsx

import { useState, useCallback, lazy, Suspense, useEffect } from 'react'
import type { AppView, Store, Product, StoreStatus, Order, OrderStatus } from './types/types'
import { useStores }        from './hooks/useStores'
import { useCart }          from './hooks/useCart'
import { useToast }         from './hooks/useToast'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import {
  apiAddStore, apiUpdateStore,
  apiToggleStore,
  apiAddProduct, apiUpdateProduct,
  apiDeleteProduct, apiDeleteStore,
} from './lib/adminApi'

import Header        from './components/Header'
import BottomNav     from './components/BottomNav'
import InstallBanner from './components/InstallBanner'
import Toast         from './components/Toast'
import { SkeletonHome, ErrorScreen } from './components/LoadingScreen'
import QuickRating from './components/QuickRating'

import Home     from './pages/Home'
import Menu     from './pages/Menu'
import Cart     from './pages/Cart'
import Checkout from './pages/Checkout'

const Admin   = lazy(() => import('./pages/Admin'))
const Points  = lazy(() => import('./pages/Points'))
const Vitrine = lazy(() => import('./pages/Vitrine'))

const PAGE_TITLES: Record<AppView, string> = {
  home:     'Jaborandi – SP',
  menu:     'Cardápio',
  cart:     'Meu Carrinho',
  checkout: 'Finalizar Pedido',
  admin:    'Painel Admin',
  pontos:   'Meus Pontos',
  vitrine:  'Preços',
}

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
  const [quickRating,  setQuickRating]  = useState<{ storeName: string } | null>(null)

  const { stores: fetchedStores, loading, error, retry } = useStores()
  const { items, totalItems, totalPrice, addItem, clearCart, changeQty } = useCart()
  const { message: toastMsg, visible: toastVisible, showToast } = useToast()
  const { canInstall, install, dismiss } = useInstallPrompt()

  const activeStores = localStores ?? fetchedStores

  // ── History API: sincroniza botão Voltar do Android ──────────────────────
  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const v = ((e.state as { view?: string })?.view ?? 'home') as AppView
      setView(v)
    }
    window.addEventListener('popstate', handlePop)

    // Inicializa com hash da URL se disponível (ex: PWA bookmark)
    const hash = window.location.hash.replace('#', '') as AppView
    const validViews: AppView[] = ['home', 'menu', 'cart', 'checkout', 'pontos', 'vitrine']
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
    navigateTo(store.mode === 'vitrine' ? 'vitrine' : 'menu')
  }, [navigateTo])

  const handleOrderSuccess = useCallback(() => {
    const storeName = currentStore?.name ?? ''
    clearCart()
    navigateTo('home')
    // Exibe avaliação rápida após pequeno delay para a navegação completar
    if (storeName) {
      setTimeout(() => setQuickRating({ storeName }), 600)
    }
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
    const { id, error: err } = await apiAddStore(store)
    if (err || !id) { showToast('Erro ao salvar comércio'); return }
    setLocalStores(prev => [...(prev ?? fetchedStores), { ...store, id, products: [] }])
    showToast('✓ Comércio cadastrado!')
  }, [fetchedStores, showToast])

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
        )}
        {view === 'vitrine' && currentStore && (
          <Suspense fallback={null}>
            <Vitrine store={currentStore} />
          </Suspense>
        )}
        {view === 'cart' && (
          <Cart
            items={items}
            stores={activeStores}
            totalPrice={totalPrice}
            onChangeQty={changeQty}
            onCheckout={() => navigateTo('checkout')}
            onGoHome={() => navigateTo('home')}
          />
        )}
        {view === 'checkout' && (
          <Checkout
            items={items}
            stores={activeStores}
            totalPrice={totalPrice}
            onSuccess={handleOrderSuccess}
            showToast={showToast}
          />
        )}
        {view === 'pontos' && <Suspense fallback={null}><Points /></Suspense>}
        {view === 'admin' && (
          <Suspense fallback={null}>
            <Admin
              stores={activeStores}
              orders={orders}
              onToggleStore={handleToggleStore}
              onAddStore={handleAddStore}
              onUpdateStore={handleUpdateStore}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
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

      {/* Avaliação rápida pós-pedido */}
      {quickRating && (
        <QuickRating
          storeName={quickRating.storeName}
          onRate={() => setQuickRating(null)}
          onClose={() => setQuickRating(null)}
        />
      )}
    </div>
  )
}
