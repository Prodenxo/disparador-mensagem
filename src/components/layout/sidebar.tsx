'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  LayoutDashboard,
  Megaphone,
  Radio,
  Settings,
  Users,
  UsersRound,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isSuperAdmin, type SessionUser } from '@/lib/permissions'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  visible: boolean
}

interface SidebarProps {
  user: SessionUser
}

export function Sidebar ({ user }: SidebarProps) {
  const currentPath = usePathname()
  const superAdmin = isSuperAdmin(user)

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      visible: true
    },
    {
      href: '/anuncios',
      label: 'Anúncios',
      icon: Megaphone,
      visible: true
    },
    {
      href: '/campanhas',
      label: 'Campanhas contínuas',
      icon: Radio,
      visible: true
    },
    {
      href: '/grupos',
      label: 'Grupos WhatsApp',
      icon: MessageSquare,
      visible: superAdmin || user.sectors.some(link => link.role === 'SECTOR_ADMIN')
    },
    {
      href: '/equipe',
      label: 'Equipe',
      icon: UsersRound,
      visible: superAdmin || user.sectors.some(link => link.role === 'SECTOR_ADMIN')
    },
    {
      href: '/setores',
      label: 'Setores',
      icon: Building2,
      visible: superAdmin
    },
    {
      href: '/usuarios',
      label: 'Usuários',
      icon: Users,
      visible: superAdmin
    },
    {
      href: '/configuracoes',
      label: 'Configurações',
      icon: Settings,
      visible: superAdmin
    }
  ]

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Disparador</p>
            <p className="text-xs text-text-muted">Painel interno</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Navegação principal">
        {navItems.filter(item => item.visible).map(item => {
          const Icon = item.icon
          const isActive = currentPath === item.href ||
            (item.href !== '/' && currentPath.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:bg-background hover:text-text-primary'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
