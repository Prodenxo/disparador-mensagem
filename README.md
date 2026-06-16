# Disparador de Mensagem

Painel web para agendar e disparar anúncios em grupos de WhatsApp via Evolution API, com governança multi-setor e **Super Admin**.

Repositório **independente** do [robozap](../robozap) — não altera webhook nem comandos do bot.

## Stack

- Next.js 15 + TypeScript
- Prisma + MySQL
- Redis + BullMQ (worker de disparo)
- Evolution API (somente envio REST)

## Papéis

| Papel | Escopo |
|-------|--------|
| **Super Admin** | Global — setores, usuários, config Evolution |
| **Admin de setor** | Equipe e anúncios do setor |
| **Funcionário** | Cria anúncio se `canCreateAnnouncements=true` |

## Desenvolvimento local

```bash
cp .env.example .env
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev          # painel :3000
npm run worker       # fila de disparos
```

## Deploy Easypanel

1. Crie app Git apontando para este repo
2. Serviços: **web** (porta 3000), **worker**, **mysql**, **redis**
3. Volume compartilhado `uploads` entre web e worker
4. Variáveis: copie de `.env.example`
5. Após primeiro deploy (no terminal do serviço **web**):
   ```bash
   npm run db:push
   npm run db:seed
   ```
   > Não use `npx prisma` solto — baixa Prisma 7 e quebra. Use `npm run db:push`.

### Evolution API

Use a **mesma instância** do robozap (`EVOLUTION_INSTANCE_NAME`), mas **não mude o webhook** — este sistema só envia mensagens.

## Documentação

- [BRIEF.md](./BRIEF.md)
- [PRD.md](./PRD.md)
- [MVP-SCOPE.md](./MVP-SCOPE.md)
- [PANEL-SPEC.md](./PANEL-SPEC.md)
- [DESIGN-GUIDELINES.md](./DESIGN-GUIDELINES.md)

## Próximos passos (implementação UI)

- [x] Sessão custom com bcrypt + cookie httpOnly (JWT)
- [x] Layout base do painel (sidebar, header, dashboard)
- [x] CRUD setores / usuários (Super Admin)
- [ ] Sync grupos Evolution
- [ ] Formulário de anúncio + upload imagem
- [ ] Dashboard histórico
