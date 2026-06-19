// vite.config.ts
//
// Configuração do Vite — mesma estratégia do JaborandiTransp para
// compatibilidade com o Render em produção e desenvolvimento local.
// Em produção (Render), as variáveis ficam em '/etc/secrets/.env'.
// Em desenvolvimento, o Vite lê o '.env' da raiz do projeto.

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'fs'

export default defineConfig(({ mode }) => {
  const envDir = existsSync('/etc/secrets/.env')
    ? '/etc/secrets'
    : process.cwd()

  const env = loadEnv(mode, envDir, '')

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL':      JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
  }
})
