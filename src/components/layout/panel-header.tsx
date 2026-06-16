import { UserMenu } from '@/components/layout/user-menu'
import { isSuperAdmin, type SessionUser } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface PanelHeaderProps {
  user: SessionUser
}

async function resolveSectorLabel (user: SessionUser): Promise<string> {
  if (isSuperAdmin(user)) {
    const count = await prisma.sector.count({ where: { active: true } })
    return count > 0 ? 'Todos os setores' : 'Nenhum setor cadastrado'
  }

  if (user.sectors.length === 0) {
    return 'Sem setor vinculado'
  }

  const sectorIds = user.sectors.map(link => link.sectorId)
  const sectors = await prisma.sector.findMany({
    where: { id: { in: sectorIds }, active: true },
    select: { name: true },
    orderBy: { name: 'asc' }
  })

  if (sectors.length === 1) return sectors[0].name
  return `${sectors.length} setores`
}

export async function PanelHeader ({ user }: PanelHeaderProps) {
  const sectorLabel = await resolveSectorLabel(user)

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Setor ativo
        </p>
        <p className="text-sm font-semibold text-text-primary">{sectorLabel}</p>
      </div>

      <UserMenu user={user} />
    </header>
  )
}
