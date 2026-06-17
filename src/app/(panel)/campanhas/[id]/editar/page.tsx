import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { getCampaignService } from '@/lib/services/campaigns'
import { splitInterval } from '@/lib/validations/campaign'
import { CampaignForm } from '@/components/campaigns/campaign-form'

interface EditCampanhaPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCampanhaPage ({ params }: EditCampanhaPageProps) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { id } = await params
  const campaign = await getCampaignService(session, id)

  if (!campaign) {
    notFound()
  }

  const creatableSectorIds = isSuperAdmin(session)
    ? null
    : session.sectors
      .filter(link => canCreateAnnouncement(session, link.sectorId))
      .map(link => link.sectorId)

  const [sectors, groups] = await Promise.all([
    prisma.sector.findMany({
      where: {
        active: true,
        ...(creatableSectorIds ? { id: { in: creatableSectorIds } } : {})
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.whatsappGroup.findMany({
      select: { id: true, name: true, participantCount: true },
      orderBy: { name: 'asc' }
    })
  ])

  const interval = splitInterval(campaign.intervalMinutes)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Editar campanha</h1>
        <p className="mt-1 text-sm text-text-muted">
          Altere a mensagem, intervalo ou grupo. Use o toggle para ligar ou desligar os disparos.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <CampaignForm
          mode="edit"
          campaignId={campaign.id}
          sectors={sectors}
          groups={groups}
          maxImageSizeMb={env.maxImageSizeMb}
          initialValues={{
            name: campaign.name,
            sectorId: campaign.sector.id,
            groupId: campaign.group.id,
            message: campaign.message,
            mentionAll: campaign.mentionAll,
            active: campaign.active,
            intervalValue: interval.value,
            intervalUnit: interval.unit,
            hasImage: Boolean(campaign.imagePath || campaign.imageId)
          }}
        />
      </div>
    </div>
  )
}
