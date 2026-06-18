import { redirect } from 'next/navigation'
import type { AnnouncementStatus } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { listPrivateCampaignsService } from '@/lib/services/private-campaigns'
import { PrivateCampaignsList } from '@/components/private-campaigns/private-campaigns-list'

export default async function PrivadoPage () {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const campaigns = await listPrivateCampaignsService(session)
  const canCreate = isSuperAdmin(session)
    || session.sectors.some(link => canCreateAnnouncement(session, link.sectorId))

  return (
    <PrivateCampaignsList
      canCreate={canCreate}
      campaigns={campaigns.map(item => ({
        id: item.id,
        name: item.name,
        message: item.message,
        status: item.status as AnnouncementStatus,
        scheduledAt: item.scheduledAt.toISOString(),
        intervalSeconds: item.intervalSeconds,
        sectorName: item.sector.name,
        listName: item.list.name,
        memberCount: item.list.memberCount,
        sentCount: item.sentCount,
        failedCount: item.failedCount,
        hasImage: Boolean(item.imagePath || item.imageId),
        createdByName: item.createdBy.name
      }))}
    />
  )
}
