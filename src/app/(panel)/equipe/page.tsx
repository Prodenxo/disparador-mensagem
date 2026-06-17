import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { adminSectorIds, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { TeamManager } from '@/components/team/team-manager'

export default async function EquipePage () {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const managed = adminSectorIds(session)

  if (managed !== 'all' && managed.length === 0) {
    redirect('/')
  }

  const sectors = await prisma.sector.findMany({
    where: managed === 'all'
      ? { active: true }
      : { id: { in: managed }, active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  if (sectors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-text-primary">Equipe do setor</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
          {isSuperAdmin(session)
            ? 'Cadastre um setor ativo antes de gerenciar a equipe.'
            : 'Nenhum setor ativo disponível para administração.'}
        </p>
      </div>
    )
  }

  return (
    <TeamManager
      sectors={sectors}
      currentUserId={session.id}
      initialSectorId={sectors[0].id}
    />
  )
}
