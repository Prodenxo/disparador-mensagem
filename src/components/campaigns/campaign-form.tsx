'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { GroupSelect } from '@/components/groups/group-select'

export interface CampaignSectorOption {
  id: string
  name: string
}

export interface CampaignGroupOption {
  id: string
  name: string
  participantCount: number
}

export interface CampaignFormInitialValues {
  name: string
  sectorId: string
  groupId: string
  message: string
  mentionAll: boolean
  active: boolean
  intervalValue: number
  intervalUnit: 'minutes' | 'hours'
  hasImage: boolean
}

interface CampaignFormProps {
  mode: 'create' | 'edit'
  campaignId?: string
  sectors: CampaignSectorOption[]
  groups: CampaignGroupOption[]
  initialValues: CampaignFormInitialValues
  maxImageSizeMb: number
}

export function CampaignForm ({
  mode,
  campaignId,
  sectors,
  groups,
  initialValues,
  maxImageSizeMb
}: CampaignFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialValues.name)
  const [sectorId, setSectorId] = useState(initialValues.sectorId)
  const [groupId, setGroupId] = useState(initialValues.groupId)
  const [message, setMessage] = useState(initialValues.message)
  const [mentionAll, setMentionAll] = useState(initialValues.mentionAll)
  const [active, setActive] = useState(initialValues.active)
  const [intervalValue, setIntervalValue] = useState(String(initialValues.intervalValue))
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours'>(initialValues.intervalUnit)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!groupId) {
      setError('Selecione um grupo')
      return
    }

    const parsedInterval = Number(intervalValue)

    if (!intervalValue.trim() || Number.isNaN(parsedInterval) || parsedInterval < 1) {
      setError('Informe um intervalo válido (mínimo 1)')
      return
    }

    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('name', name)
    formData.set('sectorId', sectorId)
    formData.set('groupId', groupId)
    formData.set('message', message)
    formData.set('mentionAll', mentionAll ? 'true' : 'false')
    formData.set('active', active ? 'true' : 'false')
    formData.set('intervalValue', intervalValue.trim())
    formData.set('intervalUnit', intervalUnit)
    formData.set('removeImage', removeImage ? 'true' : 'false')

    const url = mode === 'create' ? '/api/campaigns' : `/api/campaigns/${campaignId}`
    const method = mode === 'create' ? 'POST' : 'PUT'

    try {
      const response = await fetch(url, { method, body: formData })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível salvar a campanha')
        return
      }

      router.push('/campanhas')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-background/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Campanha ativa</p>
            <p className="text-xs text-text-muted mt-1">
              {active
                ? 'Ligada: dispara no intervalo até você desligar.'
                : 'Desligada: nenhum disparo será enviado.'}
            </p>
          </div>
          <Switch
            id="campaign-active"
            checked={active}
            onCheckedChange={setActive}
            label={active ? 'Ligada' : 'Desligada'}
          />
        </div>
        <input type="hidden" name="active" value={active ? 'true' : 'false'} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-name">Nome da campanha</Label>
        <Input
          id="campaign-name"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Ex.: Aviso diário — equipe comercial"
          required
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="campaign-sector">Setor</Label>
          <Select
            id="campaign-sector"
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
          <Label htmlFor="campaign-group">Grupo</Label>
          <GroupSelect
            id="campaign-group"
            inputId="campaign-group"
            groups={groups}
            value={groupId}
            onChange={setGroupId}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-message">Mensagem</Label>
        <textarea
          id="campaign-message"
          value={message}
          onChange={event => setMessage(event.target.value)}
          required
          rows={6}
          placeholder="Texto que será repetido a cada intervalo."
          className="flex min-h-[140px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      <div className="rounded-lg border border-border bg-background/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Mencionar todos</p>
            <p className="text-xs text-text-muted mt-1">
              {mentionAll
                ? 'Ativo: todos os participantes serão marcados (@).'
                : 'Inativo: mensagem enviada sem menções.'}
            </p>
          </div>
          <Switch
            id="campaign-mention-all"
            checked={mentionAll}
            onCheckedChange={setMentionAll}
            label={mentionAll ? 'Ativo' : 'Inativo'}
          />
        </div>
        <input type="hidden" name="mentionAll" value={mentionAll ? 'true' : 'false'} />
      </div>

      <div className="rounded-lg border border-border bg-background/40 p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Intervalo entre disparos</h2>
          <p className="text-xs text-text-muted mt-1">
            Enquanto a campanha estiver ligada, a mensagem será reenviada neste intervalo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="campaign-interval-value">A cada</Label>
            <Input
              id="campaign-interval-value"
              type="number"
              min={1}
              max={intervalUnit === 'hours' ? 168 : 10080}
              inputMode="numeric"
              value={intervalValue}
              onChange={event => setIntervalValue(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-interval-unit">Unidade</Label>
            <Select
              id="campaign-interval-unit"
              value={intervalUnit}
              onChange={event => setIntervalUnit(event.target.value as 'minutes' | 'hours')}
            >
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-image">Imagem (opcional)</Label>
        {mode === 'edit' && initialValues.hasImage && !removeImage && (
          <p className="text-xs text-text-muted">
            Esta campanha já possui imagem. Envie uma nova para substituir ou marque remover abaixo.
          </p>
        )}
        <Input
          id="campaign-image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
        <p className="text-xs text-text-muted">
          JPG, PNG ou WebP. Máximo {maxImageSizeMb}MB.
        </p>
        {mode === 'edit' && initialValues.hasImage && (
          <label className="mt-2 flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={removeImage}
              onChange={event => setRemoveImage(event.target.checked)}
            />
            Remover imagem atual
          </label>
        )}
        <input type="hidden" name="removeImage" value={removeImage ? 'true' : 'false'} />
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push('/campanhas')}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !groupId}>
          {isSubmitting
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : <Radio className="h-4 w-4" aria-hidden="true" />}
          {mode === 'create' ? 'Criar campanha' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
