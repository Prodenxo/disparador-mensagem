# PRD — Disparador de Mensagem

## 1. Visão geral

Plataforma web interna para agendar e disparar comunicados em grupos de WhatsApp, com governança multi-setor, papéis hierárquicos e integração via Evolution API.

**Repositório:** `disparador-mensagem` (independente do robozap).

---

## 2. Personas

### Super Admin (TI / dono da plataforma)
- Configura Evolution API, setores e usuários globais
- Acessa todos os setores e históricos
- Cria outros Super Admins

### Admin de setor
- Gerencia funcionários do seu setor
- Libera ou bloqueia criação de anúncios por funcionário
- Cria, edita e cancela anúncios do setor

### Funcionário
- Visualiza histórico do setor
- Cria anúncios **somente** se o admin do setor permitir

---

## 3. User stories

### Autenticação
- Como usuário, quero fazer login com email e senha para acessar o painel.
- Como Super Admin, quero criar contas de usuários para minha equipe.

### Setores
- Como Super Admin, quero cadastrar setores para organizar comunicados por área.
- Como Admin de setor, quero ver apenas dados do meu setor.

### Permissões
- Como Admin de setor, quero ativar/desativar a permissão de criar anúncios por funcionário.
- Como Funcionário sem permissão, quero ver que não posso criar anúncios (sem erro confuso).

### Grupos
- Como Admin, quero listar grupos onde o bot está para escolher o destino do anúncio.
- Como Super Admin, quero sincronizar a lista de grupos com a Evolution API.

### Anúncios
- Como usuário autorizado, quero criar um anúncio com setor, grupo, texto, imagem opcional e horário.
- Como usuário, quero editar ou cancelar anúncios ainda não enviados.
- Como usuário, quero ver histórico de anúncios enviados e falhas.

### Disparo
- Como sistema, quero enviar a mensagem no horário agendado com menção a todos os participantes.
- Como sistema, quero registrar sucesso ou erro de cada disparo.

---

## 4. Requisitos funcionais

### RF-01 Autenticação
- Login email/senha
- Sessão segura (JWT ou cookie httpOnly)
- Logout

### RF-02 Papéis
- `SUPER_ADMIN` (global, tabela User)
- `SECTOR_ADMIN` (por setor, UserSector)
- `EMPLOYEE` (por setor, UserSector)
- Flag `canCreateAnnouncements` em UserSector (default false para employee)

### RF-03 Setores
- CRUD setores (Super Admin)
- Soft delete ou flag `active`

### RF-04 Usuários e equipe
- Super Admin: CRUD usuários, atribuir a setores, definir papel
- Admin setor: gerenciar employees do setor, toggle canCreateAnnouncements

### RF-05 Grupos WhatsApp
- Sync via Evolution API (`fetchAllGroups` / equivalente)
- Armazenar: jid, nome, participantCount, syncedAt
- Read-only no v1 (não cadastro manual)

### RF-06 Anúncios
- Campos: sectorId, groupJid, message, imagePath (opcional), scheduledAt, status, createdById
- Status: DRAFT | SCHEDULED | PROCESSING | SENT | FAILED | CANCELLED
- Edição/cancelamento apenas se status SCHEDULED ou DRAFT e scheduledAt > now

### RF-07 Disparo
- Worker consome fila Redis no horário
- Busca participantes do grupo
- Envia texto + imagem (se houver) via Evolution sendMedia/sendText
- Mentions: array com todos os JIDs de participantes (exceto bot)
- Grava DispatchLog

### RF-08 Histórico
- Listagem filtrada por setor, status, data
- Detalhe com erro técnico (para Super Admin)

---

## 5. Requisitos não-funcionais

- **Timezone:** `America/Sao_Paulo` configurável
- **Disponibilidade:** worker reinicia e reprocessa jobs pendentes
- **Segurança:** senhas bcrypt, HTTPS no Easypanel
- **Isolamento:** banco e apps separados do robozap
- **Performance:** suportar ~20 grupos, dezenas de anúncios/dia

---

## 6. Integrações

| Sistema | Uso |
|---------|-----|
| Evolution API | Listar grupos, participantes, enviar mensagem/mídia |
| MySQL | Persistência |
| Redis | Fila BullMQ |
| Storage local/volume | Imagens de anúncios |

**Importante:** não alterar webhook da Evolution usado pelo robozap. Este sistema só **envia** via API REST.

---

## 7. Casos de borda

| Caso | Comportamento |
|------|---------------|
| Grupo com 0 participantes | Falha registrada, status FAILED |
| Grupo muito grande (>512) | Tentar envio; aviso no painel ao agendar |
| Bot removido do grupo | Falha no disparo, log claro |
| Horário no passado ao salvar | Validação: rejeitar ou agendar imediato (config) |
| Evolution offline | Retry 3x, depois FAILED |
| Funcionário perde permissão após agendar | Disparo mantido (já agendado) ou cancelar — **decisão v1: mantém** |
| Imagem > 5MB | Rejeitar no upload |

---

## 8. Critérios de aceite (amostra)

**CA-01 Criar anúncio**
- Dado funcionário com `canCreateAnnouncements=true`
- Quando preenche formulário válido e agenda
- Então anúncio aparece como SCHEDULED e entra na fila

**CA-02 Bloqueio de funcionário**
- Dado funcionário com `canCreateAnnouncements=false`
- Quando acessa “Novo anúncio”
- Então vê mensagem de permissão negada

**CA-03 Disparo com menção**
- Dado anúncio SCHEDULED para agora
- Quando worker processa
- Então mensagem chega no grupo com mentions de todos participantes

**CA-04 Super Admin**
- Dado usuário SUPER_ADMIN
- Quando acessa setores
- Então vê todos os setores e pode criar novo

---

## 9. Modelo de dados (resumo)

```
User (globalRole?: SUPER_ADMIN)
Sector
UserSector (userId, sectorId, role, canCreateAnnouncements)
WhatsappGroup (jid, name, participantCount, syncedAt)
Announcement (sectorId, groupJid, message, imageUrl, scheduledAt, status, createdById)
DispatchLog (announcementId, status, error, sentAt, mentionCount)
```

---

## 10. Stack técnica

- Next.js 15+ App Router
- Prisma + MySQL
- BullMQ + Redis
- Worker Node separado (Easypanel)
- shadcn/ui + Tailwind
