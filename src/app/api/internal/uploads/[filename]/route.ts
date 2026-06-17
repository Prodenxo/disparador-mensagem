import fs from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { getUploadDir, isValidUploadFilename } from '@/lib/uploads'

export async function GET (
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const secret = request.headers.get('x-internal-secret')

  if (!secret || secret !== env.authSecret) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { filename } = await context.params

  if (!isValidUploadFilename(filename)) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const filePath = path.join(getUploadDir(), filename)

  try {
    const buffer = await fs.readFile(filePath)
    const ext = path.extname(filename).slice(1)
    const mime = ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=3600'
      }
    })
  } catch {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }
}
