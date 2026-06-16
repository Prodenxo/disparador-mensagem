import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import {
  createUserSchema,
  updateUserSchema,
  type SectorAssignmentInput
} from '@/lib/validations/user'
import { actionError, actionSuccess, type ActionResult } from '@/lib/actions/result'

function normalizeEmail (email: string): string {
  return email.toLowerCase().trim()
}

function dedupeAssignments (assignments: SectorAssignmentInput[]): SectorAssignmentInput[] {
  const map = new Map<string, SectorAssignmentInput>()

  for (const item of assignments) {
    map.set(item.sectorId, {
      sectorId: item.sectorId,
      role: item.role,
      canCreateAnnouncements: item.role === 'SECTOR_ADMIN' ? true : item.canCreateAnnouncements
    })
  }

  return Array.from(map.values())
}

async function syncSectorLinks (
  userId: string,
  assignments: SectorAssignmentInput[]
): Promise<void> {
  const deduped = dedupeAssignments(assignments)

  await prisma.userSector.deleteMany({ where: { userId } })

  if (deduped.length === 0) return

  await prisma.userSector.createMany({
    data: deduped.map(item => ({
      userId,
      sectorId: item.sectorId,
      role: item.role,
      canCreateAnnouncements: item.role === 'SECTOR_ADMIN' ? true : item.canCreateAnnouncements
    }))
  })
}

export async function createUserService (input: {
  name: string
  email: string
  password: string
  isSuperAdmin: boolean
  active: boolean
  sectorAssignments: SectorAssignmentInput[]
}): Promise<ActionResult<{ id: string }>> {
  const parsed = createUserSchema.safeParse({
    ...input,
    email: normalizeEmail(input.email),
    name: input.name.trim()
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  try {
    const emailTaken = await prisma.user.findUnique({
      where: { email: parsed.data.email }
    })

    if (emailTaken) {
      return actionError('Este e-mail já está em uso')
    }

    const passwordHash = await hashPassword(parsed.data.password)

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        globalRole: parsed.data.isSuperAdmin ? 'SUPER_ADMIN' : null,
        active: parsed.data.active
      }
    })

    await syncSectorLinks(user.id, parsed.data.sectorAssignments)

    return actionSuccess({ id: user.id })
  } catch (error) {
    console.error('[createUserService]', error)
    return actionError('Não foi possível criar o usuário')
  }
}

export async function updateUserService (
  id: string,
  actorId: string,
  input: {
    name: string
    email: string
    password?: string
    isSuperAdmin: boolean
    active: boolean
    sectorAssignments: SectorAssignmentInput[]
  }
): Promise<ActionResult> {
  const parsed = updateUserSchema.safeParse({
    ...input,
    email: normalizeEmail(input.email),
    name: input.name.trim(),
    password: input.password?.trim() || undefined
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return actionError('Usuário não encontrado')

    if (actorId === id && !parsed.data.active) {
      return actionError('Você não pode desativar sua própria conta')
    }

    if (actorId === id && !parsed.data.isSuperAdmin && existing.globalRole === 'SUPER_ADMIN') {
      return actionError('Você não pode remover seu próprio papel de Super Admin')
    }

    const emailTaken = await prisma.user.findFirst({
      where: {
        email: parsed.data.email,
        NOT: { id }
      }
    })

    if (emailTaken) {
      return actionError('Este e-mail já está em uso')
    }

    const updateData: {
      name: string
      email: string
      globalRole: 'SUPER_ADMIN' | null
      active: boolean
      passwordHash?: string
    } = {
      name: parsed.data.name,
      email: parsed.data.email,
      globalRole: parsed.data.isSuperAdmin ? 'SUPER_ADMIN' : null,
      active: parsed.data.active
    }

    if (parsed.data.password) {
      updateData.passwordHash = await hashPassword(parsed.data.password)
    }

    await prisma.user.update({
      where: { id },
      data: updateData
    })

    await syncSectorLinks(id, parsed.data.sectorAssignments)

    return actionSuccess()
  } catch (error) {
    console.error('[updateUserService]', error)
    return actionError('Não foi possível atualizar o usuário')
  }
}
