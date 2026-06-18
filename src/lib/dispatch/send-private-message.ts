import path from 'path'
import {
  resolveWhatsAppRecipient,
  sendMediaPrivate,
  sendMediaPrivateFromBase64,
  sendTextPrivate
} from '@/lib/evolution'
import { formatPhoneDisplay, phoneToEvolutionNumber } from '@/lib/phone'
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

export interface PrivateDispatchResult {
  targetNumber: string
  displayPhone: string
}

export async function dispatchPrivateMessage (
  input: PrivateDispatchInput
): Promise<PrivateDispatchResult> {
  const recipient = await resolveWhatsAppRecipient(input.phone)

  if (!recipient.exists) {
    const display = formatPhoneDisplay(phoneToEvolutionNumber(input.phone))
    throw new Error(
      `O número ${display} não foi encontrado no WhatsApp. Confira DDD e o 9 do celular.`
    )
  }

  const targetNumber = recipient.number

  if (input.image?.data) {
    const extension = input.image.mime.split('/')[1] || 'jpg'
    const fileName = input.imagePath
      ? path.basename(input.imagePath)
      : `image.${extension}`

    await sendMediaPrivateFromBase64(
      targetNumber,
      input.image.data,
      fileName,
      input.image.mime,
      input.message
    )
  } else if (input.imagePath) {
    const resolvedPath = await resolveAnnouncementImagePath(input.imagePath)
    await sendMediaPrivate(targetNumber, resolvedPath, input.message)
  } else {
    await sendTextPrivate(targetNumber, input.message)
  }

  return {
    targetNumber,
    displayPhone: formatPhoneDisplay(targetNumber)
  }
}

export function sleep (ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
