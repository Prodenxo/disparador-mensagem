import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import {
  createTeamMemberSchema,
  updateTeamMemberSchema
} from '@/lib/validations/team'
import { actionError, actionSuccess, type ActionResult } from '@/lib/actions/result'

function normalizeEmail (email: string): string {
  return email.toLowerCase().trim()
}

export interface TeamMemberRow {
  userId: string
  name: string
  email: string
  active: boolean
  role: 'SECTOR_ADMIN' | 'EMPLOYEE'
  canCreateAnnouncements: boolean
}

export async function listTeamMembersService (
  sectorId: string
): Promise<ActionResult<TeamMemberRow[]>> {
  try {
    const links = await prisma.userSector.findMany({
      where: { sectorId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            globalRole: true
          }
        }
      },
      orderBy: { user: { name: 'asc' } }
    })

    const members = links
      .filter(link => link.user.globalRole !== 'SUPER_ADMIN')
      .map(link => ({
        userId: link.user.id,
        name: link.user.name,
        email: link.user.email,
        active: link.user.active,
        role: link.role,
        canCreateAnnouncements: link.canCreateAnnouncements
      }))

    return actionSuccess(members)
  } catch (error) {
    console.error('[listTeamMembersService]', error)
    return actionError('Não foi possível listar a equipe')
  }
}

export async function createTeamMemberService (input: {
  sectorId: string
  name: string
  email: string
  password: string
  role: 'SECTOR_ADMIN' | 'EMPLOYEE'
  canCreateAnnouncements: boolean
}): Promise<ActionResult<{ id: string }>> {
  const parsed = createTeamMemberSchema.safeParse({
    ...input,
    email: normalizeEmail(input.email),
    name: input.name.trim(),
    canCreateAnnouncements: input.role === 'SECTOR_ADMIN'
      ? true
      : input.canCreateAnnouncements
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: {
        sectorLinks: {
          where: { sectorId: parsed.data.sectorId }
        }
      }
    })

    if (existing?.globalRole === 'SUPER_ADMIN') {
      return actionError('Super Admins são gerenciados em Usuários globais')
    }

    if (existing) {
      if (existing.sectorLinks.length > 0) {
        return actionError('Este usuário já faz parte deste setor')
      }

      await prisma.userSector.create({
        data: {
          userId: existing.id,
          sectorId: parsed.data.sectorId,
          role: parsed.data.role,
          canCreateAnnouncements: parsed.data.canCreateAnnouncements
        }
      })

      return actionSuccess({ id: existing.id })
    }

    const passwordHash = await hashPassword(parsed.data.password)

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        active: true,
        sectorLinks: {
          create: {
            sectorId: parsed.data.sectorId,
            role: parsed.data.role,
            canCreateAnnouncements: parsed.data.canCreateAnnouncements
          }
        }
      }
    })

    return actionSuccess({ id: user.id })
  } catch (error) {
    console.error('[createTeamMemberService]', error)
    return actionError('Não foi possível criar o membro da equipe')
  }
}

export async function updateTeamMemberService (
  userId: string,
  input: {
    sectorId: string
    role: 'SECTOR_ADMIN' | 'EMPLOYEE'
    canCreateAnnouncements: boolean
  }
): Promise<ActionResult> {
  const parsed = updateTeamMemberSchema.safeParse({
    ...input,
    canCreateAnnouncements: input.role === 'SECTOR_ADMIN'
      ? true
      : input.canCreateAnnouncements
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  try {
    const link = await prisma.userSector.findUnique({
      where: {
        userId_sectorId: {
          userId,
          sectorId: parsed.data.sectorId
        }
      },
      include: {
        user: { select: { globalRole: true } }
      }
    })

    if (!link) {
      return actionError('Membro não encontrado neste setor')
    }

    if (link.user.globalRole === 'SUPER_ADMIN') {
      return actionError('Não é possível alterar Super Admin por aqui')
    }

    await prisma.userSector.update({
      where: {
        userId_sectorId: {
          userId,
          sectorId: parsed.data.sectorId
        }
      },
      data: {
        role: parsed.data.role,
        canCreateAnnouncements: parsed.data.canCreateAnnouncements
      }
    })

    return actionSuccess()
  } catch (error) {
    console.error('[updateTeamMemberService]', error)
    return actionError('Não foi possível atualizar o membro')
  }
}
