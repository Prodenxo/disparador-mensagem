# PANEL-SPEC — Estrutura do painel (Disparador de Mensagem)

## Layout geral

- Sidebar fixa (desktop) / drawer (mobile)
- Header: nome do setor ativo + usuário + logout
- Super Admin: seletor global de setor ou visão “Todos”

---

## Telas (ordem de navegação)

### 1. Login

- Objetivo: autenticar usuário autorizado
- Layout: card central, email, senha, botão entrar
- Elementos: logo/nome “Disparador de Mensagem”

### 2. Dashboard (home)

- Objetivo: visão rápida do setor
- Layout: grid de cards
- Blocos: anúncios agendados hoje, últimos enviados, falhas recentes
- CTA principal: “Novo anúncio” (se permitido)

### 3. Anúncios — Lista

- Objetivo: gerenciar todos os anúncios do escopo do usuário
- Layout: tabela com filtros (status, setor, data)
- Colunas: título/resumo, setor, grupo, agendado para, status, ações
- Ações: editar, cancelar (só futuros), ver detalhe

### 4. Anúncio — Criar / Editar

- Objetivo: fluxo principal de agendamento
- Layout: formulário em etapas ou página única com seções
- Campos: setor (select), grupo (select), mensagem (textarea), imagem (upload opcional), data, hora
- Rodapé: salvar rascunho, agendar, cancelar

### 5. Anúncio — Detalhe / Histórico

- Objetivo: auditoria de um disparo
- Layout: timeline + metadados
- Blocos: conteúdo enviado, participantes mencionados, log de erro, timestamps

### 6. Grupos WhatsApp

- Objetivo: listar grupos onde o bot está
- Layout: tabela + botão “Sincronizar agora”
- Colunas: nome, JID, qtd participantes, última sync

### 7. Setores (Super Admin)

- Objetivo: CRUD de setores
- Layout: lista + modal criar/editar
- Campos: nome, slug, ativo

### 8. Equipe do setor (Admin setor + Super Admin)

- Objetivo: gerenciar membros e permissões
- Layout: tabela de usuários do setor
- Colunas: nome, email, papel, pode criar anúncio (toggle), ações
- Ações: convidar, remover, promover a admin

### 9. Usuários globais (Super Admin)

- Objetivo: gestão de contas e Super Admins
- Layout: tabela + criar usuário
- Campos: nome, email, papel global

### 10. Configurações (Super Admin)

- Objetivo: Evolution API, timezone, limites
- Layout: formulário de variáveis de sistema
- Campos: URL Evolution, API Key, instance name, TZ padrão

---

## Hierarquia de CTAs

1. Primário: Novo anúncio / Agendar
2. Secundário: Sincronizar grupos
3. Terciário: Ver histórico

## Permissões por tela

| Tela | Super Admin | Admin setor | Funcionário |
|------|-------------|-------------|-------------|
| Dashboard | ✓ | ✓ | ✓ (read) |
| Criar anúncio | ✓ | ✓ | ✓ se liberado |
| Setores | ✓ | — | — |
| Equipe | ✓ | ✓ (seu setor) | — |
| Config Evolution | ✓ | — | — |
