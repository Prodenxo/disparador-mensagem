import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { CampaignForm } from '@/components/campaigns/campaign-form'

export default async function NovaCampanhaPage () {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const creatableSectorIds = isSuperAdmin(session)
    ? null
    : session.sectors
      .filter(link => canCreateAnnouncement(session, link.sectorId))
      .map(link => link.sectorId)

  if (creatableSectorIds && creatableSectorIds.length === 0) {
    redirect('/campanhas')
  }

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

  if (sectors.length === 0 || groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-text-primary">Nova campanha</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
          Cadastre setores e sincronize grupos antes de criar uma campanha contínua.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Nova campanha contínua</h1>
        <p className="mt-1 text-sm text-text-muted">
          Configure a mensagem e o intervalo. Enquanto estiver ligada, ela dispara automaticamente.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <CampaignForm
          mode="create"
          sectors={sectors}
          groups={groups}
          maxImageSizeMb={env.maxImageSizeMb}
          initialValues={{
            name: '',
            sectorId: sectors[0].id,
            groupId: '',
            message: '',
            mentionAll: true,
            active: false,
            intervalValue: 1,
            intervalUnit: 'hours',
            hasImage: false
          }}
        />
      </div>
    </div>
  )
}
