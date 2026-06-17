'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import type { SessionUser } from '@/lib/permissions'

interface PanelShellProps {
  user: SessionUser
  children: React.ReactNode
}

export function PanelShell ({ user, children }: PanelShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-64 bg-surface shadow-[var(--shadow-modal)]">
            <Sidebar user={user} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(open => !open)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-sidebar"
              aria-label={mobileOpen ? 'Fechar navegação' : 'Abrir navegação'}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
            <span className="ml-2 text-sm font-semibold">Disparador</span>
          </div>
          <ThemeToggle />
        </div>

        {children}
      </div>
    </div>
  )
}
