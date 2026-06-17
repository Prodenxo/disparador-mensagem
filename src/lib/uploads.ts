import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { env } from '@/lib/env'

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function resolveUploadPath (storedPath: string): string {
  if (path.isAbsolute(storedPath)) return storedPath
  return path.resolve(process.cwd(), storedPath)
}

export async function assertUploadExists (storedPath: string): Promise<string> {
  const resolved = resolveUploadPath(storedPath)

  try {
    await fs.access(resolved)
    return resolved
  } catch {
    throw new Error(
      'Imagem não encontrada no worker. Configure o volume compartilhado "uploads" entre web e worker no Easypanel.'
    )
  }
}

export async function saveAnnouncementImage (file: File): Promise<string> {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error('Formato de imagem inválido. Use JPG, PNG ou WebP.')
  }

  const maxBytes = env.maxImageSizeMb * 1024 * 1024

  if (file.size > maxBytes) {
    throw new Error(`Imagem maior que ${env.maxImageSizeMb}MB`)
  }

  const extension = file.type === 'image/png'
    ? '.png'
    : file.type === 'image/webp'
      ? '.webp'
      : '.jpg'

  await fs.mkdir(env.uploadDir, { recursive: true })

  const filePath = path.join(env.uploadDir, `${randomUUID()}${extension}`)
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  return filePath
}
