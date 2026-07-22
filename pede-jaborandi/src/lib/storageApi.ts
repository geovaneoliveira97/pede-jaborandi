// src/lib/storageApi.ts

import { getSupabase, isSupabaseConfigured } from './supabase'

const BUCKET = 'images'
const MAX_SIZE_MB = 2
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export interface UploadResult {
  url:   string | null
  error: string | null
}

function fileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type))
    return 'Formato inválido. Use JPG, PNG, WebP ou GIF.'
  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return `Imagem muito grande. Máximo ${MAX_SIZE_MB}MB.`
  return null
}

export async function uploadImage(
  file: File,
  folder: 'stores' | 'products' | 'temp',
  id?: number,
): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return { url: `https://placehold.co/400x300?text=${encodeURIComponent(file.name)}`, error: null }
  }
  const validationError = validateFile(file)
  if (validationError) return { url: null, error: validationError }

  const ext  = fileExtension(file)
  const ts   = Date.now()
  const path = id ? `${folder}/${id}/${ts}.${ext}` : `${folder}/${ts}.${ext}`

  const { error: uploadError } = await getSupabase()
    .storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { url: null, error: `Erro no upload: ${uploadError.message}` }

  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
