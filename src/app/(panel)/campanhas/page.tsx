import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { listCampaignsService } from '@/lib/services/campaigns'
import { CampaignsList } from '@/components/campaigns/campaigns-list'

export default async function CampanhasPage () {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const campaigns = await listCampaignsService(session)
  const canCreate = isSuperAdmin(session)
    || session.sectors.some(link => canCreateAnnouncement(session, link.sectorId))

  return (
    <CampaignsList
      canCreate={canCreate}
      campaigns={campaigns.map(item => ({
        id: item.id,
        name: item.name,
        message: item.message,
        active: item.active,
        mentionAll: item.mentionAll,
        intervalMinutes: item.intervalMinutes,
        lastSentAt: item.lastSentAt?.toISOString() ?? null,
        nextSendAt: item.nextSendAt?.toISOString() ?? null,
        sectorName: item.sector.name,
        groupName: item.group.name,
        participantCount: item.group.participantCount,
        hasImage: Boolean(item.imagePath || item.imageId),
        createdByName: item.createdBy.name
      }))}
    />
  )
}
