import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { listAnnouncementsService } from '@/lib/services/announcements'
import { AnnouncementsList } from '@/components/announcements/announcements-list'

export default async function AnunciosPage () {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const announcements = await listAnnouncementsService(session)
  const canCreate = isSuperAdmin(session)
    || session.sectors.some(link => canCreateAnnouncement(session, link.sectorId))

  return (
    <AnnouncementsList
      canCreate={canCreate}
      announcements={announcements.map(item => ({
        id: item.id,
        message: item.message,
        status: item.status,
        scheduledAt: item.scheduledAt.toISOString(),
        sectorName: item.sector.name,
        groupName: item.group.name,
        participantCount: item.group.participantCount,
        createdByName: item.createdBy.name,
        hasImage: Boolean(item.imagePath)
      }))}
    />
  )
}
