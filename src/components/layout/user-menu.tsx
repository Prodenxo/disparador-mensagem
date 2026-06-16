'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sectorRoleLabel, isSuperAdmin, type SessionUser } from '@/lib/permissions'

interface UserMenuProps {
  user: SessionUser
}

function resolveRoleLabel (user: SessionUser): string {
  if (isSuperAdmin(user)) return sectorRoleLabel('SUPER_ADMIN')

  const adminLink = user.sectors.find(link => link.role === 'SECTOR_ADMIN')
  if (adminLink) return sectorRoleLabel('SECTOR_ADMIN')

  return sectorRoleLabel('EMPLOYEE')
}

export function UserMenu ({ user }: UserMenuProps) {
  const router = useRouter()

  async function handleLogout () {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium text-text-primary">{user.name}</p>
        <p className="text-xs text-text-muted">{resolveRoleLabel(user)}</p>
      </div>

      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
        aria-hidden="true"
      >
        {initials}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        aria-label="Sair da conta"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Sair</span>
      </Button>
    </div>
  )
}
