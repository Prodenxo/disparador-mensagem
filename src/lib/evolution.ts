import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { env } from './env'
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
