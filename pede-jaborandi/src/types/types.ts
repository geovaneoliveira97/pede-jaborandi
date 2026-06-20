// src/types/types.ts

export type AppView      = 'home' | 'menu' | 'cart' | 'checkout' | 'admin' | 'pontos' | 'vitrine'
export type StoreStatus  = 'open' | 'closed'
export type StoreMode    = 'delivery' | 'vitrine'
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao'

export const DEFAULT_STORE_COLOR = '#E85D26'

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix:      'Pix',
  cartao:   'Cartão na entrega',
}

export type OrderStatus = 'recebido' | 'preparando' | 'saiu' | 'entregue'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  recebido:   'Recebido',
  preparando: 'Preparando',
  saiu:       'Saiu para entrega',
  entregue:   'Entregue',
}

export const ORDER_STATUS_FLOW: OrderStatus[] = ['recebido', 'preparando', 'saiu', 'entregue']

// ── Tipos exclusivos de pizza ──────────────────────────────────────────────

export interface PizzaSize {
  id:       string           // ex: 'grande' | 'broto'
  label:    string           // ex: 'Grande 35cm'
  info:     string           // ex: '8 pedaços'
  price:    number           // preço base desta variação
}

export interface PizzaCrust {
  id:       string           // ex: 'sem_borda' | 'catupiry' | 'cheddar'
  label:    string           // ex: 'Sem borda'
  extra:    number           // acréscimo ao preço (0 para sem borda)
}

// ── Produto genérico ───────────────────────────────────────────────────────

export type ProductType = 'pizza' | 'item'   // 'item' = bebida, lanche, etc.

export interface Product {
  id:           number
  name:         string
  description:  string
  price:        number          // preço base (para tipo 'item') ou menor tamanho (para pizza)
  section:      string
  image?:       string
  ofertaDia?:   boolean
  ofertaPreco?: number

  // Campos opcionais — presentes somente quando productType === 'pizza'
  productType?: ProductType    // omitido = 'item' (retrocompatível)
  sizes?:       PizzaSize[]    // tamanhos disponíveis (Grande, Broto...)
  crusts?:      PizzaCrust[]   // opções de borda
  allowHalf?:   boolean        // permite metade/metade (padrão true para pizzas)
}

// ── Loja ───────────────────────────────────────────────────────────────────

export interface OpeningHours {
  weekdays: string   // ex: "11h–14h e 18h–22h"
  weekend:  string   // ex: "11h–23h"
}

export interface Store {
  id:             number
  name:           string
  category:       string
  description:    string
  phone:          string
  color:          string
  status:         StoreStatus
  mode:           StoreMode
  products:       Product[]
  rating?:        number
  deliveryTime?:  string
  coverImage?:    string
  openingHours?:  OpeningHours
  featured?:      boolean
  owner_id?:      string
}

// ── Item no carrinho ───────────────────────────────────────────────────────

export interface CartItem {
  storeId:   number
  productId: number
  name:      string
  price:     number   // preço final calculado (já inclui tamanho + borda)
  qty:       number
  image?:    string
  _key?:     string   // chave interna: productId|size|crust|half

  // Campos opcionais — preenchidos somente para pizzas
  size?:     string   // ex: 'Grande 35cm'
  crust?:    string   // ex: 'Catupiry'
  half?:     string   // ex: 'Calabresa' (nome do 2º sabor, se houver)
}

// ── Dados do cliente ────────────────────────────────────────────────────────

export interface CustomerData {
  name:         string
  phone:        string
  cep:          string
  street:       string
  number:       string
  complement:   string
  neighborhood: string
  city:         string
  reference:    string
  payment:      PaymentMethod
}

// ── Pedido ──────────────────────────────────────────────────────────────────

export interface OrderItem {
  productId: number
  name:      string
  price:     number
  qty:       number
}

export interface Order {
  id:            string
  store_id:      number
  storeName:     string
  customerName:  string
  customerPhone: string
  address:       string
  items:         OrderItem[]
  total:         number
  payment:       string
  discount:      number
  final_total:   number
  status:        OrderStatus
  created_at:    string
}

export function isStore(x: unknown): x is Store {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id          === 'number' &&
    typeof o.name        === 'string' &&
    typeof o.category    === 'string' &&
    typeof o.description === 'string' &&
    typeof o.phone       === 'string' &&
    (o.status === 'open' || o.status === 'closed') &&
    Array.isArray(o.products)
  )
}
