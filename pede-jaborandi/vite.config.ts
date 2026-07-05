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

// Plugin vazio — CSS bloqueante é melhor neste caso porque o recálculo
// de estilos após carregamento assíncrono custa mais que o bloqueio inicial de 150ms
function htmlOptimizePlugin(): Plugin {
  return { name: 'html-optimize', apply: 'build' }
}

export default defineConfig(({ mode }) => {
  const envDir = existsSync('/etc/secrets/.env')
    ? '/etc/secrets'
    : process.cwd()

  const env = loadEnv(mode, envDir, '')

  return {
    plugins: [react(), htmlOptimizePlugin()],
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
