import path from 'path'
import {
  sendMediaPrivate,
  sendMediaPrivateFromBase64,
  sendTextPrivate
} from '@/lib/evolution'
import { phoneToEvolutionNumber } from '@/lib/phone'
import { resolveAnnouncementImagePath } from '@/lib/uploads'

export interface PrivateDispatchInput {
  phone: string
  message: string
  imagePath?: string | null
  image?: {
    data: string
    mime: string
  } | null
}

export async function dispatchPrivateMessage (input: PrivateDispatchInput): Promise<void> {
  const number = phoneToEvolutionNumber(input.phone)

  if (input.image?.data) {
    const extension = input.image.mime.split('/')[1] || 'jpg'
    const fileName = input.imagePath
      ? path.basename(input.imagePath)
      : `image.${extension}`

    await sendMediaPrivateFromBase64(
      number,
      input.image.data,
      fileName,
      input.image.mime,
      input.message
    )
    return
  }

  if (input.imagePath) {
    const resolvedPath = await resolveAnnouncementImagePath(input.imagePath)
    await sendMediaPrivate(number, resolvedPath, input.message)
    return
  }

  await sendTextPrivate(number, input.message)
}

export function sleep (ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
