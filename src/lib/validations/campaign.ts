import { z } from 'zod'

export const campaignInputSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120, 'Nome muito longo'),
  sectorId: z.string().uuid('Setor inválido'),
  groupId: z.string().uuid('Grupo inválido'),
  message: z.string().min(1, 'Mensagem obrigatória').max(4000, 'Mensagem muito longa'),
  mentionAll: z.coerce.boolean().default(true),
  intervalValue: z.coerce.number().int().min(1, 'Intervalo mínimo: 1'),
  intervalUnit: z.enum(['minutes', 'hours'], { errorMap: () => ({ message: 'Unidade inválida' }) })
})

export type CampaignInput = z.infer<typeof campaignInputSchema>

export function intervalToMinutes (value: number, unit: 'minutes' | 'hours'): number {
  return unit === 'hours' ? value * 60 : value
}

export function formatIntervalLabel (intervalMinutes: number): string {
  if (intervalMinutes % 60 === 0 && intervalMinutes >= 60) {
    const hours = intervalMinutes / 60
    return `${hours} hora${hours === 1 ? '' : 's'}`
  }

  return `${intervalMinutes} minuto${intervalMinutes === 1 ? '' : 's'}`
}

export function parseBooleanField (raw: FormDataEntryValue | null): boolean {
  const value = String(raw ?? '').trim().toLowerCase()
  if (value === 'false' || value === '0' || value === 'off') return false
  return true
}

export function parseRemoveImageField (raw: FormDataEntryValue | null): boolean {
  return String(raw ?? '').trim().toLowerCase() === 'true'
}

export function splitInterval (intervalMinutes: number): {
  value: number
  unit: 'minutes' | 'hours'
} {
  if (intervalMinutes % 60 === 0 && intervalMinutes >= 60) {
    return { value: intervalMinutes / 60, unit: 'hours' }
  }

  return { value: intervalMinutes, unit: 'minutes' }
}
