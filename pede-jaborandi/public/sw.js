const CACHE_NAME = 'pede-jaborandi-v4'
const DATA_CACHE = 'pede-jaborandi-data-v4'
const FONT_CACHE = 'pede-jaborandi-fonts-v4'

// Só cacheia URLs com scheme http/https.
// chrome-extension://, moz-extension://, data: etc. lançam TypeError no cache.put().
function isCacheable(url) {
  return url.startsWith('http://') || url.startsWith('https://')
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

  // 2. Dados Supabase — Network-first com fallback offline
  if (url.includes('supabase.co') && method === 'GET') {
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
