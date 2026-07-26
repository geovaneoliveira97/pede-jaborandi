// src/lib/sentry.ts
//
// Monitoramento de erros em produção via Sentry. O SDK (~50 KiB) é importado
// sob demanda em vez de estático — se fosse import estático, entraria no
// bundle crítico e pesaria em FCP/LCP/TBT mesmo a maioria das execuções
// nunca gerando um erro. initSentry() só é chamado depois do 'load' da
// página (ver main.tsx); reportError() só baixa o SDK no momento em que um
// crash de fato acontece (ver AppErrorBoundary).

function shouldRun(): boolean {
  return import.meta.env.PROD && Boolean(import.meta.env.VITE_SENTRY_DSN)
}

export async function initSentry() {
  if (!shouldRun()) return

  const Sentry = await import('@sentry/browser')
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    ignoreErrors: [
      // Script de RUM injetado automaticamente pela própria Netlify
      // (/.netlify/scripts/rum). Falha porque nossa CSP não libera o host
      // de coleta dele — não tem relação com o app, então não vale nem o
      // ruído no Sentry nem afrouxar a CSP por causa de telemetria da Netlify.
      /ingesteer\.services-prod\.nsvcs\.net/,
    ],
  })
}

export async function reportError(error: unknown) {
  if (!shouldRun()) return

  const Sentry = await import('@sentry/browser')
  Sentry.captureException(error)
}
