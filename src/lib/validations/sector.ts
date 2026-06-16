import { z } from 'zod'

export const sectorInputSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  slug: z.string().min(2, 'Slug inválido').regex(/^[a-z0-9-]+$/, 'Slug: apenas letras minúsculas, números e hífen'),
  active: z.boolean()
})

export type SectorInput = z.infer<typeof sectorInputSchema>
