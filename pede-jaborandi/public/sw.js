const CACHE_NAME = 'pede-jaborandi-v5'
const DATA_CACHE = 'pede-jaborandi-data-v5'
const FONT_CACHE = 'pede-jaborandi-fonts-v5'

// Só cacheia URLs com scheme http/https.
// chrome-extension://, moz-extension://, data: etc. lançam TypeError no cache.put().
function isCacheable(url) {
  return url.startsWith('http://') || url.startsWith('https://')
}

// Só cacheia dados públicos (cardápio, sem autenticação). Nunca cachear
// /rest/v1/orders, /coupons ou qualquer outra tabela que carregue dados de
// admin/PII — essas respostas ficariam retidas na Cache Storage mesmo depois
// do logout, já que o Service Worker não tem visibilidade da sessão.
const PUBLIC_DATA_TABLES = ['stores', 'products']
function isPublicSupabaseData(url) {
  return PUBLIC_DATA_TABLES.some(table => url.includes(`/rest/v1/${table}`))
}

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  const validCaches = [CACHE_NAME, DATA_CACHE, FONT_CACHE]
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => !validCaches.includes(k))
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { url, method, mode } = event.request

  // Ignora schemes não suportados pelo Cache API (chrome-extension, moz-extension, etc.)
  if (!isCacheable(url)) return

  // 1. Navegação — Network-first
  if (mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const toCache = response.clone()
          caches.open(CACHE_NAME).then(c => c.put(event.request, toCache))
          return response
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // 2. Dados Supabase (só tabelas públicas) — Network-first com fallback offline
  if (url.includes('supabase.co') && method === 'GET' && isPublicSupabaseData(url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const toCache = response.clone()
            caches.open(DATA_CACHE).then(c => c.put(event.request, toCache))
          }
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // 2b. Qualquer outra chamada Supabase (autenticada: orders, coupons, rpc...)
  // — passa direto pra rede, sem interceptar nem cachear em lugar nenhum.
  if (url.includes('supabase.co')) return

  // 3. Fontes — Stale-While-Revalidate
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          const network = fetch(event.request).then(response => {
            cache.put(event.request, response.clone())
            return response
          })
          return cached ?? network
        })
      )
    )
    return
  }

  // 4. Assets estáticos — Cache-first (apenas GET)
  if (method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request)
        .then(response => {
          if (response.ok) {
            const toCache = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(event.request, toCache))
          }
          return response
        })
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }))
    })
  )
})
