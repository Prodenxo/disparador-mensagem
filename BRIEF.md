# BRIEF — Disparador de Mensagem

## Problema

Comunicados internos em grupos de WhatsApp dependem de envio manual, sem controle de setor, histórico ou agendamento.

## Solução

Plataforma web para criar, agendar e disparar anúncios em grupos onde o bot está presente, com menção em massa e governança por setor.

## Público-alvo

Funcionários e administradores de setores da empresa que usam grupos de WhatsApp para comunicação interna.

## Diferencial

- Multi-setor com permissões (admin / funcionário / super admin)
- Agendamento confiável com worker e fila
- Histórico e rastreabilidade de cada disparo
- Integração com Evolution API (mesma instância do bot, sem interferir no robô de comandos)

## Modelo de negócio

Ferramenta interna (sem monetização no v1).

## Métricas de sucesso

- 100% dos anúncios agendados disparam no horário ou registram falha explícita
- Admins conseguem liberar/bloquear criação por funcionário em menos de 3 cliques
- Zero impacto no robô WhatsApp existente (robozap)
