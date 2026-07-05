// vite.config.ts
//
// Configuração do Vite — mesma estratégia do JaborandiTransp para
// compatibilidade com o Render em produção e desenvolvimento local.
// Em produção (Render), as variáveis ficam em '/etc/secrets/.env'.
// Em desenvolvimento, o Vite lê o '.env' da raiz do projeto.

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'fs'
import type { Plugin } from 'vite'

// Inline o CSS gerado pelo Vite diretamente no HTML.
// Evita tanto o render-blocking quanto o Style&Layout reflow do carregamento assíncrono.
// Funciona bem pois o Tailwind purga o CSS e o output final é ~5 KiB.
function inlineCssPlugin(): Plugin {
  const cssMap = new Map<string, string>()

  return {
    name: 'inline-css',
    apply: 'build',
    generateBundle(_opts, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.css') && chunk.type === 'asset') {
          cssMap.set(fileName, chunk.source as string)
          delete bundle[fileName]
        }
      }
    },
    transformIndexHtml(html) {
      if (cssMap.size === 0) return html
      const allCss = [...cssMap.values()].join('')
      return html.replace(
        /<link rel="stylesheet" crossorigin href="[^"]+\.css">/g,
        `<style>${allCss}</style>`,
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const envDir = existsSync('/etc/secrets/.env')
    ? '/etc/secrets'
    : process.cwd()

  const env = loadEnv(mode, envDir, '')

  return {
    plugins: [react(), inlineCssPlugin()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL':      JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:   ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  }
})
