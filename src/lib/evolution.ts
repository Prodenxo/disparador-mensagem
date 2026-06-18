import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { env } from './env'
import { brazilMobileVariants, phoneToEvolutionNumber } from './phone'
import { LidMapService } from './lid-map'
import {
  applyMentionsToPayload,
  buildMentionJids,
  isBotParticipant,
  resolveParticipantJid
} from './mentions'

function headers () {
  return { apikey: env.evolution.apiKey }
}

function normalizeBaseUrl (url: string): string {
  return url.replace(/\/+$/, '')
}

function instanceUrl (pathSuffix: string): string {
  return `${normalizeBaseUrl(env.evolution.baseUrl)}${pathSuffix}/${env.evolution.instance}`
}

function evolutionErrorDetail (error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'erro desconhecido'
  }

  const status = error.response?.status
  const body = error.response?.data

  if (typeof body === 'string' && body.length > 0) {
    return status ? `${status}: ${body}` : body
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    const nested = record.response

    if (nested && typeof nested === 'object') {
      const nestedMessage = (nested as Record<string, unknown>).message
      if (Array.isArray(nestedMessage) && nestedMessage.length > 0) {
        return status
          ? `${status}: ${nestedMessage.map(String).join(' ')}`
          : nestedMessage.map(String).join(' ')
      }
    }

    const message = record.message ?? record.error
    if (typeof message === 'string' && message.length > 0) {
      return status ? `${status}: ${message}` : message
    }
  }

  return status ? `${status}: ${error.message}` : error.message
}

function extractMessageKey (data: unknown): { id?: string; remoteJid?: string } | null {
  if (!data || typeof data !== 'object') return null

  const record = data as Record<string, unknown>

  if (record.key && typeof record.key === 'object') {
    return record.key as { id?: string; remoteJid?: string }
  }

  if (record.message && typeof record.message === 'object') {
    const message = record.message as Record<string, unknown>

    if (message.key && typeof message.key === 'object') {
      return message.key as { id?: string; remoteJid?: string }
    }
  }

  return null
}

function assertEvolutionSendSuccess (data: unknown, context: string): { messageId: string; remoteJid: string } {
  if (!data || typeof data !== 'object') {
    throw new Error(`${context}: resposta vazia da Evolution API`)
  }

  const record = data as Record<string, unknown>

  if (record.success === false) {
    throw new Error(`${context}: ${String(record.error ?? record.message ?? 'Evolution rejeitou o envio')}`)
  }

  const httpLikeStatus = Number(record.status)
  if (!Number.isNaN(httpLikeStatus) && httpLikeStatus >= 400) {
    throw new Error(`${context}: Evolution retornou status ${httpLikeStatus}`)
  }

  const key = extractMessageKey(record)

  if (!key?.id) {
    const nestedResponse = record.response
    if (nestedResponse && typeof nestedResponse === 'object') {
      const nested = nestedResponse as Record<string, unknown>
      if (nested.message && !record.messageTimestamp) {
        throw new Error(`${context}: ${String(nested.message)}`)
      }
    }

    if (record.error && typeof record.error === 'string') {
      throw new Error(`${context}: ${record.error}`)
    }

    throw new Error(
      `${context}: Evolution não confirmou o envio. Resposta: ${JSON.stringify(record).slice(0, 400)}`
    )
  }

  return {
    messageId: String(key.id),
    remoteJid: String(key.remoteJid || '')
  }
}

function buildPrivateSendTargets (recipient: WhatsAppRecipient): string[] {
  return [phoneToEvolutionNumber(recipient.number)]
}

function sanitizeBase64Media (raw: string): string {
  const trimmed = raw.trim()
  const dataUrlMatch = trimmed.match(/^data:[^;]+;base64,(.+)$/i)
  return (dataUrlMatch ? dataUrlMatch[1] : trimmed).replace(/\s/g, '')
}

function buildPrivateTextPayloads (target: string, text: string): Record<string, unknown>[] {
  const digits = phoneToEvolutionNumber(target)

  return [
    { number: digits, text, linkPreview: false },
    { number: digits, text, options: { linkPreview: false } },
    { number: digits, text }
  ]
}

function buildPrivateMediaPayloads (
  target: string,
  base64: string,
  fileName: string,
  mimetype: string,
  caption: string
): Record<string, unknown>[] {
  const media = sanitizeBase64Media(base64)
  const digits = phoneToEvolutionNumber(target)

  const base = {
    number: digits,
    mediatype: 'image',
    mimetype,
    caption,
    media,
    fileName
  }

  return [
    base,
    { ...base, number: target.replace(/@.+$/, '') || digits }
  ]
}

async function postPrivateMessage (
  payloads: Record<string, unknown>[],
  endpoint: '/message/sendText' | '/message/sendMedia',
  context: string
): Promise<{ messageId: string; remoteJid: string }> {
  let lastError: unknown

  for (const payload of payloads) {
    try {
      const response = await axios.post(
        instanceUrl(endpoint),
        payload,
        { headers: headers(), timeout: 60_000 }
      )

      const key = assertEvolutionSendSuccess(response.data, context)

      console.log(
        `[EVOLUTION] ${context} OK (${endpoint}, number=${String(payload.number)}): id=${key.messageId}, remoteJid=${key.remoteJid}`
      )

      return key
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error(`${context}: falha ao enviar via Evolution`)
}

export async function assertEvolutionInstanceConnected (): Promise<string> {
  const response = await axios.get(instanceUrl('/instance/connectionState'), {
    headers: headers(),
    timeout: 15_000
  })

  const data = response.data as Record<string, unknown>
  const instance = data.instance as Record<string, unknown> | undefined
  const state = String(instance?.state ?? data.state ?? 'unknown')
  const owner = String(
    instance?.owner
    ?? instance?.wuid
    ?? data.owner
    ?? data.wuid
    ?? ''
  )

  if (state !== 'open') {
    throw new Error(`WhatsApp desconectado na Evolution (state: ${state})`)
  }

  return owner
}

export interface WhatsAppRecipient {
  number: string
  jid: string | null
  exists: boolean
}

export async function resolveWhatsAppRecipient (rawPhone: string): Promise<WhatsAppRecipient> {
  const candidates = brazilMobileVariants(rawPhone)

  for (const candidate of candidates) {
    try {
      const response = await axios.post(
        instanceUrl('/chat/whatsappNumbers'),
        { numbers: [candidate] },
        { headers: headers(), timeout: 15000 }
      )

      const list = Array.isArray(response.data) ? response.data : []

      for (const item of list) {
        const row = item as Record<string, unknown>

        if (row.exists !== true) continue

        let number = phoneToEvolutionNumber(String(row.number || candidate))
        let jid = typeof row.jid === 'string' ? row.jid : null

        if (jid?.includes('@lid')) {
          const resolved = await resolveJid(jid)
          if (resolved.includes('@s.whatsapp.net')) {
            jid = resolved
            number = phoneToEvolutionNumber(resolved)
          }
        }

        return { number, jid, exists: true }
      }
    } catch {
      continue
    }
  }

  return {
    number: phoneToEvolutionNumber(rawPhone),
    jid: null,
    exists: false
  }
}

async function fetchEvolutionInstanceNames (): Promise<string[]> {
  try {
    const response = await axios.get(
      `${normalizeBaseUrl(env.evolution.baseUrl)}/instance/fetchInstances`,
      { headers: headers(), timeout: 15000 }
    )

    const list = Array.isArray(response.data) ? response.data : []

    return list
      .map(item => String((item as Record<string, unknown>).name || ''))
      .filter(Boolean)
  } catch {
    return []
  }
}

export interface EvolutionGroup {
  jid: string
  name: string
  participantCount: number
}

type ParticipantRecord = Record<string, unknown>

function extractParticipants (data: unknown): ParticipantRecord[] {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data as ParticipantRecord[]

  const obj = data as Record<string, unknown>
  for (const key of ['participants', 'participantsData']) {
    if (Array.isArray(obj[key])) {
      return obj[key] as ParticipantRecord[]
    }
  }

  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      return obj[key] as ParticipantRecord[]
    }
  }

  return []
}

async function getContact (numberOrJid: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await axios.post(
      instanceUrl('/contact/getContact'),
      { number: numberOrJid },
      { headers: headers() }
    )
    return (response.data?.contact || response.data) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function resolveJid (jid: string): Promise<string> {
  if (!jid || !jid.includes('@lid')) return jid

  const cached = LidMapService.get(jid)
  if (cached) return cached

  const contact = await getContact(jid)
  if (!contact) return jid

  const fields = [
    contact.phoneNumber,
    contact.phone_number,
    contact.number,
    contact.jid,
    contact.id,
    contact.realJid
  ]

  const realJid = fields.find(
    field => typeof field === 'string' && field.includes('@s.whatsapp.net')
  )

  if (typeof realJid === 'string') {
    LidMapService.set(jid, realJid)
    return realJid
  }

  const rawNum = fields.find(field => {
    if (!field) return false
    const value = String(field)
    return !value.includes('@lid') && !value.includes('@g.us')
  })

  if (rawNum) {
    const num = String(rawNum).split('@')[0]
    if (/^\d{8,15}$/.test(num)) {
      const formattedJid = `${num}@s.whatsapp.net`
      LidMapService.set(jid, formattedJid)
      return formattedJid
    }
  }

  return jid
}

async function fetchRawParticipants (groupJid: string): Promise<ParticipantRecord[]> {
  const urls = [
    `${instanceUrl('/group/participants')}?groupJid=${encodeURIComponent(groupJid)}`,
    `${instanceUrl('/group/getParticipants')}?groupJid=${encodeURIComponent(groupJid)}`
  ]

  for (const url of urls) {
    try {
      const response = await axios.get(url, { headers: headers() })
      const participants = extractParticipants(response.data)
      if (participants.length > 0) return participants
    } catch {
      continue
    }
  }

  throw new Error(`Não foi possível listar participantes do grupo ${groupJid}`)
}

export async function fetchResolvedGroupParticipants (groupJid: string): Promise<string[]> {
  const rawParticipants = await fetchRawParticipants(groupJid)
  const resolved: string[] = []

  for (const participant of rawParticipants) {
    const jid = await resolveParticipantJid(participant, resolveJid)
    if (jid) resolved.push(jid)
  }

  return Array.from(new Set(resolved))
}

export async function fetchMentionJidsForGroup (groupJid: string): Promise<{
  participantCount: number
  participants: string[]
  mentionJids: string[]
}> {
  const botJid = await getBotJid()
  const allParticipants = await fetchResolvedGroupParticipants(groupJid)
  const participants = allParticipants.filter(jid => !isBotParticipant(jid, botJid))
  const mentionJids = await buildMentionJids(participants)

  console.log(
    `[EVOLUTION] Grupo ${groupJid}: ${participants.length} participantes, ${mentionJids.length} JIDs de menção`
  )

  return {
    participantCount: participants.length,
    participants,
    mentionJids
  }
}

export async function fetchAllGroups (): Promise<EvolutionGroup[]> {
  const urls = [
    `${instanceUrl('/group/fetchAllGroups')}?getParticipants=false`,
    `${instanceUrl('/group/fetchAllGroup')}?getParticipants=false`
  ]

  let lastError: unknown

  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        headers: headers(),
        timeout: 180000
      })

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.groups || response.data?.data || response.data?.response || [])

      if (!Array.isArray(raw)) {
        throw new Error('Resposta inesperada da Evolution API')
      }

      return raw.map((g: Record<string, unknown>) => {
        const participants = g.participants
        const countFromParticipants = Array.isArray(participants) ? participants.length : 0

        return {
          jid: String(g.id || g.jid || ''),
          name: String(g.subject || g.name || 'Grupo sem nome'),
          participantCount: Number(g.size || countFromParticipants || 0)
        }
      }).filter((g: EvolutionGroup) => g.jid.includes('@g.us'))
    } catch (error) {
      lastError = error
      continue
    }
  }

  throw new Error(await buildFetchAllGroupsError(lastError))
}

async function buildFetchAllGroupsError (lastError: unknown): Promise<string> {
  const detail = evolutionErrorDetail(lastError)
  let message = `Não foi possível listar grupos na Evolution API (${detail})`

  if (axios.isAxiosError(lastError) && lastError.response?.status === 404) {
    const available = await fetchEvolutionInstanceNames()
    message += `. EVOLUTION_INSTANCE_NAME atual: "${env.evolution.instance}"`

    if (available.length > 0) {
      message += `. Instâncias disponíveis: ${available.join(', ')}`
    }
  }

  return message
}

/** @deprecated Use fetchResolvedGroupParticipants */
export async function fetchGroupParticipants (groupJid: string): Promise<string[]> {
  return fetchResolvedGroupParticipants(groupJid)
}

export async function getBotJid (): Promise<string> {
  const response = await axios.get(instanceUrl('/instance/connectionState'), {
    headers: headers()
  })
  return String(response.data?.instance?.owner || '')
}

export async function sendTextWithMentions (
  groupJid: string,
  text: string,
  mentions: string[]
): Promise<void> {
  const mentionJids = await buildMentionJids(mentions)

  const payload: Record<string, unknown> = {
    number: groupJid,
    text,
    options: { linkPreview: false }
  }

  applyMentionsToPayload(payload, mentionJids)

  await axios.post(instanceUrl('/message/sendText'), payload, { headers: headers() })
}

export async function sendTextPrivateToRecipient (
  recipient: WhatsAppRecipient,
  text: string
): Promise<{ messageId: string; remoteJid: string }> {
  const targets = buildPrivateSendTargets(recipient)
  let lastError: unknown

  for (const target of targets) {
    try {
      return await postPrivateMessage(
        buildPrivateTextPayloads(target, text),
        '/message/sendText',
        `Envio privado para ${target}`
      )
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error) throw lastError
  throw new Error('Falha ao enviar mensagem privada')
}

/** @deprecated Use sendTextPrivateToRecipient */
export async function sendTextPrivate (
  phone: string,
  text: string
): Promise<void> {
  await sendTextPrivateToRecipient(
    { number: phone, jid: `${phone.replace(/\D/g, '')}@s.whatsapp.net`, exists: true },
    text
  )
}

export async function sendMediaPrivateFromBase64ToRecipient (
  recipient: WhatsAppRecipient,
  base64: string,
  fileName: string,
  mimetype: string,
  caption: string
): Promise<{ messageId: string; remoteJid: string }> {
  const targets = buildPrivateSendTargets(recipient)
  let lastError: unknown

  for (const target of targets) {
    try {
      return await postPrivateMessage(
        buildPrivateMediaPayloads(target, base64, fileName, mimetype, caption),
        '/message/sendMedia',
        `Mídia privada para ${target}`
      )
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error) throw lastError
  throw new Error('Falha ao enviar mídia privada')
}

/** @deprecated Use sendMediaPrivateFromBase64ToRecipient */
export async function sendMediaPrivateFromBase64 (
  phone: string,
  base64: string,
  fileName: string,
  mimetype: string,
  caption: string
): Promise<void> {
  await sendMediaPrivateFromBase64ToRecipient(
    { number: phone, jid: `${phone.replace(/\D/g, '')}@s.whatsapp.net`, exists: true },
    base64,
    fileName,
    mimetype,
    caption
  )
}

export async function sendMediaPrivateToRecipient (
  recipient: WhatsAppRecipient,
  imagePath: string,
  caption: string
): Promise<{ messageId: string; remoteJid: string }> {
  const base64 = fs.readFileSync(imagePath).toString('base64')
  const fileName = path.basename(imagePath)
  return sendMediaPrivateFromBase64ToRecipient(
    recipient,
    base64,
    fileName,
    'image/jpeg',
    caption
  )
}

/** @deprecated Use sendMediaPrivateToRecipient */
export async function sendMediaPrivate (
  phone: string,
  imagePath: string,
  caption: string
): Promise<void> {
  await sendMediaPrivateToRecipient(
    { number: phone, jid: `${phone.replace(/\D/g, '')}@s.whatsapp.net`, exists: true },
    imagePath,
    caption
  )
}

export async function sendMediaWithMentionsFromBase64 (
  groupJid: string,
  base64: string,
  fileName: string,
  mimetype: string,
  caption: string,
  mentions: string[]
): Promise<void> {
  const mentionJids = await buildMentionJids(mentions)

  const payload: Record<string, unknown> = {
    number: groupJid,
    mediatype: 'image',
    mimetype,
    caption,
    media: base64,
    fileName
  }

  applyMentionsToPayload(payload, mentionJids)

  await axios.post(instanceUrl('/message/sendMedia'), payload, { headers: headers() })
}

export async function sendMediaWithMentions (
  groupJid: string,
  imagePath: string,
  caption: string,
  mentions: string[]
): Promise<void> {
  const mentionJids = await buildMentionJids(mentions)
  const base64 = fs.readFileSync(imagePath).toString('base64')
  const fileName = path.basename(imagePath)

  const payload: Record<string, unknown> = {
    number: groupJid,
    mediatype: 'image',
    mimetype: 'image/jpeg',
    caption,
    media: base64,
    fileName
  }

  applyMentionsToPayload(payload, mentionJids)

  await axios.post(instanceUrl('/message/sendMedia'), payload, { headers: headers() })
}
