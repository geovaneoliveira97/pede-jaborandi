// src/components/ImageUpload.tsx

import { useRef, useState, useCallback } from 'react'
import { uploadImage } from '../lib/storageApi'

interface ImageUploadProps {
  value:       string
  onChange:    (url: string) => void
  folder:      'stores' | 'products' | 'temp'
  id?:         number
  label?:      string
  placeholder?: string
}

export default function ImageUpload({
  value, onChange, folder, id, label = 'Foto', placeholder = 'URL da imagem (opcional)',
}: ImageUploadProps) {
  const inputRef               = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setUploading(true)
    const { url, error: err } = await uploadImage(file, folder, id)
    setUploading(false)
    if (err) { setError(err); return }
    if (url) onChange(url)
  }, [folder, id, onChange])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="space-y-2">
      {label && <label className="form-label">{label}</label>}

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="relative rounded-2xl overflow-hidden flex items-center justify-center"
        style={{
          height: '120px',
          border: '2px dashed var(--md-outline-variant)',
          background: 'var(--md-surface-high)',
          cursor: uploading ? 'wait' : 'pointer',
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        aria-label="Clique ou arraste uma imagem"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.55)' }}>
              <span className="text-2xl">📷</span>
              <span className="text-xs font-bold text-white">Trocar foto</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 pointer-events-none">
            {uploading ? (
              <>
                <span className="text-2xl animate-pulse">⏳</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--md-on-surface-variant)' }}>Enviando...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">📷</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--md-on-surface-variant)' }}>
                  Clique ou arraste uma foto
                </span>
                <span className="text-[10px]" style={{ color: 'var(--md-on-surface-variant)', opacity: 0.7 }}>
                  JPG, PNG ou WebP · máx. 2MB
                </span>
              </>
            )}
          </div>
        )}
        {uploading && value && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <span className="text-2xl animate-pulse">⏳</span>
          </div>
        )}
      </div>

      {error && <p className="text-xs font-semibold" style={{ color: 'var(--md-error)' }}>{error}</p>}

      <input type="url" className="form-input w-full" placeholder={placeholder}
        value={value} onChange={e => { setError(null); onChange(e.target.value) }} disabled={uploading} />

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden" onChange={handleInputChange} aria-label="Selecionar arquivo de imagem" />
    </div>
  )
}
