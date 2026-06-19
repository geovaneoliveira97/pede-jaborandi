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

// Registra o Service Worker apenas se o navegador tiver suporte.
// O registro ocorre no evento 'load' para não competir com o carregamento
// inicial da página, garantindo que o app já esteja visível antes do SW iniciar.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        // Força verificação de atualização do SW a cada carregamento.
        // Garante que todos os usuários recebam o SW mais recente sem
        // precisar fechar e reabrir o app manualmente.
        registration.update()

        // Se houver um SW novo esperando para assumir o controle,
        // recarrega a página automaticamente para ativá-lo imediatamente.
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'activated' &&
              navigator.serviceWorker.controller
            ) {
              window.location.reload()
            }
          })
        })
      })
      .catch(err => {
        console.error('Service Worker falhou ao registrar:', err)
      })
  })
}
