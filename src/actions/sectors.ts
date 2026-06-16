'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/auth/guard'
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

export async function createSector (input: {
  name: string
  slug?: string
  active: boolean
}): Promise<ActionResult<{ id: string }>> {
  await requireSuperAdmin()

  const parsed = sectorInputSchema.safeParse({
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    active: input.active
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  const uniqueSlug = await resolveUniqueSlug(parsed.data.slug)

  try {
    const sector = await prisma.sector.create({
      data: {
        name: parsed.data.name,
        slug: uniqueSlug,
        active: parsed.data.active
      }
    })

    revalidatePath('/setores')
    revalidatePath('/usuarios')
    return actionSuccess({ id: sector.id })
  } catch {
    return actionError('Não foi possível criar o setor')
  }
}

export async function updateSector (
  id: string,
  input: { name: string; slug?: string; active: boolean }
): Promise<ActionResult> {
  await requireSuperAdmin()

  const parsed = sectorInputSchema.safeParse({
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    active: input.active
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  const existing = await prisma.sector.findUnique({ where: { id } })
  if (!existing) return actionError('Setor não encontrado')

  const uniqueSlug = parsed.data.slug === existing.slug
    ? existing.slug
    : await resolveUniqueSlug(parsed.data.slug, id)

  try {
    await prisma.sector.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: uniqueSlug,
        active: parsed.data.active
      }
    })

    revalidatePath('/setores')
    revalidatePath('/usuarios')
    return actionSuccess()
  } catch {
    return actionError('Não foi possível atualizar o setor')
  }
}
