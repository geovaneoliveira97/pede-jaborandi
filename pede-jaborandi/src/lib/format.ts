// src/lib/format.ts
//
// Utilitários de formatação usados em todo o projeto.
// Centralizar aqui elimina a duplicação de formatBRL que existia em
// Cart.tsx, Checkout.tsx e whatsapp.ts.

// Formata valor em reais com separadores brasileiros (ex: R$ 1.234,50)
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:                 'currency',
    currency:              'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Formata valor sem símbolo, para composição inline com "R$" separado
export function formatBRLRaw(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
