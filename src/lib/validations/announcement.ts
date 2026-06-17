import { z } from 'zod'

export const announcementInputSchema = z.object({
  sectorId: z.string().uuid('Setor inválido'),
  groupId: z.string().uuid('Grupo inválido'),
  message: z.string().min(1, 'Mensagem obrigatória').max(4000, 'Mensagem muito longa'),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida')
})

export type AnnouncementInput = z.infer<typeof announcementInputSchema>
