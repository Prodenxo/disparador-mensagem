import { redirect } from 'next/navigation'
import { addMinutes } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { AnnouncementForm } from '@/components/announcements/announcement-form'

export default async function NovoAnuncioPage () {
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
    redirect('/anuncios')
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

  if (sectors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-text-primary">Novo anúncio</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
          Cadastre um setor ativo antes de agendar anúncios.
        </p>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-text-primary">Novo anúncio</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
          Sincronize os grupos WhatsApp em /grupos antes de criar um anúncio.
        </p>
      </div>
    )
  }

  const defaultSchedule = addMinutes(new Date(), 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Novo anúncio</h1>
        <p className="mt-1 text-sm text-text-muted">
          Agende um comunicado com menção a todos os participantes do grupo.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <AnnouncementForm
          sectors={sectors}
          groups={groups}
          defaultSectorId={sectors[0].id}
          defaultDate={formatInTimeZone(defaultSchedule, env.timezone, 'yyyy-MM-dd')}
          defaultTime={formatInTimeZone(defaultSchedule, env.timezone, 'HH:mm')}
          maxImageSizeMb={env.maxImageSizeMb}
        />
      </div>
    </div>
  )
}
