import type { GlobalRole, SectorRole, User, UserSector } from '@prisma/client'

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'globalRole'> & {
  sectors: Array<Pick<UserSector, 'sectorId' | 'role' | 'canCreateAnnouncements'>>
}

export function isSuperAdmin (user: SessionUser): boolean {
  return user.globalRole === 'SUPER_ADMIN'
}

export function isSectorAdmin (user: SessionUser, sectorId: string): boolean {
  if (isSuperAdmin(user)) return true
  return user.sectors.some(s => s.sectorId === sectorId && s.role === 'SECTOR_ADMIN')
}

export function canCreateAnnouncement (user: SessionUser, sectorId: string): boolean {
  if (isSuperAdmin(user)) return true
  const link = user.sectors.find(s => s.sectorId === sectorId)
  if (!link) return false
  if (link.role === 'SECTOR_ADMIN') return true
  return link.role === 'EMPLOYEE' && link.canCreateAnnouncements
}

export function accessibleSectorIds (user: SessionUser): string[] | 'all' {
  if (isSuperAdmin(user)) return 'all'
  return user.sectors.map(s => s.sectorId)
}

export function sectorRoleLabel (role: SectorRole | GlobalRole | null | undefined): string {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super Admin'
    case 'SECTOR_ADMIN': return 'Admin do setor'
    case 'EMPLOYEE': return 'Funcionário'
    default: return 'Sem papel'
  }
}
