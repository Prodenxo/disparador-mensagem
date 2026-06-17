'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface GroupRow {
  id: string
  jid: string
  name: string
  participantCount: number
  syncedAt: string
}

interface GroupsManagerProps {
  initialGroups: GroupRow[]
  canSync: boolean
}

export function GroupsManager ({ initialGroups, canSync }: GroupsManagerProps) {
  const router = useRouter()
  const [groups, setGroups] = useState(initialGroups)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setGroups(initialGroups)
  }, [initialGroups])

  async function handleSync () {
    setError(null)
    setIsSyncing(true)

    try {
      const response = await fetch('/api/groups', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível sincronizar os grupos')
        return
      }

      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Grupos WhatsApp</h1>
          <p className="mt-1 text-sm text-text-muted">
            Grupos onde o número Central de Avisos está presente.
          </p>
        </div>
        {canSync && (
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Sincronizar agora
          </Button>
        )}
      </div>

      {groups.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-sm text-text-muted">
          {canSync
            ? 'Nenhum grupo sincronizado ainda. Adicione o bot aos grupos no WhatsApp e clique em "Sincronizar agora".'
            : 'Nenhum grupo disponível. Peça a um administrador para sincronizar.'}
        </div>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">{error}</p>
      )}

      {groups.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Nome</th>
                <th className="px-4 py-3 font-medium text-text-muted">Participantes</th>
                <th className="px-4 py-3 font-medium text-text-muted">Última sync</th>
                <th className="px-4 py-3 font-medium text-text-muted hidden lg:table-cell">JID</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => (
                <tr key={group.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium text-text-primary">{group.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={group.participantCount > 256 ? 'warning' : 'muted'}>
                      {group.participantCount}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {format(new Date(group.syncedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell">{group.jid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
