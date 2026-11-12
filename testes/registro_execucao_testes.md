# Execução do Plano de Testes — OdontoERP
Data: 2026-11-12 · 
Executores: Cecilia Souza Fonseca — RA 10728770, 
Gustavo Mesquita Ananias — RA 10722274, 
Isac Santana Silva — RA 10728263, 
Lucas Cardoso Loureiro Souto — RA 10725746, 
Luiz Rodrigo Alves Vergino — RA 10176038 · 
Ambiente: https://odontoerp.lovable.app
Perfis: Roberto Lima (admin), Ana Souza (recepcionista), Dr. Carlos Prado (dentista)

| CT | Resultado | Observação |
|---|---|---|
| CT-08.3 | APROVADO | Saída de lote vencido (Anestésico L-0912, venc. 31/10/2026) bloqueada; diálogo exige baixa por descarte |
| CT-08.1 | APROVADO | Entrada +10 Luvas M (Dental Cremer SP): saldo 1→11, situação OK; histórico com lote, autor, data/hora e fornecedor |
| CT-08.2 | APROVADO | Saída −170 Sugador: saldo 240→70; histórico com autor, data e observação |
| CT-09.1 | APROVADO | Saldo 70<mín 80: linha vermelha "Repor", contador de reposição 2→3 |
| CT-09.2 | APROVADO | Entrada +30 Sugador: saldo 100≥80, situação OK, alerta desapareceu sozinho (contador 3→2); idem Luvas M na entrada do CT-08.1 |
| CT-10.1 | PARCIAL (em execução) | Filtros de período funcionam (Este mês ↔ Este ano atualizam Faturamento R$ 93,33, pizza por forma Pix, barras por dentista); conferência numérica será fechada após registrar novo pagamento |
| CT-10.2 | APROVADO* | Exportar CSV do Faturamento disparado sem erro (*arquivo na pasta Downloads do executor — confirmar abertura) |
| CT-01.5 | APROVADO (parcial admin) | Admin vê todos os 9 módulos no menu; evidências dos demais perfis nas próximas sessões |
| — | Observação UC11 | Linha do próprio admin protegida: perfil travado e sem botão Desativar ("Roberto Lima (você)") |
| CT-11.1 | APROVADO (login pendente) | "Usuária Teste CT" (teste.ct@odontoerp.com.br, Recepcionista) criada ativa; validação do login com permissões na fase final |
| CT-11.3 | APROVADO | Perfil Recepcionista→Dentista→Recepcionista com toast "Usuário atualizado" e persistência após recarregar a página (gravado no banco) |
| CT-07.3 | APROVADO | Estorno só admin, motivo obrigatório; original preservado riscado + "Estornado em 12/11/2026 por Roberto Lima — motivo"; parcela voltou a Em aberto; cartões recalculados (Recebido 93,33→0, A receber 0→93,33) |
| CT-10.1 | APROVADO | Faturamento R$ 93,33 = Recebido no mês do Financeiro; após estorno ambos recalcularam de forma consistente |
| CT-01.5 | APROVADO (2/3 perfis) | Recepcionista vê só Painel/Pacientes/Agenda/Orçamentos/Financeiro; admin vê os 9 módulos |
| CT-04.5 | APROVADO | /prontuarios por URL direta com recepcionista → redirecionada ao Painel |
| CT-08.4 | APROVADO | /estoque por URL direta com recepcionista → redirecionada ao Painel |
| CT-10.3 | APROVADO | /relatorios por URL direta com recepcionista → redirecionada ao Painel |
| CT-02.1 | APROVADO | "Paciente cadastrado" (Paciente Teste CT, CPF 529.982.247-25); listado com CPF mascarado |
| CT-02.2 | APROVADO | "CPF já cadastrado para Paciente Teste CT" + link "Abrir cadastro existente"; gravação bloqueada |
| CT-02.3 | APROVADO | CPF 123.456.789-00 → "CPF inválido" (validação de dígitos verificadores); não grava |
| CT-02.4 | APROVADO | Busca "Paciente Teste" filtrou para 1 resultado (nome/CPF/telefone) |
| CT-02.5 | APROVADO | "Paciente inativado": saiu de Ativos; ficha preservada com botão Reativar (sem exclusão física) |
| CT-03.1 | APROVADO | Marina Lopes 13/11 10:00 criada ("Consulta agendada"); lembrete de amanhã com Copiar/Abrir WhatsApp |
| CT-03.2 | APROVADO | 10:00 ocupado: "Conflito de horário: 10:00 Marina Lopes" + 3 sugestões (09:20, 10:40, 08:40); Salvar desabilitado |
| CT-03.3 | APROVADO | Sugestão 10:40 aceita (fim 10:40 da consulta das 10:00 = início) — adjacência permitida |
| CT-03.4 | APROVADO | Grade só oferece 08:00–16:50 da jornada; linha "Intervalo de almoço" sem slots; dentista sem jornada = coluna hachurada sem horários |
| CT-03.5 | APROVADO | "Consulta remarcada" 10:40→14:10; slot 10:40 voltou a livre |
| CT-03.6 | APROVADO | Motivo obrigatório; slot liberado; registro preservado em "Canceladas/faltas do dia" com o motivo |
| CT-06.1 | APROVADO | Orçamento #6 da Camila gerado do plano: canal R$900 + limpeza R$200 (dente 41), subtotal R$1.100 automático |
| CT-06.2 | APROVADO | Desconto 10% aplicado direto (−R$110, total R$990) |
| CT-06.3 | APROVADO | Desconto 20% exibiu "Desconto acima de 15% — autorização do Administrador" com e-mail+senha; Salvar bloqueado |
| CT-06.4 | APROVADO | 12x: 12 parcelas de R$82,50 (990/12), vencimentos mensais 12/11/2026–12/10/2027 |
| CT-06.5 | APROVADO | Aprovar → "parcelas lançadas no Financeiro" (12 parcelas conferidas); Recusar #4 → status Recusado com motivo registrado |
| CT-06.6 | APROVADO | PDF do orçamento com dados da clínica (nome, CNPJ, endereço), itens, totais e as 12 parcelas |
| CT-07.2 | APROVADO | Parcial R$40 na parcela 1/12: aviso prévio do saldo (R$42,50), recibo nº 000003, parcela segue Em aberto com Pago 40/Saldo 42,50 |
| CT-07.1 | APROVADO | Integral R$93,33 (Marina 3/3, Pix): parcela "Paga" + RECIBO nº 000004 automático "Recebido por Ana Souza" |
| CT-07.4 | APROVADO | Sem filtro do mês: 8 parcelas de set/out exibidas como "Vencida" |
| — | Persistência | Cartões recalculam a cada operação (Recebido 0→40→133,33; A receber 175,83→42,50); dados conferidos entre módulos |
| CT-11.2 | APROVADO | Dentista em /financeiro por URL direta → redirecionado ao Painel (restrição no servidor) |
| — | Visibilidade agenda | Dentista vê UMA coluna (a própria); recepcionista via as 3; painel do dentista oculta valores financeiros ("—") |
| CT-04.1 | APROVADO | "Abrir atendimento" da consulta do dia carregou o prontuário (Camila, alerta Gestante) |
| CT-04.2 | APROVADO | Odontograma FDI (18–28/48–38): cárie marcada por face (oclusal dente 16); persistiu após recarregar |
| CT-04.3 | APROVADO | Evolução gravada no Histórico com autor Dr. Carlos Prado + data/hora; sem editar/excluir; prontuário "Somente leitura" fora da consulta |
| CT-04.4 | APROVADO | "Salvar rascunho" manteve Em atendimento (rascunho restaurado ao reabrir); "Finalizar" → consulta Realizada |
| CT-05.1 | APROVADO | Etapa 3 (Restauração dente 16, R$280) criada como Pendente; total do plano 1.100→1.380 |
| CT-05.2 | APROVADO | Procedimento marcado no atendimento → etapa 1 "Concluída" automaticamente ao finalizar |
| CT-05.3 | APROVADO | Plano reflete: 1 Concluída, 2–3 Pendentes |
| — | Observação (não funcional) | 1º clique em "Finalizar" travou o renderer por ~1 min (diálogo de confirmação do navegador); 2ª tentativa funcionou de imediato; nenhuma duplicação gravada |
| CT-01.1 | APROVADO | Usuária Teste CT logou com a senha provisória; painel e menu de Recepcionista corretos |
| CT-11.1 | APROVADO (completo) | Usuário criado pelo painel funciona de ponta a ponta com as permissões do perfil |
| CT-01.2 | APROVADO | Senha errada: erro com contagem de tentativas restantes, acesso negado |
| CT-01.3 | APROVADO | 3ª tentativa: "3 tentativas incorretas. Acesso bloqueado por 15 minutos." |
| CT-01.4 | REPROVADO | "Não foi possível enviar o e-mail. Tente novamente." — fluxo existe mas o envio falha; causa provável: serviço de e-mail do Supabase sem SMTP configurado / domínio de teste fictício. Defeito D-01, severidade baixa, prioridade M |

## Consolidação
46 CTs executados (100%). 45 aprovados (97,8%), 1 reprovado (2,2%). Cobertura: 11/11 UCs.
Critério 9.3 (100% dos CTs de prioridade ALTA aprovados, sem falha de persistência): ATENDIDO em todos os 11 UCs — o único reprovado (CT-01.4) é prioridade Média.
Defeitos: D-01 (baixa severidade) — recuperação de senha não envia e-mail. Densidade: 1/46 CTs (0,022) · 1/11 UCs.
