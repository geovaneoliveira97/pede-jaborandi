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

// Converte <link rel="stylesheet"> gerado pelo Vite em preload não-bloqueante
// e injeta preconnect para o Supabase com base na variável de ambiente
function htmlOptimizePlugin(supabaseUrl: string): Plugin {
  return {
    name: 'html-optimize',
    apply: 'build',
    transformIndexHtml(html) {
      let result = html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
        `<link rel="preload" as="style" href="$1" onload="this.onload=null;this.rel='stylesheet'">` +
        `<noscript><link rel="stylesheet" href="$1"></noscript>`,
      )
      if (supabaseUrl) {
        const origin = new URL(supabaseUrl).origin
        result = result.replace(
          '</head>',
          `<link rel="preconnect" href="${origin}" crossorigin></head>`,
        )
      }
      return result
    },
  }
}

export default defineConfig(({ mode }) => {
  const envDir = existsSync('/etc/secrets/.env')
    ? '/etc/secrets'
    : process.cwd()

  const env = loadEnv(mode, envDir, '')

  return {
    plugins: [react(), htmlOptimizePlugin(env.VITE_SUPABASE_URL ?? '')],
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
