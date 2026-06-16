# MVP-SCOPE — Disparador de Mensagem

## Must (v1)

| Prioridade | Item |
|------------|------|
| Must | Autenticação (email + senha) |
| Must | Super Admin global |
| Must | CRUD de setores (Super Admin) |
| Must | Admin de setor + funcionários por setor |
| Must | Flag `can_create_announcements` por funcionário |
| Must | Sync/listagem de grupos WhatsApp (Evolution) |
| Must | CRUD anúncios: setor, grupo, texto, imagem opcional, data/hora |
| Must | Worker + fila Redis para disparo no horário |
| Must | Envio com menção a todos os participantes |
| Must | Histórico de envios (sucesso / falha) |
| Must | Editar e cancelar anúncios futuros |
| Must | Deploy Easypanel: web + worker + MySQL + Redis |

## Should (v1 se couber)

| Prioridade | Item |
|------------|------|
| Should | Aviso no painel para grupos muito grandes (>256 membros) |
| Should | Preview da mensagem antes de agendar |
| Should | Reenvio manual de anúncio falho |

## Could (pós-v1)

- Relatórios por setor
- Dashboard de métricas
- Múltiplas instâncias WhatsApp
- SSO / LDAP
- Outros canais (email, Telegram)

## Fora do MVP

- App mobile nativo
- Editor rich text avançado
- A/B testing de mensagens
- Integração com ERP

## Hipóteses a validar

1. Menção em massa funciona de forma estável em grupos de até ~500 membros
2. Uma instância Evolution suporta web (painel) + robozap (webhook) sem conflito
3. Admins de setor adotam o fluxo de liberar funcionários sob demanda

## Critérios de sucesso do MVP

- 3 setores piloto usando o painel por 30 dias
- ≥95% dos disparos agendados concluídos com status registrado
- Nenhuma regressão no robozap existente
