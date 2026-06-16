import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slug'
import { sectorInputSchema } from '@/lib/validations/sector'
import { actionError, actionSuccess, type ActionResult } from '@/lib/actions/result'

async function resolveUniqueSlug (baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug
  let suffix = 1

  while (true) {
    const existing = await prisma.sector.findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      }
    })

    if (!existing) return slug

    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }
}

export async function createSectorService (input: {
  name: string
  slug?: string
  active: boolean
}): Promise<ActionResult<{ id: string }>> {
  const parsed = sectorInputSchema.safeParse({
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    active: input.active
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  try {
    const uniqueSlug = await resolveUniqueSlug(parsed.data.slug)

    const sector = await prisma.sector.create({
      data: {
        name: parsed.data.name,
        slug: uniqueSlug,
        active: parsed.data.active
      }
    })

    return actionSuccess({ id: sector.id })
  } catch (error) {
    console.error('[createSectorService]', error)
    return actionError('Não foi possível criar o setor')
  }
}

export async function updateSectorService (
  id: string,
  input: { name: string; slug?: string; active: boolean }
): Promise<ActionResult> {
  const parsed = sectorInputSchema.safeParse({
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    active: input.active
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  try {
    const existing = await prisma.sector.findUnique({ where: { id } })
    if (!existing) return actionError('Setor não encontrado')

    const uniqueSlug = parsed.data.slug === existing.slug
      ? existing.slug
      : await resolveUniqueSlug(parsed.data.slug, id)

    await prisma.sector.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: uniqueSlug,
        active: parsed.data.active
      }
    })

    return actionSuccess()
  } catch (error) {
    console.error('[updateSectorService]', error)
    return actionError('Não foi possível atualizar o setor')
  }
}
