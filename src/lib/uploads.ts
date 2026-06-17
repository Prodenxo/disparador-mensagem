import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { env } from '@/lib/env'

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const uploadFilenamePattern = /^[0-9a-f-]{36}\.(jpg|png|webp)$/

export function getUploadDir (): string {
  const dir = env.uploadDir
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir)
}

export function isValidUploadFilename (filename: string): boolean {
  return uploadFilenamePattern.test(filename)
}

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
      `Imagem não encontrada em ${resolved}. Configure volume /app/uploads no web e worker, ou APP_URL + AUTH_SECRET no worker.`
    )
  }
}

function getWebFetchBaseUrls (): string[] {
  const urls = [
    env.internalAppUrl,
    env.appUrl !== 'http://localhost:3000' ? env.appUrl : '',
    'http://disparadordemensagem:3000'
  ]
    .filter(Boolean)
    .map((url) => url.replace(/\/$/, ''))

  return [...new Set(urls)]
}

function formatFetchError (url: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const cause = error instanceof Error && error.cause instanceof Error
    ? ` — ${error.cause.message}`
    : ''

  return `${url}: ${message}${cause}`
}

async function fetchImageFromWeb (filename: string, localPath: string): Promise<string> {
  if (!env.authSecret) {
    throw new Error('AUTH_SECRET não configurado no worker para buscar imagem do web')
  }

  const baseUrls = getWebFetchBaseUrls()

  if (baseUrls.length === 0) {
    throw new Error(
      'APP_URL ou INTERNAL_APP_URL não configurado no worker. ' +
      'Use a URL pública do web, ex.: https://central-de-publicacoes-disparadordemensagem.4tnf3f.easypanel.host'
    )
  }

  const errors: string[] = []

  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}/api/internal/uploads/${filename}`

    try {
      const response = await fetch(url, {
        headers: { 'x-internal-secret': env.authSecret },
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        errors.push(`${url}: HTTP ${response.status}`)
        continue
      }

      const tmpPath = path.join(os.tmpdir(), filename)
      const buffer = Buffer.from(await response.arrayBuffer())
      await fs.writeFile(tmpPath, buffer)
      console.log(`[UPLOAD] Imagem obtida do web: ${url}`)
      return tmpPath
    } catch (error) {
      errors.push(formatFetchError(url, error))
    }
  }

  throw new Error(
    `Imagem não encontrada em ${localPath} e falha ao buscar no web. ` +
    `Tentativas: ${errors.join(' | ')}`
  )
}

export async function resolveAnnouncementImagePath (storedPath: string): Promise<string> {
  const resolved = resolveUploadPath(storedPath)

  try {
    await fs.access(resolved)
    return resolved
  } catch {
    const filename = path.basename(storedPath)

    if (!isValidUploadFilename(filename)) {
      throw new Error(`Caminho de imagem inválido: ${storedPath}`)
    }

    return fetchImageFromWeb(filename, resolved)
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

  const uploadDir = getUploadDir()
  await fs.mkdir(uploadDir, { recursive: true })

  const filePath = path.join(uploadDir, `${randomUUID()}${extension}`)
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  return filePath
}
