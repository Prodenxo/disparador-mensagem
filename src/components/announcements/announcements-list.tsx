'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Plus, XCircle } from 'lucide-react'
import type { AnnouncementStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { AnnouncementStatusBadge } from '@/components/announcements/announcement-status-badge'

export interface AnnouncementListItem {
  id: string
  message: string
  status: AnnouncementStatus
  scheduledAt: string
  sectorName: string
  groupName: string
  participantCount: number
  createdByName: string
  hasImage: boolean
}

interface AnnouncementsListProps {
  announcements: AnnouncementListItem[]
  canCreate: boolean
}

export function AnnouncementsList ({ announcements, canCreate }: AnnouncementsListProps) {
  const router = useRouter()
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel (id: string) {
    setError(null)
    setCancelingId(id)

    try {
      const response = await fetch(`/api/announcements/${id}`, { method: 'PATCH' })
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
          <h1 className="text-2xl font-semibold text-text-primary">Anúncios</h1>
          <p className="mt-1 text-sm text-text-muted">
            Anúncios agendados e histórico de disparos.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/anuncios/novo"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo anúncio
          </Link>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">{error}</p>
      )}

      {announcements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Nenhum anúncio cadastrado ainda.
          {canCreate && (
            <>
              {' '}
              <Link href="/anuncios/novo" className="text-primary underline-offset-4 hover:underline">
                Criar o primeiro anúncio
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Mensagem</th>
                <th className="px-4 py-3 font-medium text-text-muted">Setor</th>
                <th className="px-4 py-3 font-medium text-text-muted">Grupo</th>
                <th className="px-4 py-3 font-medium text-text-muted">Agendado</th>
                <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                <th className="px-4 py-3 font-medium text-text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map(item => (
                <tr key={item.id} className="border-b border-border last:border-b-0 align-top">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="line-clamp-2 font-medium text-text-primary">{item.message}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      por {item.createdByName}
                      {item.hasImage ? ' · com imagem' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{item.sectorName}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {item.groupName}
                    <span className="block text-xs">({item.participantCount} participantes)</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                    {format(new Date(item.scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <AnnouncementStatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
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
