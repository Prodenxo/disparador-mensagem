import { requireSuperAdmin } from '@/lib/auth/guard'
import { prisma } from '@/lib/prisma'
import { SectorsManager } from '@/components/sectors/sectors-manager'

export default async function SetoresPage () {
  await requireSuperAdmin()

  const sectors = await prisma.sector.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { members: true } }
    }
  })

  return (
    <SectorsManager
      sectors={sectors.map(sector => ({
        id: sector.id,
        name: sector.name,
        slug: sector.slug,
        active: sector.active,
        memberCount: sector._count.members
      }))}
    />
  )
}
