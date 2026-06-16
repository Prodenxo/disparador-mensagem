import { z } from 'zod'

export const sectorAssignmentSchema = z.object({
  sectorId: z.string().uuid('Setor inválido'),
  role: z.enum(['SECTOR_ADMIN', 'EMPLOYEE']),
  canCreateAnnouncements: z.boolean().default(false)
})

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  isSuperAdmin: z.boolean().default(false),
  active: z.boolean().default(true),
  sectorAssignments: z.array(sectorAssignmentSchema).default([])
})

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').optional().or(z.literal('')),
  isSuperAdmin: z.boolean().default(false),
  active: z.boolean().default(true),
  sectorAssignments: z.array(sectorAssignmentSchema).default([])
})

export type SectorAssignmentInput = z.infer<typeof sectorAssignmentSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
