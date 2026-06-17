import { fetchAllGroups } from '@/lib/evolution'
import { prisma } from '@/lib/prisma'
import { actionError, actionSuccess, type ActionResult } from '@/lib/actions/result'

export interface GroupRow {
  id: string
  jid: string
  name: string
  participantCount: number
  syncedAt: Date
}

export async function listGroupsService (): Promise<GroupRow[]> {
  return prisma.whatsappGroup.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      jid: true,
      name: true,
      participantCount: true,
      syncedAt: true
    }
  })
}

export async function syncGroupsService (): Promise<ActionResult<{ count: number; syncedAt: string }>> {
  try {
    const remoteGroups = await fetchAllGroups()
    const syncedAt = new Date()

    for (const group of remoteGroups) {
      await prisma.whatsappGroup.upsert({
        where: { jid: group.jid },
        create: {
          jid: group.jid,
          name: group.name,
          participantCount: group.participantCount,
          syncedAt
        },
        update: {
          name: group.name,
          participantCount: group.participantCount,
          syncedAt
        }
      })
    }

    return actionSuccess({
      count: remoteGroups.length,
      syncedAt: syncedAt.toISOString()
    })
  } catch (error) {
    console.error('[syncGroupsService]', error)
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar grupos'
    return actionError(message)
  }
}
