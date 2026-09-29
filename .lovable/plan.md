# Módulo Prontuários

Acesso: Dentista (só pacientes com consulta com ele) e Administrador (todos).

## O que será feito

**1. Abrir atendimento a partir da consulta**
- Na Agenda e no Painel, cada consulta do dia ganha o botão "Abrir atendimento". Ele leva ao prontuário do paciente, ligado àquela consulta.
- Ao abrir, a consulta passa para "Em atendimento".
- A página Prontuários também tem uma busca de paciente, para consultar o prontuário sem atendimento. Nesse caso, a tela é só leitura (sem gravar evolução).

**2. Layout em duas colunas, como no protótipo**
- Esquerda: cabeçalho do paciente (nome, idade, convênio, alertas clínicos), odontograma, plano de tratamento e campo de evolução.
- Direita: histórico de evoluções, da mais recente para a mais antiga.

**3. Odontograma interativo**
- 32 dentes na numeração FDI: 18–11 | 21–28 em cima e 48–41 | 31–38 embaixo. Cada dente tem 5 faces (vestibular, lingual/palatina, mesial, distal, oclusal/incisal).
- Ao clicar num dente, abre um quadro para marcar cada face: hígido, cárie, restaurado, canal em tratamento. "Ausente" e "A extrair" valem para o dente inteiro.
- As cores seguem a legenda do protótipo. A marcação é salva no banco na hora.

**4. Evolução do atendimento**
- Campo de texto. Ao gravar, a evolução fica permanente: não pode ser editada nem excluída, nem mesmo pelo administrador. Registra o autor, a data e a hora.
- Essa regra vale no banco de dados, não só na tela.

**5. Plano de tratamento**
- Etapas com procedimento (da tabela de procedimentos), dente(s), ordem e status (Pendente, Em andamento, Concluída).
- É possível adicionar etapas, reordenar e mudar o status.
- Na evolução, o dentista marca quais etapas fez naquele atendimento. Quando a evolução é gravada, essas etapas viram "Concluída" e o texto registra os procedimentos feitos.

**6. Botões do atendimento**
- **Salvar rascunho:** guarda o texto da evolução, que continua editável, e a consulta fica "Em atendimento".
- **Finalizar atendimento:** grava a evolução em definitivo, conclui as etapas marcadas e a consulta vira "Realizada".

**7. Cadastro de procedimentos (Configurações)**
- Nova seção com código, nome e valor em R$. Permite incluir, editar e desativar. Só o Administrador edita.
- Virá com cerca de 10 procedimentos comuns de exemplo (ex.: restauração, canal, extração, limpeza). Os valores são inventados e devem ser trocados pelos reais.

## Detalhes técnicos

- Novas tabelas, todas com GRANT e RLS:
  - `procedures`: code único, name, price, active. Leitura para usuários logados; escrita só para admin.
  - `tooth_conditions`: patient_id, tooth, face (nulo = dente inteiro), condition. Única por (patient, tooth, face).
  - `treatment_plan_steps`: patient_id, procedure_id, teeth smallint[], step_order, status, completed_note_id.
  - `clinical_evolutions`: patient_id, appointment_id, author_id, author_name, content, created_at. Só permite ver e incluir. Um trigger bloqueia qualquer alteração ou exclusão, e author_id/created_at são preenchidos pelo servidor.
  - `evolution_drafts`: appointment_id único, content.
- RLS: admin tem acesso total. O dentista só acessa pacientes com os quais tem consulta (reaproveitando `current_dentist_id()`). O recepcionista não acessa.
- "Finalizar atendimento" chama uma função no banco que, de uma vez, insere a evolução, conclui as etapas, apaga o rascunho e marca a consulta como realizada.
- Rota `/prontuarios` (busca de paciente) e `/prontuarios/$patientId?appointment=...` (atendimento).
- As cores das condições entram como variáveis de tema em `styles.css`.
