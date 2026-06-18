import path from 'path'
import {
  assertEvolutionInstanceConnected,
  resolveWhatsAppRecipient,
  sendMediaPrivateFromBase64ToRecipient,
  sendMediaPrivateToRecipient,
  sendTextPrivateToRecipient,
  type WhatsAppRecipient
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
  messageId: string
  remoteJid: string
  senderJid: string
}

async function sendToRecipient (
  recipient: WhatsAppRecipient,
  input: PrivateDispatchInput
): Promise<{ messageId: string; remoteJid: string }> {
  if (input.image?.data) {
    const extension = input.image.mime.split('/')[1] || 'jpg'
    const fileName = input.imagePath
      ? path.basename(input.imagePath)
      : `image.${extension}`

    return sendMediaPrivateFromBase64ToRecipient(
      recipient,
      input.image.data,
      fileName,
      input.image.mime,
      input.message
    )
  }

  if (input.imagePath) {
    const resolvedPath = await resolveAnnouncementImagePath(input.imagePath)
    return sendMediaPrivateToRecipient(recipient, resolvedPath, input.message)
  }

  return sendTextPrivateToRecipient(recipient, input.message)
}

export async function dispatchPrivateMessage (
  input: PrivateDispatchInput
): Promise<PrivateDispatchResult> {
  const senderJid = await assertEvolutionInstanceConnected()
  const recipient = await resolveWhatsAppRecipient(input.phone)

  if (!recipient.exists) {
    const display = formatPhoneDisplay(phoneToEvolutionNumber(input.phone))
    throw new Error(
      `O número ${display} não foi encontrado no WhatsApp. Confira DDD e o 9 do celular.`
    )
  }

  const delivery = await sendToRecipient(recipient, input)
  const targetNumber = recipient.number

  return {
    targetNumber,
    displayPhone: formatPhoneDisplay(targetNumber),
    messageId: delivery.messageId,
    remoteJid: delivery.remoteJid,
    senderJid
  }
}

export function sleep (ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
