function PlaceholderPage ({
  title,
  description
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">{description}</p>
    </div>
  )
}

export default function EquipePage () {
  return (
    <PlaceholderPage
      title="Equipe do setor"
      description="Gestão de membros e permissões será implementada em breve."
    />
  )
}
