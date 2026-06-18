'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { formatPhoneDisplay } from '@/lib/phone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export interface ContactSectorOption {
  id: string
  name: string
}

export interface ContactListOption {
  id: string
  name: string
  sectorId: string
}

export interface ContactListItem {
  id: string
  name: string
  phone: string
  notes: string | null
  sectorName: string
  listCount: number
}

interface ContactsManagerProps {
  contacts: ContactListItem[]
  sectors: ContactSectorOption[]
  lists: ContactListOption[]
  canCreate: boolean
}

export function ContactsManager ({
  contacts,
  sectors,
  lists,
  canCreate
}: ContactsManagerProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? '')
  const [listId, setListId] = useState('')
  const [csv, setCsv] = useState('')
  const [importListId, setImportListId] = useState('')
  const [importSectorId, setImportSectorId] = useState(sectors[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sectorLists = lists.filter(list => list.sectorId === sectorId)
  const importSectorLists = lists.filter(list => list.sectorId === importSectorId)

  async function handleCreate (event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('action', 'create')
    formData.set('name', name)
    formData.set('phone', phone)
    formData.set('notes', notes)
    formData.set('sectorId', sectorId)
    if (listId) formData.set('listId', listId)

    try {
      const response = await fetch('/api/contacts', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Erro ao cadastrar')
        return
      }

      setName('')
      setPhone('')
      setNotes('')
      setSuccess('Contato cadastrado.')
      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCsvFile (event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setCsv(text)
    event.target.value = ''
  }

  async function handleImport (event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('action', 'import')
    formData.set('sectorId', importSectorId)
    formData.set('csv', csv)
    if (importListId) formData.set('listId', importListId)

    try {
      const response = await fetch('/api/contacts', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Erro na importação')
        return
      }

      setCsv('')
      setSuccess(`${data.data.created} contato(s) importado(s). ${data.data.skipped} ignorado(s).`)
      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete (id: string) {
    setError(null)
    setDeletingId(id)

    try {
      const response = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Erro ao excluir')
        return
      }

      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Contatos</h1>
          <p className="mt-1 text-sm text-text-muted">
            Cadastre pessoas para receber mensagens no privado.
          </p>
        </div>
        <Link
          href="/privado"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Voltar para campanhas
        </Link>
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {success && <p className="text-sm text-success" role="status">{success}</p>}

      {canCreate && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleCreate} className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)] space-y-4">
            <h2 className="font-medium text-text-primary">Novo contato</h2>
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nome</Label>
              <Input id="contact-name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Telefone</Label>
              <Input id="contact-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="11999998888" required />
              <p className="text-xs text-text-muted">Celular com DDD e o 9 (ex.: 11999998888)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-sector">Setor</Label>
              <Select id="contact-sector" value={sectorId} onChange={e => { setSectorId(e.target.value); setListId('') }}>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.id}>{sector.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-list">Adicionar à lista (opcional)</Label>
              <Select id="contact-list" value={listId} onChange={e => setListId(e.target.value)}>
                <option value="">Nenhuma</option>
                {sectorLists.map(list => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-notes">Observação</Label>
              <Input id="contact-notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Cadastrar
            </Button>
          </form>

          <form onSubmit={handleImport} className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)] space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-medium text-text-primary">Importar CSV</h2>
              <a
                href="/templates/planilha-contatos.csv"
                download="planilha-contatos.csv"
                className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-text-primary transition-colors hover:bg-surface"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Baixar planilha modelo
              </a>
            </div>
            <p className="text-xs text-text-muted">
              Colunas: nome, telefone (uma linha por contato). Máximo 100 linhas.
              Abra o modelo no Excel ou Google Planilhas, preencha e salve como CSV.
            </p>
            <div className="space-y-2">
              <Label htmlFor="import-file">Arquivo CSV</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFile}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-sector">Setor</Label>
              <Select id="import-sector" value={importSectorId} onChange={e => { setImportSectorId(e.target.value); setImportListId('') }}>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.id}>{sector.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-list">Lista destino (opcional)</Label>
              <Select id="import-list" value={importListId} onChange={e => setImportListId(e.target.value)}>
                <option value="">Nenhuma</option>
                {importSectorLists.map(list => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-csv">Ou cole o conteúdo aqui</Label>
              <textarea
                id="import-csv"
                value={csv}
                onChange={e => setCsv(e.target.value)}
                rows={6}
                placeholder={'nome, telefone\nJoão, 11999998888\nMaria, 21988887777'}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-text-primary shadow-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar
            </Button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Nome</th>
              <th className="px-4 py-3 font-medium text-text-muted">Telefone</th>
              <th className="px-4 py-3 font-medium text-text-muted">Setor</th>
              <th className="px-4 py-3 font-medium text-text-muted">Listas</th>
              {canCreate && <th className="px-4 py-3 font-medium text-text-muted">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={canCreate ? 5 : 4} className="px-4 py-8 text-center text-text-muted">
                  Nenhum contato cadastrado.
                </td>
              </tr>
            ) : contacts.map(contact => (
              <tr key={contact.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium text-text-primary">{contact.name}</td>
                <td className="px-4 py-3 text-text-muted">{formatPhoneDisplay(contact.phone)}</td>
                <td className="px-4 py-3 text-text-muted">{contact.sectorName}</td>
                <td className="px-4 py-3 text-text-muted">{contact.listCount}</td>
                {canCreate && (
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      disabled={deletingId === contact.id}
                    >
                      {deletingId === contact.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                      Excluir
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
