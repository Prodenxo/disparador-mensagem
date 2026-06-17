import { z } from 'zod'

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida')

export const announcementInputSchema = z.object({
  sectorId: z.string().uuid('Setor inválido'),
  groupId: z.string().uuid('Grupo inválido'),
  message: z.string().min(1, 'Mensagem obrigatória').max(4000, 'Mensagem muito longa'),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  recurrenceDays: z.coerce.number().int().min(1, 'Mínimo 1 dia').max(90, 'Máximo 90 dias'),
  recurrenceTimes: z.array(timeSchema).min(1, 'Informe ao menos um horário').max(5, 'Máximo 5 horários por dia'),
  mentionAll: z.coerce.boolean().default(true)
})

export type AnnouncementInput = z.infer<typeof announcementInputSchema>

export function parseRecurrenceTimes (raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(item => typeof item === 'string')
  } catch {
    return []
  }
}

export function parseBooleanField (raw: FormDataEntryValue | null): boolean {
  const value = String(raw ?? '').trim().toLowerCase()
  if (value === 'false' || value === '0' || value === 'off') return false
  return true
}
