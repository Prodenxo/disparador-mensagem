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
  sentText: boolean
  sentImage: boolean
}

function normalizeDelivery (
  delivery: { messageId?: string; id?: string; remoteJid?: string }
): { messageId: string; remoteJid: string } {
  const messageId = delivery.messageId || delivery.id || ''

  if (!messageId) {
    throw new Error('Evolution não retornou ID da mensagem')
  }

  return {
    messageId,
    remoteJid: delivery.remoteJid || ''
  }
}

async function sendOptionalImage (
  recipient: WhatsAppRecipient,
  input: PrivateDispatchInput
): Promise<boolean> {
  if (input.image?.data) {
    const extension = input.image.mime.split('/')[1] || 'jpg'
    const fileName = input.imagePath
      ? path.basename(input.imagePath)
      : `image.${extension}`

    await sendMediaPrivateFromBase64ToRecipient(
      recipient,
      input.image.data,
      fileName,
      input.image.mime,
      ''
    )
    return true
  }

  if (input.imagePath) {
    const resolvedPath = await resolveAnnouncementImagePath(input.imagePath)
    await sendMediaPrivateToRecipient(recipient, resolvedPath, '')
    return true
  }

  return false
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

  const hasImage = Boolean(input.image?.data || input.imagePath)

  console.log(
    `[PRIVATE] Enviando para ${formatPhoneDisplay(recipient.number)} (texto${hasImage ? ' + imagem' : ''})`
  )

  const textDelivery = normalizeDelivery(
    await sendTextPrivateToRecipient(recipient, input.message)
  )

  let sentImage = false

  if (hasImage) {
    try {
      sentImage = await sendOptionalImage(recipient, input)
      console.log(`[PRIVATE] Imagem enviada para ${formatPhoneDisplay(recipient.number)}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(
        `[PRIVATE] Texto enviado, mas imagem falhou para ${formatPhoneDisplay(recipient.number)}: ${message}`
      )
    }
  }

  return {
    targetNumber: recipient.number,
    displayPhone: formatPhoneDisplay(recipient.number),
    messageId: textDelivery.messageId,
    remoteJid: textDelivery.remoteJid,
    senderJid,
    sentText: true,
    sentImage
  }
}

export function sleep (ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
