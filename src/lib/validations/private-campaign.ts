import { z } from 'zod'
import { normalizePhone } from '@/lib/phone'

export const contactInputSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120, 'Nome muito longo'),
  sectorId: z.string().uuid('Setor inválido'),
  phone: z.string().min(8, 'Telefone inválido').max(20, 'Telefone inválido'),
  notes: z.string().max(500, 'Observação muito longa').optional()
}).transform((data, ctx) => {
  const normalized = normalizePhone(data.phone)

  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Telefone inválido. Use DDD + número.',
      path: ['phone']
    })

    return z.NEVER
  }

  return { ...data, phone: normalized }
})

export const contactListInputSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120, 'Nome muito longo'),
  sectorId: z.string().uuid('Setor inválido')
})

export const privateCampaignInputSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120, 'Nome muito longo'),
  sectorId: z.string().uuid('Setor inválido'),
  listId: z.string().uuid('Lista inválida'),
  message: z.string().min(1, 'Mensagem obrigatória').max(4000, 'Mensagem muito longa'),
  scheduleDate: z.string().min(1, 'Data obrigatória'),
  scheduleTime: z.string().min(1, 'Horário obrigatório'),
  intervalSeconds: z.coerce.number().int().min(15, 'Intervalo mínimo: 15 segundos').max(300, 'Intervalo máximo: 300 segundos')
})

export function parseCsvContacts (raw: string): Array<{ name: string; phone: string }> {
  const lines = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const delimiter = lines[0].includes(';') ? ';' : ','
  const rows: Array<{ name: string; phone: string }> = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const parts = line.split(delimiter).map(part => part.trim().replace(/^"|"$/g, ''))

    if (index === 0 && /nome|name|telefone|phone/i.test(line)) {
      continue
    }

    if (parts.length < 2) continue

    const name = parts[0]
    const phone = parts[1]

    if (!name || !phone) continue

    rows.push({ name, phone })
  }

  return rows
}
