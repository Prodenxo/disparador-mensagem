import { requireSuperAdmin } from '@/lib/auth/guard'
import { prisma } from '@/lib/prisma'
import { UsersManager } from '@/components/users/users-manager'

export default async function UsuariosPage () {
  const session = await requireSuperAdmin()

  const [users, sectors] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        sectorLinks: {
          include: {
            sector: { select: { id: true, name: true } }
          }
        }
      }
    }),
    prisma.sector.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, active: true }
    })
  ])

  return (
    <UsersManager
      currentUserId={session.id}
      sectors={sectors}
      users={users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        isSuperAdmin: user.globalRole === 'SUPER_ADMIN',
        sectorLinks: user.sectorLinks.map(link => ({
          sectorId: link.sectorId,
          sectorName: link.sector.name,
          role: link.role,
          canCreateAnnouncements: link.canCreateAnnouncements
        }))
      }))}
    />
  )
}
