import { LidMapService } from './lid-map'

type ParticipantRecord = Record<string, unknown>

function participantId (participant: ParticipantRecord): string {
  return String(participant.id || participant.jid || '')
}

function participantFields (participant: ParticipantRecord): string[] {
  return [
    participant.jid,
    participant.id,
    participant.realJid,
    participant.phoneNumber,
    participant.phone_number,
    participant.number,
    participant.phone
  ].filter((field): field is string => typeof field === 'string' && field.length > 0)
}

export function normalizeJid (value: string): string {
  if (value.includes('@')) return value
  return `${value}@s.whatsapp.net`
}

export function participantKey (jid: string): string {
  const mapped = jid.includes('@lid') ? LidMapService.get(jid) : null
  if (mapped) return mapped.split('@')[0]
  return jid.split('@')[0]
}

export function isSameParticipant (a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  return participantKey(a) === participantKey(b)
}

export function isBotParticipant (jid: string, botJid: string): boolean {
  if (!botJid) return false
  if (isSameParticipant(jid, botJid)) return true

  const botLid = LidMapService.getLid(botJid)
  if (botLid && isSameParticipant(jid, botLid)) return true

  const mappedReal = LidMapService.get(jid)
  if (mappedReal && isSameParticipant(mappedReal, botJid)) return true

  return false
}

export async function resolveParticipantJid (
  participant: ParticipantRecord,
  resolveJid: (jid: string) => Promise<string>
): Promise<string | null> {
  let jid = participantId(participant)
  if (!jid || jid.includes('@g.us')) return null

  const fields = participantFields(participant)
  const realJidCandidate = fields.find(field => field.includes('@s.whatsapp.net'))

  if (realJidCandidate) {
    const lidCandidate = fields.find(field => field.includes('@lid'))
    if (lidCandidate) {
      LidMapService.set(lidCandidate, realJidCandidate)
    }
    return realJidCandidate
  }

  const rawNum = fields.find(field => {
    const value = String(field)
    if (value.includes('@lid') || value.includes('@g.us')) return false
    if (jid.includes('@lid') && jid.startsWith(value)) return false
    return true
  })

  if (rawNum) {
    const num = rawNum.split('@')[0]
    if (/^\d{8,15}$/.test(num)) {
      return `${num}@s.whatsapp.net`
    }
    if (jid.includes('@lid')) {
      return resolveJid(jid)
    }
  }

  if (jid.includes('@lid')) {
    return resolveJid(jid)
  }

  return normalizeJid(jid)
}

export async function buildMentionJids (participants: string[]): Promise<string[]> {
  const finalMentions: string[] = []

  for (const raw of participants) {
    if (!raw) continue

    let jid = raw
    if (!jid.includes('@')) {
      jid = `${jid}@s.whatsapp.net`
    }

    let realJid = jid
    let lid = jid

    if (jid.endsWith('@lid')) {
      const resolved = LidMapService.get(jid)
      if (resolved) realJid = resolved
    } else if (jid.endsWith('@s.whatsapp.net')) {
      const resolvedLid = LidMapService.getLid(jid)
      if (resolvedLid) lid = resolvedLid
    }

    finalMentions.push(realJid)
    if (lid !== realJid) {
      finalMentions.push(lid)
    }
  }

  return Array.from(new Set(finalMentions.filter(Boolean)))
}

export function applyMentionsToPayload (
  payload: Record<string, unknown>,
  mentionJids: string[]
): void {
  if (mentionJids.length === 0) return

  payload.mentions = mentionJids
  payload.mentioned = mentionJids
  payload.options = {
    linkPreview: false,
    mentions: {
      everyOne: false,
      mentioned: mentionJids
    }
  }
}
