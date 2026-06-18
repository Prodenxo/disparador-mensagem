'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export interface PrivateCampaignSectorOption {
  id: string
  name: string
}

export interface PrivateCampaignListOption {
  id: string
  name: string
  sectorId: string
  memberCount: number
}

interface PrivateCampaignFormProps {
  sectors: PrivateCampaignSectorOption[]
  lists: PrivateCampaignListOption[]
  maxImageSizeMb: number
}

export function PrivateCampaignForm ({
  sectors,
  lists,
  maxImageSizeMb
}: PrivateCampaignFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? '')
  const [listId, setListId] = useState('')
  const [message, setMessage] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [intervalSeconds, setIntervalSeconds] = useState('45')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sectorLists = useMemo(() => (
    lists.filter(list => list.sectorId === sectorId)
  ), [lists, sectorId])

  const selectedList = sectorLists.find(list => list.id === listId)

  async function handleSubmit (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!listId) {
      setError('Selecione uma lista de contatos')
      return
    }

    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    formData.set('name', name)
    formData.set('sectorId', sectorId)
    formData.set('listId', listId)
    formData.set('message', message)
    formData.set('scheduleDate', scheduleDate)
    formData.set('scheduleTime', scheduleTime)
    formData.set('intervalSeconds', intervalSeconds)

    try {
      const response = await fetch('/api/private-campaigns', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível criar a campanha')
        return
      }

      router.push('/privado')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da campanha</Label>
          <Input
            id="name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Ex.: Convite Almoço — Onda 1"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sectorId">Setor</Label>
          <Select
            id="sectorId"
            value={sectorId}
            onChange={event => {
              setSectorId(event.target.value)
              setListId('')
            }}
            required
          >
            {sectors.map(sector => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="listId">Lista de contatos</Label>
        <Select
          id="listId"
          value={listId}
          onChange={event => setListId(event.target.value)}
          required
        >
          <option value="">Selecione uma lista</option>
          {sectorLists.map(list => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.memberCount} contatos)
            </option>
          ))}
        </Select>
        {sectorLists.length === 0 && (
          <p className="text-xs text-text-muted">
            Nenhuma lista neste setor. Crie em Listas antes de disparar.
          </p>
        )}
        {selectedList && (
          <p className="text-xs text-text-muted">
            Tempo estimado: ~{Math.ceil((selectedList.memberCount * Number(intervalSeconds || 45)) / 60)} min
            com intervalo de {intervalSeconds}s entre envios.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensagem</Label>
        <textarea
          id="message"
          value={message}
          onChange={event => setMessage(event.target.value)}
          rows={5}
          placeholder="Olá! Você está convidado(a) para..."
          className="flex min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Imagem (opcional)</Label>
        <Input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
        <p className="text-xs text-text-muted">Máximo {maxImageSizeMb} MB</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="scheduleDate">Data</Label>
          <Input
            id="scheduleDate"
            type="date"
            value={scheduleDate}
            onChange={event => setScheduleDate(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduleTime">Horário</Label>
          <Input
            id="scheduleTime"
            type="time"
            value={scheduleTime}
            onChange={event => setScheduleTime(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="intervalSeconds">Intervalo (segundos)</Label>
          <Input
            id="intervalSeconds"
            type="number"
            min={15}
            max={300}
            value={intervalSeconds}
            onChange={event => setIntervalSeconds(event.target.value)}
            required
          />
          <p className="text-xs text-text-muted">Mínimo 15s para evitar bloqueio</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">{error}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          : <Send className="h-4 w-4" aria-hidden="true" />}
        Agendar disparo privado
      </Button>
    </form>
  )
}
