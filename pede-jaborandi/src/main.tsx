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
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Ativa o <link rel="preload"> das fontes como stylesheet quando terminar de
// carregar. Fica aqui (script externo) em vez de onload="" inline no HTML
// porque a CSP (script-src 'self') bloqueia handlers de evento inline.
const fontsLink = document.getElementById('gfonts-preload') as HTMLLinkElement | null
fontsLink?.addEventListener('load', () => { fontsLink.rel = 'stylesheet' })

// Registra o Service Worker apenas se o navegador tiver suporte.
// O registro ocorre no evento 'load' para não competir com o carregamento
// inicial da página, garantindo que o app já esteja visível antes do SW iniciar.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* silencia erros de rede */})
  })
}
