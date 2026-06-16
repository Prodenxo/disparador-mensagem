# DESIGN-GUIDELINES — Disparador de Mensagem

## Referências visuais

- [Linear](https://linear.app)
- [Resend](https://resend.com)
- [Vercel Dashboard](https://vercel.com)

Estilo: clean, light mode, profissional, uso interno corporativo.

---

## Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| Primary | `#2563EB` | Botões, links, foco |
| Primary foreground | `#FFFFFF` | Texto em botão primário |
| Background | `#FAFAFA` | Fundo da app |
| Surface | `#FFFFFF` | Cards, sidebar |
| Border | `#E5E7EB` | Divisores |
| Text primary | `#111827` | Títulos |
| Text muted | `#6B7280` | Labels, hints |
| Success | `#059669` | Enviado |
| Warning | `#D97706` | Agendado |
| Danger | `#DC2626` | Falhou / cancelar |

---

## Tipografia

- Font: **Inter** (Google Fonts)
- Escala base: 4px / 8px
- Título página: 24px semibold
- Corpo: 14px regular
- Label form: 12px medium uppercase opcional

---

## Espaçamento e radius

- Base: 8px
- Gap cards: 24px
- Padding card: 16–24px
- Border radius padrão: 8px (`rounded-lg`)
- Border radius botão: 6px

---

## Sombras

- Card: `0 1px 3px rgb(0 0 0 / 0.08)`
- Modal: `0 8px 30px rgb(0 0 0 / 0.12)`

---

## shadcn/ui — componentes

| Componente | Uso |
|------------|-----|
| Button | CTAs, ações de tabela |
| Input / Textarea | Formulários |
| Select | Setor, grupo |
| Table | Listas de anúncios, grupos, equipe |
| Dialog | Confirmar cancelamento |
| Switch | “Pode criar anúncio” |
| Badge | Status (agendado, enviado, falhou) |
| Toast | Feedback de ações |
| Calendar + time picker | Agendamento |
| Avatar | Usuário no header |
| Sidebar | Navegação principal |

---

## Status de anúncio (badges)

- `DRAFT` — cinza
- `SCHEDULED` — amarelo/âmbar
- `PROCESSING` — azul
- `SENT` — verde
- `FAILED` — vermelho
- `CANCELLED` — cinza riscado
