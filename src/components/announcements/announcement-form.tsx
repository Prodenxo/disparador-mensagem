'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Megaphone, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export interface AnnouncementSectorOption {
  id: string
  name: string
}

export interface AnnouncementGroupOption {
  id: string
  name: string
  participantCount: number
}

interface AnnouncementFormProps {
  sectors: AnnouncementSectorOption[]
  groups: AnnouncementGroupOption[]
  defaultSectorId: string
  defaultDate: string
  defaultTime: string
  maxImageSizeMb: number
}

export function AnnouncementForm ({
  sectors,
  groups,
  defaultSectorId,
  defaultDate,
  defaultTime,
  maxImageSizeMb
}: AnnouncementFormProps) {
  const router = useRouter()
  const [sectorId, setSectorId] = useState(defaultSectorId)
  const [groupId, setGroupId] = useState('')
  const [message, setMessage] = useState('')
  const [scheduledDate, setScheduledDate] = useState(defaultDate)
  const [scheduledTime, setScheduledTime] = useState(defaultTime)
  const [groupQuery, setGroupQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredGroups = useMemo(() => {
    const query = groupQuery.trim().toLowerCase()
    if (!query) return groups
    return groups.filter(group => group.name.toLowerCase().includes(query))
  }, [groups, groupQuery])

  async function handleSubmit (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('sectorId', sectorId)
    formData.set('groupId', groupId)
    formData.set('message', message)
    formData.set('scheduledDate', scheduledDate)
    formData.set('scheduledTime', scheduledTime)

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível agendar o anúncio')
        return
      }

      router.push('/anuncios')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="announcement-sector">Setor</Label>
          <Select
            id="announcement-sector"
            value={sectorId}
            onChange={event => setSectorId(event.target.value)}
            required
          >
            {sectors.map(sector => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-group-search">Buscar grupo</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <Input
              id="announcement-group-search"
              value={groupQuery}
              onChange={event => setGroupQuery(event.target.value)}
              placeholder="Filtrar por nome do grupo"
              className="pl-9"
            />
          </div>
          <Label htmlFor="announcement-group" className="sr-only">Grupo</Label>
          <Select
            id="announcement-group"
            value={groupId}
            onChange={event => setGroupId(event.target.value)}
            required
          >
            <option value="">Selecione um grupo</option>
            {filteredGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.participantCount} participantes)
              </option>
            ))}
          </Select>
          <p className="text-xs text-text-muted">
            {filteredGroups.length} de {groups.length} grupos
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="announcement-message">Mensagem</Label>
        <textarea
          id="announcement-message"
          value={message}
          onChange={event => setMessage(event.target.value)}
          required
          rows={6}
          placeholder="Texto do anúncio. Todos os participantes do grupo serão mencionados."
          className="flex min-h-[140px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="announcement-date">Data</Label>
          <Input
            id="announcement-date"
            type="date"
            value={scheduledDate}
            onChange={event => setScheduledDate(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-time">Hora</Label>
          <Input
            id="announcement-time"
            type="time"
            value={scheduledTime}
            onChange={event => setScheduledTime(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="announcement-image">Imagem (opcional)</Label>
        <Input
          id="announcement-image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
        <p className="text-xs text-text-muted">
          JPG, PNG ou WebP. Máximo {maxImageSizeMb}MB.
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push('/anuncios')}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !groupId}>
          {isSubmitting
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : <Megaphone className="h-4 w-4" aria-hidden="true" />}
          Agendar anúncio
        </Button>
      </div>
    </form>
  )
}
