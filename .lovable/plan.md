# OdontoERP — Fase 1 (base, login, perfis, Painel e Pacientes)

Observação: o texto cita protótipos em imagem, mas nenhuma imagem foi anexada. O layout seguirá a descrição (cores e organização). Se enviar as imagens, ajusto os detalhes.

## O que será construído

**Visual**
- Menu lateral fixo azul-petróleo (#1E4258) com "🦷 OdontoERP"; item ativo #2C5F8A com borda esquerda #7FD1C0.
- Ordem do menu: Painel, Pacientes, Agenda, Prontuários, Orçamentos, Financeiro, Estoque, Relatórios, Configurações — exibindo só o que o perfil pode ver.
- Barra superior branca: título da tela à esquerda; "Nome — Perfil" e "Sair" à direita.
- Fundo #EEF2F5, painéis brancos arredondados, botões #2C5F8A, etiquetas de status verde/amarelo/vermelho/azul.

**Login**
- Cartão centralizado sobre fundo azul-petróleo, e-mail e senha, "Esqueci minha senha" (envio de link + tela para definir nova senha).
- Bloqueio de 15 minutos após 3 tentativas erradas (controlado no servidor).

**Perfis (aplicados também no banco)**
- Administrador: tudo.
- Dentista: Painel, a própria Agenda, Prontuários.
- Recepcionista: Painel, Pacientes, Agenda de todos, Orçamentos, Financeiro.
- Acesso direto a uma tela proibida redireciona ao Painel.

**Painel**
- 4 cartões: Consultas hoje, Pacientes ativos, A receber no mês, Itens abaixo do mínimo (vermelho).
- "Próximas consultas de hoje" (hora, paciente, dentista, procedimento, status) e "Alertas" (estoque mínimo, validade próxima, lembretes de amanhã).
- Nesta fase, valores de consultas/financeiro/estoque vêm das tabelas básicas já criadas (com alguns exemplos); os módulos completos vêm depois.

**Pacientes**
- Lista com busca por nome, CPF ou telefone; filtro Ativos/Inativos; colunas nome, CPF mascarado, telefone, convênio, status.
- Novo/editar paciente: nome*, CPF* (validado e único), nascimento, telefone/WhatsApp*, e-mail, convênio, alergias/observações.
- CPF duplicado: aviso com botão "Abrir cadastro existente". Sem exclusão — apenas inativar/reativar.

**Demais módulos** (Agenda, Prontuários, Orçamentos, Financeiro, Estoque, Relatórios, Configurações): telas com "Em construção", respeitando as permissões, para as próximas fases.

**Dados de exemplo**
- 3 usuários: Carlos Mendes (Administrador), Dra. Juliana Ribeiro (Dentista), Ana Souza (Recepcionista) — segunda dentista Dr. Rafael Costa também com login. Senhas iniciais informadas ao final.
- 12 pacientes, 2 dentistas com horários de agenda configurados, algumas consultas de hoje/amanhã e itens de estoque para alimentar o Painel.

## Detalhes técnicos
- Tabelas: profiles, user_roles (enum admin/dentista/recepcionista) + has_role(), dentists, dentist_schedules, patients (cpf unique, active), appointments, receivables, stock_items, login_attempts.
- RLS por perfil com has_role(); dentista vê só appointments com seu dentist_id; patients apenas admin/recepcionista (dentista leitura para agenda/prontuário).
- Bloqueio de login via server function que verifica/registra tentativas antes de signInWithPassword.
- Rotas sob _authenticated com guarda de perfil por rota; e-mail/senha habilitado.
- Usuários de exemplo criados via server function administrativa de execução única; demais dados via migração.
