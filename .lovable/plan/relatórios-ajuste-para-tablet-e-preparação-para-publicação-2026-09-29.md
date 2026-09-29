# Relatórios, ajuste para tablet e preparação para publicação

## Relatórios (somente Administrador)

**Filtro de período** no topo: atalhos (Este mês, Mês passado, Últimos 3 meses, Este ano) + datas de/até. Vale para os relatórios 1–3; os relatórios 4 e 5 mostram a situação de hoje.

Cada relatório fica num painel com gráfico, pequena tabela de números e botão **"Exportar CSV"** (separador ";", acentos corretos para abrir no Excel).

1. **Faturamento** — total recebido (descontando estornos):
   - por mês (barras), por forma de pagamento (pizza), por dentista (barras).
   - Por dentista: como o recebimento não está ligado a uma consulta, cada valor é atribuído ao dentista da última consulta realizada do paciente até a data do pagamento; sem consulta, aparece como "Sem dentista".
2. **Produtividade** — consultas realizadas por dentista (barras) e os 10 procedimentos mais executados (etapas do plano concluídas no período).
3. **Comparecimento** — % Realizadas × Faltas × Canceladas (pizza + números), geral e por dentista.
4. **Contas a receber** — saldo em aberto em três faixas: a vencer, vencidas até 30 dias, vencidas há mais de 30 dias (barras + lista das parcelas).
5. **Estoque** — itens abaixo do mínimo e itens que vencem em até 60 dias (listas com saldo, mínimo, lote e validade).

## Tablet

- Menu lateral vira gaveta com botão ☰ em telas menores que 1024px; no computador continua fixo.
- Revisar Painel, Pacientes, Agenda (rolagem horizontal das colunas), Prontuário (duas colunas empilham), Orçamentos, Financeiro, Estoque e Relatórios em 768px e 1024px, corrigindo cortes e tabelas estouradas (rolagem horizontal onde necessário).

## Preparação para publicação

- Revisar títulos e descrições de todas as páginas (pt-BR, com dados para compartilhamento).
- Rodar a verificação de segurança e resolver os avisos que forem possíveis; explicar os restantes.
- Remover do login a lista de "Logins de teste" com senhas? **Mantida por padrão**, mas vou lembrar que ela deve sair antes do uso real — me diga se quer retirar já.
- Conferir console e erros em todas as telas com os três perfis.

## Detalhes técnicos
- Nova tela `relatorios.tsx` com recharts (já instalado) e consultas no navegador sob RLS de admin: `payments` (paid_on, method, amount, refunded_at), `appointments` (status, dentist_id), `treatment_plan_steps` concluídas com join em `clinical_evolutions.created_at` e `procedures`, `receivables` (vencida derivada na leitura), `stock_items`.
- Atribuição por dentista feita no cliente cruzando pagamentos com consultas realizadas do paciente.
- Utilitário `src/lib/csv.ts` (BOM UTF-8, ";").
- `AppShell`: estado de gaveta + Sheet em `< lg`; `ml-[210px]` só em `lg`.
- Teste com Playwright em 768×1024 e 1024×768.
