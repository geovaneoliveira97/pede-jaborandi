// src/lib/supabase.ts
//
// Inicializa o cliente Supabase de forma lazy — o createClient só é chamado
// quando getSupabase() é invocado pela primeira vez, nunca na importação do módulo.
//
// Motivação: chamar createClient() no nível do módulo causa um erro fatal
// ("supabaseUrl is required") quando as variáveis de ambiente não estão
// configuradas. A inicialização lazy permite que o app detecte a ausência
// das variáveis (via isSupabaseConfigured) e use os dados mockados
// sem nunca chegar a instanciar o cliente.
//
// Desenvolvimento local: crie um '.env' na raiz com as variáveis abaixo.
// Produção (Render): configure as variáveis no painel do serviço.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Exportada para uso em useStores.ts — verificada antes de qualquer chamada ao banco.
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL     as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  return (
    typeof url === 'string' && url.startsWith('https://') &&
    typeof key === 'string' && key.length > 0
  )
}

let _client: SupabaseClient | null = null

// Retorna o cliente Supabase, criando-o na primeira chamada (lazy).
// Só deve ser chamado após confirmar isSupabaseConfigured() === true.
export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      import.meta.env.VITE_SUPABASE_URL      as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      {
        realtime:  { params: { eventsPerSecond: -1 } },
        global:    { headers: { 'x-client-info': 'pede-jaborandi' } },
        auth:      { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      },
    )
  }
  return _client
}
