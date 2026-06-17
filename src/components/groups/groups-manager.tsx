'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { GroupsSyncState } from '@/lib/services/groups-sync-state'

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

interface GroupsApiResponse {
  groups?: GroupRow[]
  sync?: GroupsSyncState
  error?: string
}

export function GroupsManager ({ initialGroups, canSync }: GroupsManagerProps) {
  const router = useRouter()
  const [groups, setGroups] = useState(initialGroups)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return groups
    return groups.filter(group =>
      group.name.toLowerCase().includes(query)
      || group.jid.toLowerCase().includes(query)
    )
  }, [groups, searchQuery])

  useEffect(() => {
    setGroups(initialGroups)
  }, [initialGroups])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const applySyncState = useCallback((sync: GroupsSyncState | undefined, nextGroups?: GroupRow[]) => {
    if (nextGroups) {
      setGroups(nextGroups)
    }

    if (!sync) return

    if (sync.status === 'running') {
      setIsSyncing(true)
      setError(null)
      return
    }

    setIsSyncing(false)

    if (sync.status === 'error' && sync.error) {
      setError(sync.error)
      return
    }

    if (sync.status === 'success') {
      setError(null)
      router.refresh()
    }
  }, [router])

  const pollSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/groups')
      const data = await response.json() as GroupsApiResponse

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível verificar a sincronização')
        setIsSyncing(false)
        stopPolling()
        return
      }

      applySyncState(data.sync, data.groups)

      if (data.sync?.status !== 'running') {
        stopPolling()
      }
    } catch {
      setError('Erro de conexão ao verificar a sincronização.')
      setIsSyncing(false)
      stopPolling()
    }
  }, [applySyncState, stopPolling])

  const startPolling = useCallback(() => {
    stopPolling()
    void pollSyncStatus()
    pollRef.current = setInterval(() => {
      void pollSyncStatus()
    }, 3000)
  }, [pollSyncStatus, stopPolling])

  useEffect(() => {
    if (!canSync) return

    void (async () => {
      try {
        const response = await fetch('/api/groups')
        const data = await response.json() as GroupsApiResponse

        if (response.ok && data.sync?.status === 'running') {
          applySyncState(data.sync, data.groups)
          startPolling()
        }
      } catch {
        // ignore on mount
      }
    })()

    return stopPolling
  }, [canSync, applySyncState, startPolling, stopPolling])

  async function handleSync () {
    setError(null)
    setIsSyncing(true)

    try {
      const response = await fetch('/api/groups', { method: 'POST' })
      const data = await response.json() as GroupsApiResponse

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível iniciar a sincronização')
        setIsSyncing(false)
        return
      }

      applySyncState(data.sync)

      if (data.sync?.status === 'running') {
        startPolling()
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
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
            {isSyncing ? 'Sincronizando…' : 'Sincronizar agora'}
          </Button>
        )}
      </div>

      {isSyncing && (
        <p className="text-sm text-text-muted">
          Sincronização em andamento. Pode levar 1–3 minutos — não feche a página.
        </p>
      )}

      {groups.length === 0 && !isSyncing && (
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
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Buscar grupo por nome ou JID"
              className="pl-9"
              aria-label="Buscar grupo por nome ou JID"
            />
          </div>
          <p className="text-xs text-text-muted">
            {filteredGroups.length} de {groups.length} grupos
          </p>

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
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                      Nenhum grupo encontrado para &quot;{searchQuery}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map(group => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
