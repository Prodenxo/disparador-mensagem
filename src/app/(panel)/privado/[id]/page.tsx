import { redirect, notFound } from 'next/navigation'
import type { AnnouncementStatus } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getPrivateCampaignLogsService } from '@/lib/services/private-campaigns'
import { PrivateCampaignDetail } from '@/components/private-campaigns/private-campaign-detail'

export default async function PrivadoCampanhaDetailPage ({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const campaign = await prisma.privateCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      sectorId: true,
      list: {
        select: {
          _count: { select: { members: true } }
        }
      },
      logs: { select: { status: true } }
    }
  })

  if (!campaign) {
    notFound()
  }

  const allowed = isSuperAdmin(session)
    || session.sectors.some(link => link.sectorId === campaign.sectorId)

  if (!allowed) {
    notFound()
  }

  const logsData = await getPrivateCampaignLogsService(session, id)

  if (!logsData) {
    notFound()
  }

  return (
    <PrivateCampaignDetail
      campaign={{
        id: campaign.id,
        name: campaign.name,
        status: campaign.status as AnnouncementStatus,
        memberCount: campaign.list._count.members,
        sentCount: campaign.logs.filter(log => log.status === 'SENT').length,
        failedCount: campaign.logs.filter(log => log.status === 'FAILED').length
      }}
      logs={logsData.logs.map(log => ({
        status: log.status,
        errorMessage: log.errorMessage,
        messageId: log.messageId,
        remoteJid: log.remoteJid,
        sentAt: log.sentAt.toISOString(),
        contact: log.contact
      }))}
    />
  )
}
