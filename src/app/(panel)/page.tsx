import Link from 'next/link'
import { AlertTriangle, CalendarClock, CheckCircle2, Megaphone } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

async function getDashboardStats (userId: string, isAdmin: boolean, sectorIds: string[] | 'all') {
  const sectorFilter = sectorIds === 'all'
    ? {}
    : { sectorId: { in: sectorIds } }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const [scheduledToday, recentSent, recentFailed] = await Promise.all([
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

  void userId
  void isAdmin

  return { scheduledToday, recentSent, recentFailed }
}

export default async function DashboardPage () {
  const session = await getSession()

  if (!session) return null

  const superAdmin = isSuperAdmin(session)
  const sectorIds = superAdmin ? 'all' as const : session.sectors.map(link => link.sectorId)
  const stats = await getDashboardStats(session.id, superAdmin, sectorIds)

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

      <div className="grid gap-6 md:grid-cols-3">
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
            <span className="text-sm font-medium">Enviados</span>
          </div>
          <p className="text-3xl font-semibold text-text-primary">{stats.recentSent}</p>
        </article>

        <article className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center gap-2 text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">Falhas</span>
          </div>
          <p className="text-3xl font-semibold text-text-primary">{stats.recentFailed}</p>
        </article>
      </div>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-text-primary">Próximos passos</h2>
        <p className="mt-2 text-sm text-text-muted">
          Autenticação e layout base prontos. Em seguida: CRUD de setores/usuários,
          sync de grupos, formulário de anúncios e histórico completo.
        </p>
      </section>
    </div>
  )
}
