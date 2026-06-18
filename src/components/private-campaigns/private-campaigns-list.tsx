'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Plus, UserRound, XCircle } from 'lucide-react'
import type { AnnouncementStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { AnnouncementStatusBadge } from '@/components/announcements/announcement-status-badge'

export interface PrivateCampaignListItem {
  id: string
  name: string
  message: string
  status: AnnouncementStatus
  scheduledAt: string
  intervalSeconds: number
  sectorName: string
  listName: string
  memberCount: number
  sentCount: number
  failedCount: number
  hasImage: boolean
  createdByName: string
}

interface PrivateCampaignsListProps {
  campaigns: PrivateCampaignListItem[]
  canCreate: boolean
}

export function PrivateCampaignsList ({ campaigns, canCreate }: PrivateCampaignsListProps) {
  const router = useRouter()
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shouldAutoRefresh = useMemo(() => (
    campaigns.some(item =>
      item.status === 'PROCESSING'
      || (item.status === 'SCHEDULED' && new Date(item.scheduledAt).getTime() <= Date.now() + 60_000)
    )
  ), [campaigns])

  useEffect(() => {
    if (!shouldAutoRefresh) return

    const interval = setInterval(() => {
      router.refresh()
    }, 5000)

    return () => clearInterval(interval)
  }, [shouldAutoRefresh, router])

  async function handleCancel (id: string) {
    setError(null)
    setCancelingId(id)

    try {
      const response = await fetch(`/api/private-campaigns/${id}`, { method: 'PATCH' })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível cancelar')
        return
      }

      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Disparo privado</h1>
          <p className="mt-1 text-sm text-text-muted">
            Envie convites e avisos no WhatsApp privado de cada contato.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/privado/contatos"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary transition-colors hover:bg-background"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Contatos
          </Link>
          <Link
            href="/privado/listas"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary transition-colors hover:bg-background"
          >
            Listas
          </Link>
          {canCreate && (
            <Link
              href="/privado/novo"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova campanha
            </Link>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">{error}</p>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Nenhuma campanha privada ainda.
          {canCreate && (
            <>
              {' '}
              <Link href="/privado/listas" className="text-primary underline-offset-4 hover:underline">
                Crie uma lista de contatos
              </Link>
              {' '}e depois{' '}
              <Link href="/privado/novo" className="text-primary underline-offset-4 hover:underline">
                agende um disparo
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Campanha</th>
                <th className="px-4 py-3 font-medium text-text-muted">Lista</th>
                <th className="px-4 py-3 font-medium text-text-muted">Agendado</th>
                <th className="px-4 py-3 font-medium text-text-muted">Progresso</th>
                <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                <th className="px-4 py-3 font-medium text-text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(item => (
                <tr key={item.id} className="border-b border-border last:border-b-0 align-top">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-text-primary">{item.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-text-muted">{item.message}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {item.sectorName} · por {item.createdByName}
                      {item.hasImage ? ' · com imagem' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {item.listName}
                    <span className="block text-xs">({item.memberCount} contatos)</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                    {format(new Date(item.scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    <span className="block text-xs">intervalo {item.intervalSeconds}s</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                    {item.sentCount} enviados
                    {item.sentCount === 0 && item.status === 'SENT' && (
                      <span className="block text-xs text-warning">Nenhum envio registrado</span>
                    )}
                    {item.failedCount > 0 && (
                      <span className="block text-xs text-danger">{item.failedCount} falhas</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AnnouncementStatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/privado/${item.id}`}
                        className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-text-primary hover:bg-background"
                      >
                        Detalhes
                      </Link>
                      {item.status === 'SCHEDULED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(item.id)}
                          disabled={cancelingId === item.id}
                        >
                          {cancelingId === item.id
                            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            : <XCircle className="h-4 w-4" aria-hidden="true" />}
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
