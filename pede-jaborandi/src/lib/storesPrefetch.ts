import { isSupabaseConfigured, getSupabase } from './supabase'

// Dispara a query de lojas imediatamente quando este módulo é carregado,
// antes do React montar. useStores.ts importa e aguarda esta Promise na
// primeira carga, poupando ~150-200ms do Resource Load Delay do LCP.
export const storesPrefetch = isSupabaseConfigured()
  ? getSupabase().from('stores').select('*, products(*)').then(r => r)
  : null
