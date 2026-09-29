# Módulo Agenda

## O que o usuário vai ver
- **Agenda do dia** (conforme protótipo): navegação ◀ Hoje ▶ com data por extenso; uma coluna por dentista; linhas por horário (intervalo de cada dentista, padrão 40 min); slots livres em cinza-claro com "livre" (clicar abre o agendamento já preenchido); consultas coloridas por status com paciente e procedimento; faixa "Intervalo de almoço"; fora da jornada fica hachurado/indisponível.
- **Agendar consulta** (janela lateral): paciente (busca por nome), dentista, procedimento, data, hora (só horários dentro da jornada), duração.
- **Conflito**: se o horário se sobrepõe a outra consulta do mesmo dentista, o botão Salvar fica bloqueado, o campo fica em vermelho com a mensagem do conflito e aparecem os 3 horários livres mais próximos como botões para escolher.
- **Detalhe da consulta** (clique no bloco): trocar status (Agendada, Confirmada, Em atendimento, Realizada, Cancelada, Falta), Remarcar (mesma validação de conflito) e Cancelar com motivo obrigatório — cancelada/falta libera o horário.
- **Lembretes de amanhã** (painel à direita): consultas do dia seguinte com "Copiar lembrete" e "Abrir WhatsApp" (wa.me com o telefone do paciente e a mensagem pronta, ex.: "Olá Marina, lembramos sua consulta amanhã, 30/09, às 09:20 com Dr. Carlos Prado. Responda para confirmar. — OdontoERP").
- **Configurações > Jornada dos dentistas** (admin): para cada dentista, dias da semana ativos, início, fim, almoço (início/fim) e duração do slot.
- **Permissões**: admin e recepcionista veem todos os dentistas e agendam/remarcam/cancelam; o dentista vê só a própria coluna e pode mudar o status das próprias consultas (sem criar/remarcar).

## Detalhes técnicos
- Migração em `appointments`: colunas `cancel_reason text`, `cancelled_at timestamptz`; CHECK nos 6 status (`agendada, confirmada, em_atendimento, realizada, cancelada, falta`).
- Proteção de conflito no banco: trigger `BEFORE INSERT/UPDATE` que rejeita sobreposição (`tstzrange(starts_at, starts_at + duração)`) com outra consulta ativa do mesmo dentista, e rejeita horário fora da jornada de `dentist_schedules`. A tela faz a mesma checagem antes para destacar e sugerir.
- Função `suggest_free_slots(dentist, data, duração, hora_alvo)` (security definer, só staff) retornando os 3 slots livres mais próximos, varrendo o dia e os próximos dias úteis se preciso.
- Dentista: política de update já existente; trigger impede dentista de alterar `starts_at/dentist_id/patient_id`.
- Rotas: `agenda.tsx` substitui o placeholder; `configuracoes.tsx` ganha a seção de jornada (grava em `dentist_schedules`, uma linha por dia). Leituras via cliente do navegador com RLS; React Query com invalidação após gravar.
- Utilitário `src/lib/schedule.ts` (gerar slots, detectar sobreposição, montar texto do lembrete, normalizar telefone para `55DDDNUMERO`).
- Testar com Ana (agendar, conflito, cancelar, lembretes), Dr. Carlos (só a própria coluna) e Roberto (jornada).
