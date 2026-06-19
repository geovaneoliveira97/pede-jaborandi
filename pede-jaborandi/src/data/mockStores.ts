// src/data/mockStores.ts
//
// Moreiras Delivery — cardápio completo extraído do PDF (mai/2026)
// Pizzas Tradicionais usam productType:'pizza' com tamanho único + bordas configuráveis.
// Brotinhos, Pastéis, Calzones, Espetos e Bebidas são itens simples.

import type { Store } from '../types/types'

// ── Bordas das Pizzas Tradicionais (grandes) ────────────────────────────────
const BORDAS_TRADICIONAL = [
  { id: 'sem_borda',    label: 'Sem borda',                          extra: 0  },
  { id: 'trad',        label: 'Borda Tradicional (cheddar/catupiry)', extra: 10 },
  { id: 'especial',    label: 'Borda Especial',                       extra: 15 },
  { id: 'camarao',     label: 'Borda Camarão',                        extra: 12 },
  { id: 'vulcao',      label: 'Borda Vulcão (cheddar/catupiry)',       extra: 20 },
]

export const MOCK_STORES: Store[] = [
  // ── Moreiras Delivery ──────────────────────────────────────────────────────
  {
    id:           1,
    name:         'Moreiras Delivery',
    category:     '🍕 Pizzas e Pastéis',
    description:  'Pizzas, Pastéis, Calzone, Espetos e mais!',
    phone:        '5517991609691',
    color:        '#C0392B',
    status:       'open',
    mode:         'delivery',
    rating:       4.9,
    deliveryTime: '30–45 min',
    products: [

      // ═══════════════════════════════════════════════════════════════════════
      // PIZZAS TRADICIONAIS — preço = pizza sem borda. Borda é opcional (+extra).
      // ═══════════════════════════════════════════════════════════════════════

      {
        id: 101, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: '4 Queijos',
        description: 'Molho especial, muçarela, provolone, parmesão, catupiry, azeitona, orégano.',
        price: 62,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 62 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 102, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Lá Moda Moreiras',
        description: 'Molho especial, muçarela, presunto, bacon, ovo, palmito, milho, tomate, cebola, catupiry, azeitona, orégano.',
        price: 62,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 62 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 103, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'LBB',
        description: 'Molho especial, muçarela, lombo, bacon, banana, tomate, azeitona, orégano.',
        price: 62,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 62 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 104, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Frango Cheddar',
        description: 'Molho especial, muçarela, frango, cheddar, azeitona, orégano.',
        price: 62,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 62 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 105, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Caprese',
        description: 'Molho especial, muçarela, presunto, tomate, cebola, bacon, azeitona, catupiry, orégano.',
        price: 60,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 60 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 106, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: '4 Carnes',
        description: 'Molho especial, muçarela, frango, lombo, calabresa, bacon, azeitona, orégano.',
        price: 60,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 60 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 107, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Caipira',
        description: 'Molho especial, muçarela, frango, milho, batata palha, azeitona, orégano.',
        price: 60,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 60 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 108, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Carijó',
        description: 'Molho especial, muçarela, frango, calabresa, milho, azeitona, orégano.',
        price: 60,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 60 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 109, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Costela ao Barbecue',
        description: 'Molho especial, muçarela, costela desfiada, molho barbecue, azeitona, orégano.',
        price: 60,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 60 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 110, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Frango Bacon',
        description: 'Molho especial, muçarela, frango, bacon, azeitona, orégano.',
        price: 60,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 60 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 111, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Frango Catupiry',
        description: 'Molho especial, muçarela, frango, catupiry, azeitona, orégano.',
        price: 60,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 60 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 112, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Portuguesa',
        description: 'Molho especial, muçarela, presunto, ovo, ervilha, palmito, cebola, azeitona, orégano.',
        price: 58,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 58 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 113, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Lombo Bacon',
        description: 'Molho especial, muçarela, lombo, bacon, cebola, azeitona, orégano.',
        price: 58,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 58 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 114, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Alho Bacon',
        description: 'Molho especial, muçarela, alho frito, bacon, azeitona, orégano.',
        price: 58,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 58 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 115, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Bauru',
        description: 'Molho especial, muçarela, presunto, tomate, azeitona, orégano.',
        price: 58,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 58 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 116, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Lombo Catupiry',
        description: 'Molho especial, muçarela, lombo, catupiry, azeitona, orégano.',
        price: 59,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 59 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 117, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Palmito',
        description: 'Molho especial, muçarela, palmito, tomate, azeitona, orégano.',
        price: 56,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 56 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 118, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Brócolis Bacon',
        description: 'Molho especial, muçarela, brócolis, bacon, azeitona, orégano.',
        price: 56,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 56 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 119, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Calabresa Catupiry',
        description: 'Molho especial, muçarela, calabresa, cebola, catupiry, azeitona, orégano.',
        price: 54,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 54 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 120, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Marguerita',
        description: 'Molho especial, muçarela, manjericão, milho, tomate, azeitona, orégano.',
        price: 54,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 54 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 121, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Vegetariana',
        description: 'Molho especial, muçarela, brócolis, ervilha, milho, palmito, tomate, azeitona, orégano.',
        price: 54,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 54 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 122, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Brócolis Alho',
        description: 'Molho especial, muçarela, brócolis, alho frito, azeitona, orégano.',
        price: 54,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 54 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 123, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Americana',
        description: 'Molho especial, muçarela, calabresa, ovo, tomate, azeitona, orégano.',
        price: 52,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 52 }],
        crusts: BORDAS_TRADICIONAL,
      },
      {
        id: 124, productType: 'pizza', allowHalf: true,
        section: 'Pizzas Tradicionais',
        name: 'Baiana',
        description: 'Molho especial, muçarela, calabresa, cebola, pimenta calabresa, azeitona, orégano.',
        price: 52,
        sizes:  [{ id: 'trad', label: 'Tradicional', info: 'Pizza grande', price: 52 }],
        crusts: BORDAS_TRADICIONAL,
      },

      // ═══════════════════════════════════════════════════════════════════════
      // PIZZAS BROTINHO — DOCES
      // ═══════════════════════════════════════════════════════════════════════

      { id: 201, section: 'Pizzas Brotinho Doces', name: 'Ovomaltine',    description: 'Creme de leite, pasta cremosa de ovomaltine, ovomaltine em pó.',           price: 40 },
      { id: 202, section: 'Pizzas Brotinho Doces', name: 'Ninho / Nutella', description: 'Creme de leite, creme de ninho e Nutella.',                              price: 40 },
      { id: 203, section: 'Pizzas Brotinho Doces', name: 'Kit Kat',        description: 'Creme de leite, pasta cremosa de Kit Kat, biscoito de Kit Kat.',           price: 40 },
      { id: 204, section: 'Pizzas Brotinho Doces', name: 'Oreo',           description: 'Creme de leite, pasta cremosa de Galak, biscoito Oreo.',                  price: 40 },
      { id: 205, section: 'Pizzas Brotinho Doces', name: 'Bis',            description: 'Creme de leite, chocolate ao leite, biscoito BIS.',                       price: 40 },
      { id: 206, section: 'Pizzas Brotinho Doces', name: 'Dois Amores',    description: 'Creme de leite, chocolate branco e chocolate ao leite.',                  price: 35 },
      { id: 207, section: 'Pizzas Brotinho Doces', name: 'Banana Nevada',  description: 'Creme de leite, banana em rodelas, chocolate branco, canela em pó.',      price: 35 },
      { id: 208, section: 'Pizzas Brotinho Doces', name: 'Romeu e Julieta', description: 'Muçarela e goiabada.',                                                   price: 35 },
      { id: 209, section: 'Pizzas Brotinho Doces', name: 'Brigadeiro',     description: 'Creme de leite, chocolate ao leite, granulado de chocolate.',             price: 30 },
      { id: 210, section: 'Pizzas Brotinho Doces', name: 'Confete',        description: 'Creme de leite, chocolate ao leite, confetes.',                           price: 30 },

      // ═══════════════════════════════════════════════════════════════════════
      // PIZZAS BROTINHO — SALGADOS (todos R$40, sabor informado nas obs.)
      // ═══════════════════════════════════════════════════════════════════════

      {
        id: 220, section: 'Pizzas Brotinho Salgados',
        name: 'Brotinho Salgado',
        description: 'Todos os sabores R$40. Informe o sabor desejado nas observações do pedido. Bordas: catupiry (+R$8) ou cheddar (+R$10).',
        price: 40,
      },

      // ═══════════════════════════════════════════════════════════════════════
      // PASTÉIS — TRADICIONAIS
      // ═══════════════════════════════════════════════════════════════════════

      { id: 301, section: 'Pastéis Tradicionais', name: 'Carne',                    description: 'Carne.',                                              price: 15 },
      { id: 302, section: 'Pastéis Tradicionais', name: 'Carne / Queijo',           description: 'Carne e muçarela.',                                  price: 18 },
      { id: 303, section: 'Pastéis Tradicionais', name: 'Carne / Bacon',            description: 'Carne e bacon.',                                     price: 17 },
      { id: 304, section: 'Pastéis Tradicionais', name: 'Carne / Catupiry',         description: 'Carne e catupiry.',                                  price: 18 },
      { id: 305, section: 'Pastéis Tradicionais', name: 'Frango / Catupiry',        description: 'Frango e catupiry.',                                 price: 18 },
      { id: 306, section: 'Pastéis Tradicionais', name: 'Frango / Queijo Bacon',    description: 'Frango, muçarela e bacon.',                          price: 20 },
      { id: 307, section: 'Pastéis Tradicionais', name: 'Frango / Cheddar Catupiry', description: 'Frango, cheddar e catupiry.',                      price: 20 },
      { id: 308, section: 'Pastéis Tradicionais', name: 'Moreiras Tudo',            description: 'Presunto, frango, muçarela, bacon, catupiry e milho.', price: 25 },
      { id: 309, section: 'Pastéis Tradicionais', name: 'Pizza',                    description: 'Muçarela, presunto, tomate e orégano.',              price: 18 },
      { id: 310, section: 'Pastéis Tradicionais', name: 'Queijo',                   description: 'Muçarela.',                                          price: 16 },
      { id: 311, section: 'Pastéis Tradicionais', name: 'Brócolis / Queijo',        description: 'Brócolis e muçarela.',                               price: 16 },
      { id: 312, section: 'Pastéis Tradicionais', name: 'Brócolis / Queijo e Bacon', description: 'Brócolis, queijo e bacon.',                        price: 18 },
      { id: 313, section: 'Pastéis Tradicionais', name: 'Palmito',                  description: 'Palmito e muçarela.',                                price: 18 },

      // ═══════════════════════════════════════════════════════════════════════
      // PASTÉIS — DOCES
      // ═══════════════════════════════════════════════════════════════════════

      { id: 321, section: 'Pastéis Doces', name: 'Ninho c/ Nutella',  description: 'Creme de ninho e Nutella.',                             price: 20 },
      { id: 322, section: 'Pastéis Doces', name: 'M&M\'s',            description: 'Chocolate ao leite e M&M\'s.',                         price: 20 },
      { id: 323, section: 'Pastéis Doces', name: 'Banana Nevada',     description: 'Doce de leite, banana e canela em pó.',                 price: 20 },
      { id: 324, section: 'Pastéis Doces', name: 'Nutella',           description: 'Nutella.',                                              price: 20 },
      { id: 325, section: 'Pastéis Doces', name: 'Romeu e Julieta',   description: 'Muçarela e goiabada.',                                  price: 20 },

      // ═══════════════════════════════════════════════════════════════════════
      // CALZONE
      // ═══════════════════════════════════════════════════════════════════════

      { id: 401, section: 'Calzone', name: 'Frango Catupiry', description: 'Muçarela, frango, catupiry, azeitona, orégano.',                                                    price: 45 },
      { id: 402, section: 'Calzone', name: 'Calabresa',       description: 'Muçarela, calabresa, cebola, azeitona, orégano.',                                                   price: 40 },
      { id: 403, section: 'Calzone', name: 'Costela',         description: 'Muçarela, costela, molho barbecue, azeitona, orégano.',                                             price: 45 },
      { id: 404, section: 'Calzone', name: 'Bauru',           description: 'Muçarela, presunto, tomate, azeitona, orégano.',                                                    price: 40 },
      { id: 405, section: 'Calzone', name: 'Moreiras Turbo',  description: 'Muçarela, frango, calabresa, bacon, cheddar, catupiry, tomate, cebola, milho, azeitona, orégano.',  price: 52 },

      // ═══════════════════════════════════════════════════════════════════════
      // ESPETOS
      // ═══════════════════════════════════════════════════════════════════════

      { id: 501, section: 'Espetos', name: 'Espeto de Carne',               description: 'Espeto de carne bovina.',       price: 10 },
      { id: 502, section: 'Espetos', name: 'Medalhão de Frango',            description: 'Medalhão de frango grelhado.',  price: 10 },
      { id: 503, section: 'Espetos', name: 'Medalhão de Mandioca',          description: 'Medalhão de mandioca frito.',   price: 10 },
      { id: 504, section: 'Espetos', name: 'Queijo Espeto',                 description: 'Espeto de queijo grelhado.',    price:  9 },
      { id: 505, section: 'Espetos', name: 'Kafta',                         description: 'Kafta temperada na brasa.',     price:  8 },
      { id: 506, section: 'Espetos', name: 'Coração',                       description: 'Espeto de coração de frango.',  price:  8 },
      { id: 507, section: 'Espetos', name: 'Panceta',                       description: 'Panceta suína grelhada.',       price:  8 },

      // ═══════════════════════════════════════════════════════════════════════
      // BEBIDAS
      // ═══════════════════════════════════════════════════════════════════════

      { id: 601, section: 'Bebidas', name: 'Água sem Gás',          description: 'Garrafa 500ml.',       price: 3  },
      { id: 602, section: 'Bebidas', name: 'Água com Gás',          description: 'Garrafa 500ml.',       price: 3  },
      { id: 603, section: 'Bebidas', name: 'Refrigerante Lata',     description: 'Coca, Guaraná, Fanta. *verificar disponibilidade', price: 5  },
      { id: 604, section: 'Bebidas', name: 'Cerveja Lata',          description: '*verificar disponibilidade.',                      price: 5  },
      { id: 605, section: 'Bebidas', name: 'Coca-Cola 1L',          description: 'Garrafa 1 litro.',     price: 10 },
      { id: 606, section: 'Bebidas', name: 'Guaraná Antartica 1L',  description: 'Garrafa 1 litro.',     price: 10 },
      { id: 607, section: 'Bebidas', name: 'Guaraná Cotuba 1L',     description: 'Garrafa 1 litro.',     price: 10 },
      { id: 608, section: 'Bebidas', name: 'Coca-Cola 2L',          description: 'Garrafa 2 litros.',    price: 13 },
      { id: 609, section: 'Bebidas', name: 'Poty 2L',               description: 'Refrigerante 2 litros.', price: 9 },
    ],
  },
]
