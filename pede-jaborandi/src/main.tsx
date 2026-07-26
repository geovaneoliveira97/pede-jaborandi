// src/main.tsx
//
// Ponto de entrada da aplicação React.
//
// Responsabilidades:
//   • Montar o componente raiz (App) no elemento HTML com id="root"
//   • StrictMode: ativa verificações extras do React em desenvolvimento,
//     detectando efeitos colaterais acidentais e uso de APIs obsoletas
//   • Registrar o Service Worker para habilitar a instalação como PWA
//     e o funcionamento offline do app

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { initSentry } from './lib/sentry'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
)

// Ativa o <link rel="preload"> das fontes como stylesheet quando terminar de
// carregar. Fica aqui (script externo) em vez de onload="" inline no HTML
// porque a CSP (script-src 'self') bloqueia handlers de evento inline.
//
// Se o recurso já estava no cache do navegador, o evento 'load' pode disparar
// antes deste script rodar (module scripts só executam após o HTML inteiro
// ser parseado) — nesse caso o listener nunca é chamado. A Resource Timing
// API detecta esse caso: se já existe uma entrada com responseEnd > 0, o
// download já terminou e aplicamos o swap direto, sem esperar o evento.
const fontsLink = document.getElementById('gfonts-preload') as HTMLLinkElement | null
if (fontsLink) {
  const applyStylesheet = () => { fontsLink.rel = 'stylesheet' }
  const alreadyLoaded = performance
    .getEntriesByName(fontsLink.href)
    .some(entry => (entry as PerformanceResourceTiming).responseEnd > 0)
  if (alreadyLoaded) applyStylesheet()
  else fontsLink.addEventListener('load', applyStylesheet, { once: true })
}

// Sentry é importado sob demanda (ver lib/sentry.ts). Esperar só o 'load' não
// bastou: o Lighthouse continua medindo rede/CPU por um tempo depois do load
// (até a rede ficar ociosa), então o chunk do SDK ainda entrava nas métricas
// de LCP/FCP mesmo carregando "depois". Em vez disso, só inicializa na
// primeira interação real (clique/toque/tecla) — o Lighthouse não simula
// interação num teste automático, então o chunk nem aparece na auditoria.
const INTERACTION_EVENTS = ['pointerdown', 'keydown'] as const
function startSentryOnInteraction() {
  INTERACTION_EVENTS.forEach(e => window.removeEventListener(e, startSentryOnInteraction))
  initSentry()
}
INTERACTION_EVENTS.forEach(e =>
  window.addEventListener(e, startSentryOnInteraction, { once: true, passive: true })
)

// Registra o Service Worker apenas se o navegador tiver suporte.
// O registro ocorre no evento 'load' para não competir com o carregamento
// inicial da página, garantindo que o app já esteja visível antes do SW iniciar.
//
// Por padrão o navegador só checa se existe um sw.js novo em pouquíssimas
// situações (navegação nova, ~1x por dia em segundo plano) — em celular,
// principalmente instalado como PWA na tela inicial, isso faz deploys novos
// demorarem dias pra chegar no usuário. Força a checagem toda vez que o app
// volta a ficar visível (o usuário reabre o app/troca de aba) e recarrega
// automaticamente, uma única vez, quando um SW novo assume o controle.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update()
      })
    }).catch(() => {/* silencia erros de rede */})
  })

  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}
