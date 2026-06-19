// src/components/InstallBanner.tsx
//
// Banner de instalação do PWA exibido no topo quando o navegador suporta
// o evento 'beforeinstallprompt' e o app ainda não está instalado.
// Controlado pelo hook useInstallPrompt — este componente é puramente visual.

interface InstallBannerProps {
  onInstall: () => Promise<void>
  onDismiss: () => void
}

export default function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  return (
    <div
      role="banner"
      className="bg-[#1a2535] text-white px-4 py-3 flex items-center gap-3"
    >
      <span className="text-xl shrink-0" aria-hidden="true">📱</span>

      <p className="flex-1 text-sm font-semibold leading-snug">
        Instale o app para pedir mais rápido!
      </p>

      <button
        onClick={onInstall}
        className="shrink-0 bg-[#E85D26] text-white text-sm font-bold
          px-3.5 py-1.5 rounded-xl transition-all active:scale-95 whitespace-nowrap"
      >
        Instalar
      </button>

      <button
        onClick={onDismiss}
        aria-label="Fechar banner de instalação"
        className="shrink-0 text-gray-400 hover:text-white transition-colors p-1"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
