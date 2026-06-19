// src/lib/viacep.ts
//
// Cliente para a API ViaCEP (https://viacep.com.br).
//
// ViaCEP é gratuita, sem chave de API e mantida pelo governo brasileiro.
// Retorna logradouro, bairro, cidade e UF a partir de um CEP.
// Cobre todos os CEPs do Brasil — ideal para uso em pequenas cidades.
//
// Fluxo no app:
//   1. Usuário digita o CEP (8 dígitos)
//   2. Hook useAddressByCep dispara automaticamente a busca
//   3. Campos de logradouro, bairro e cidade são preenchidos automaticamente
//   4. Usuário preenche apenas o número e o complemento

export interface ViaCepResponse {
  cep:         string
  logradouro:  string   // nome da rua (ex: "Rua das Flores")
  complemento: string
  bairro:      string
  localidade:  string   // nome da cidade
  uf:          string   // sigla do estado
  erro?:       true     // presente quando o CEP não é encontrado
}

// Remove qualquer caractere não-numérico do CEP antes de consultar
function sanitizeCep(cep: string): string {
  return cep.replace(/\D/g, '')
}

// Erro customizado para distinguir "CEP não encontrado" de falha de rede
export class CepNotFoundError extends Error {
  constructor() {
    super('CEP não encontrado')
    this.name = 'CepNotFoundError'
  }
}

// Busca o endereço pelo CEP.
// Lança CepNotFoundError se o CEP for inválido ou não existir.
// Lança Error genérico em caso de falha de rede.
export async function fetchAddressByCep(rawCep: string): Promise<ViaCepResponse> {
  const cep = sanitizeCep(rawCep)

  if (cep.length !== 8) {
    throw new CepNotFoundError()
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    signal: AbortSignal.timeout(8000), // timeout de 8s
  })

  if (!response.ok) {
    throw new Error(`Erro na requisição: ${response.status}`)
  }

  const data: ViaCepResponse = await response.json()

  // A API retorna { erro: true } para CEPs válidos mas inexistentes
  if (data.erro) {
    throw new CepNotFoundError()
  }

  return data
}
