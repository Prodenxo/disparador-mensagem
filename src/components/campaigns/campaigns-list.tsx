'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Pencil, Plus, Radio } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { formatIntervalLabel } from '@/lib/validations/campaign'

export interface CampaignListItem {
  id: string
  name: string
  message: string
  active: boolean
  mentionAll: boolean
  intervalMinutes: number
  lastSentAt: string | null
  nextSendAt: string | null
  sectorName: string
  groupName: string
  participantCount: number
  hasImage: boolean
  createdByName: string
}

interface CampaignsListProps {
  campaigns: CampaignListItem[]
  canCreate: boolean
}

export function CampaignsList ({ campaigns, canCreate }: CampaignsListProps) {
  const router = useRouter()
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle (campaignId: string, active: boolean) {
    setError(null)
    setTogglingId(campaignId)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível alterar a campanha')
        return
      }

      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Campanhas contínuas</h1>
          <p className="mt-1 text-sm text-text-muted">
            Disparos repetidos em intervalo fixo. Ligue ou desligue quando quiser.
          </p>
        </div>

        {canCreate && (
          <Link
            href="/campanhas/nova"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova campanha
          </Link>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">{error}</p>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
          <Radio className="mx-auto h-8 w-8 text-text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm text-text-muted">
            Nenhuma campanha contínua cadastrada.
          </p>
          {canCreate && (
            <Link
              href="/campanhas/nova"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Criar primeira campanha
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Campanha</th>
                <th className="px-4 py-3 font-medium text-text-muted">Grupo</th>
                <th className="px-4 py-3 font-medium text-text-muted">Intervalo</th>
                <th className="px-4 py-3 font-medium text-text-muted">Último / Próximo</th>
                <th className="px-4 py-3 font-medium text-text-muted">Ativa</th>
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
                      {item.mentionAll ? ' · menciona todos' : ' · sem menções'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {item.groupName}
                    <span className="block text-xs">({item.participantCount} participantes)</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                    {formatIntervalLabel(item.intervalMinutes)}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                    <span className="block">
                      Último: {item.lastSentAt
                        ? format(new Date(item.lastSentAt), "dd/MM 'às' HH:mm", { locale: ptBR })
                        : '—'}
                    </span>
                    <span className="block mt-1">
                      Próximo: {item.active && item.nextSendAt
                        ? format(new Date(item.nextSendAt), "dd/MM 'às' HH:mm", { locale: ptBR })
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      id={`campaign-toggle-${item.id}`}
                      checked={item.active}
                      disabled={togglingId === item.id}
                      onCheckedChange={checked => handleToggle(item.id, checked)}
                      label={item.active ? 'Ligada' : 'Desligada'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/campanhas/${item.id}/editar`}
                      className="inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium text-text-muted transition-colors hover:bg-background hover:text-text-primary"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </Link>
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
