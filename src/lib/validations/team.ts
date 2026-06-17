import { z } from 'zod'

export const createTeamMemberSchema = z.object({
  sectorId: z.string().uuid('Setor inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  role: z.enum(['SECTOR_ADMIN', 'EMPLOYEE']),
  canCreateAnnouncements: z.boolean().default(false)
})

export const updateTeamMemberSchema = z.object({
  sectorId: z.string().uuid('Setor inválido'),
  role: z.enum(['SECTOR_ADMIN', 'EMPLOYEE']),
  canCreateAnnouncements: z.boolean().default(false)
})

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>
