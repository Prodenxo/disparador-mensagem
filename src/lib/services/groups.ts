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

export async function syncGroupsService (): Promise<ActionResult<{
  count: number
  removed: number
  skipped: number
  syncedAt: string
}>> {
  try {
    const remoteGroups = await fetchAllGroups()
    const syncedAt = new Date()
    const remoteJids = remoteGroups.map(group => group.jid)

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

    const staleGroups = await prisma.whatsappGroup.findMany({
      where: remoteJids.length > 0
        ? { jid: { notIn: remoteJids } }
        : {},
      select: {
        id: true,
        _count: {
          select: {
            announcements: true,
            continuousCampaigns: true
          }
        }
      }
    })

    const deletableIds = staleGroups
      .filter(group => group._count.announcements === 0 && group._count.continuousCampaigns === 0)
      .map(group => group.id)

    const skipped = staleGroups.length - deletableIds.length

    if (deletableIds.length > 0) {
      await prisma.whatsappGroup.deleteMany({
        where: { id: { in: deletableIds } }
      })
    }

    return actionSuccess({
      count: remoteGroups.length,
      removed: deletableIds.length,
      skipped,
      syncedAt: syncedAt.toISOString()
    })
  } catch (error) {
    console.error('[syncGroupsService]', error)
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar grupos'
    return actionError(message)
  }
}
