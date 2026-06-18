import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { PrivateCampaignForm } from '@/components/private-campaigns/private-campaign-form'

export default async function NovaCampanhaPrivadaPage () {
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
    redirect('/privado')
  }

  const [sectors, lists] = await Promise.all([
    prisma.sector.findMany({
      where: {
        active: true,
        ...(creatableSectorIds ? { id: { in: creatableSectorIds } } : {})
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.contactList.findMany({
      where: creatableSectorIds ? { sectorId: { in: creatableSectorIds } } : {},
      select: {
        id: true,
        name: true,
        sectorId: true,
        _count: { select: { members: true } }
      },
      orderBy: { name: 'asc' }
    })
  ])

  if (sectors.length === 0) {
    redirect('/privado')
  }

  const listsWithCount = lists.map(list => ({
    id: list.id,
    name: list.name,
    sectorId: list.sectorId,
    memberCount: list._count.members
  }))

  const hasListsWithContacts = listsWithCount.some(list => list.memberCount > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Nova campanha privada</h1>
        <p className="mt-1 text-sm text-text-muted">
          Dispare mensagens individuais para cada contato de uma lista.
        </p>
      </div>

      {!hasListsWithContacts && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-text-muted">
          Crie uma lista com contatos em{' '}
          <a href="/privado/listas" className="text-primary underline-offset-4 hover:underline">Listas</a>
          {' '}ou{' '}
          <a href="/privado/contatos" className="text-primary underline-offset-4 hover:underline">Contatos</a>
          {' '}antes de agendar.
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <PrivateCampaignForm
          sectors={sectors}
          lists={listsWithCount}
          maxImageSizeMb={env.maxImageSizeMb}
        />
      </div>
    </div>
  )
}
