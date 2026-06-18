import Link from 'next/link'
import { AlertTriangle, CalendarClock, CheckCircle2, Megaphone } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { getTimezoneDayRange } from '@/lib/datetime/timezone-range'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { reconcileAnnouncementStatuses } from '@/lib/queue/announcement-sync'

async function getDashboardStats (sectorIds: string[] | 'all') {
  const sectorFilter = sectorIds === 'all'
    ? {}
    : { sectorId: { in: sectorIds } }

  const { todayStart, tomorrowStart } = getTimezoneDayRange()

  const [scheduledToday, sentToday, totalSent, recentFailed] = await Promise.all([
    prisma.announcement.count({
      where: {
        ...sectorFilter,
        status: 'SCHEDULED',
        scheduledAt: { gte: todayStart, lt: tomorrowStart }
      }
    }),
    prisma.announcement.count({
      where: {
        ...sectorFilter,
        status: 'SENT',
        logs: {
          some: {
            status: 'SENT',
            sentAt: { gte: todayStart, lt: tomorrowStart }
          }
        }
      }
    }),
    prisma.announcement.count({
      where: {
        ...sectorFilter,
        status: 'SENT'
      }
    }),
    prisma.announcement.count({
      where: {
        ...sectorFilter,
        status: 'FAILED'
      }
    })
  ])

  return { scheduledToday, sentToday, totalSent, recentFailed }
}

export default async function DashboardPage () {
  const session = await getSession()

  if (!session) return null

  await reconcileAnnouncementStatuses()

  const superAdmin = isSuperAdmin(session)
  const sectorIds = superAdmin ? 'all' as const : session.sectors.map(link => link.sectorId)
  const stats = await getDashboardStats(sectorIds)

  const canCreate = superAdmin || session.sectors.some(link =>
    canCreateAnnouncement(session, link.sectorId)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-text-muted">
            Visão rápida dos anúncios do seu escopo.
          </p>
        </div>

        {canCreate ? (
          <Link
            href="/anuncios/novo"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Megaphone className="h-4 w-4" aria-hidden="true" />
            Novo anúncio
          </Link>
        ) : (
          <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-muted">
            Você não tem permissão para criar anúncios.
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center gap-2 text-warning">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">Agendados hoje</span>
          </div>
          <p className="text-3xl font-semibold text-text-primary">{stats.scheduledToday}</p>
        </article>

        <article className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">Concluídos hoje</span>
          </div>
          <p className="text-3xl font-semibold text-text-primary">{stats.sentToday}</p>
        </article>

        <article className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">Total concluídos</span>
          </div>
          <p className="text-3xl font-semibold text-text-primary">{stats.totalSent}</p>
        </article>

        <article className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center gap-2 text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">Falhas</span>
          </div>
          <p className="text-3xl font-semibold text-text-primary">{stats.recentFailed}</p>
        </article>
      </div>
    </div>
  )
}
