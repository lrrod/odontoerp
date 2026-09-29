# Módulos Orçamentos e Financeiro

Acesso: Recepcionista e Administrador (já previsto no menu). Dentista não vê nenhum dos dois.

## Orçamentos
- **Lista** de orçamentos com busca por paciente e filtro por status (Aguardando aprovação, Aprovado, Recusado).
- **Novo orçamento:** escolher o paciente e carregar as etapas pendentes do plano de tratamento dele. Cada item mostra procedimento, dente(s) e valor da tabela. A recepção pode desmarcar itens. O subtotal é calculado na hora.
- **Desconto** em % ou em R$. Se passar de 15% do subtotal, aparece um pedido de autorização: o administrador digita o e-mail e a senha dele ali mesmo. A senha é conferida no servidor, e o nome de quem autorizou fica gravado no orçamento.
- **Condições:** à vista ou parcelado de 2x a 12x, com 1º vencimento escolhido e parcelas mensais. A tabela de parcelas aparece em tempo real, e os centavos que sobram vão para a 1ª parcela.
- **Status:** "Aprovar" gera as parcelas no Financeiro. "Recusar" pede o motivo. Depois de aprovado ou recusado, o orçamento não pode mais ser editado.
- **Gerar PDF:** documento com os dados da clínica (nome, CNPJ, endereço, telefone), paciente, itens, desconto, total, condições e parcelas, além da validade e de um espaço para assinatura.
- **Dados da clínica:** nova seção em Configurações, só para o administrador. Vou preencher com dados inventados para você trocar pelos reais.

## Financeiro
- **Resumo do mês** em 3 cartões: Recebido, A receber e Vencido. Há um seletor de mês.
- **Parcelas:** lista com paciente, descrição, vencimento, valor, valor pago, saldo e status: Em aberto, Paga ou Vencida. Uma parcela fica "Vencida" quando o vencimento já passou e ainda há saldo. Dá para filtrar por paciente e por status.
- **Registrar recebimento:** escolher a forma de pagamento (Dinheiro, Cartão de crédito, Cartão de débito ou Pix), a data e o valor. O valor não pode ser maior que o saldo. Num pagamento parcial, o saldo continua em aberto. O recibo abre automaticamente, pronto para imprimir ou salvar em PDF, e pode ser emitido de novo depois.
- **Histórico de recebimentos** de cada parcela.
- **Estorno:** só o administrador pode fazer, e o motivo é obrigatório. O recebimento original continua visível, marcado como "Estornado", com o motivo, quem estornou e quando. O saldo da parcela volta ao valor anterior.
- As contas a receber de exemplo que já existem aparecem nessa lista.

## Detalhes técnicos
- Novas tabelas:
  - `clinic_settings`, com uma única linha: leitura para usuários logados e edição só pelo administrador.
  - `quotes`, com paciente, subtotal, tipo e valor do desconto, total, número de parcelas, 1º vencimento, status, motivo da recusa, quem autorizou o desconto e quem criou.
  - `quote_items`, com etapa do plano, procedimento, dentes e valor.
  - `payments`, com parcela, forma, data, valor, recibo sequencial, dados do estorno (motivo, autor, data) e um trigger que bloqueia exclusão e qualquer alteração que não seja o estorno.
- `receivables` ganha `quote_id` e `installment_no`. O status passa a ser "aberto" ou "paga", calculado pela soma dos pagamentos não estornados. "Vencida" é calculado na hora da consulta.
- Regras de acesso (RLS): recepção e administrador leem e gravam orçamentos, parcelas e pagamentos. O estorno é feito pela função `refund_payment`, que confere se quem pede é administrador.
- A recepção não tem acesso ao plano de tratamento pelas regras do prontuário. Por isso, a função `quote_plan_items(patient)` devolve só procedimento, dentes e valor das etapas pendentes, para recepção e administrador.
- Operações atômicas no banco:
  - `approve_quote` muda o status e gera as parcelas.
  - `register_payment` valida o saldo, grava o pagamento e atualiza o status da parcela.
- Um trigger em `quotes` recusa desconto acima de 15% sem `discount_approved_by`. Esse campo só é preenchido pela função de servidor `authorizeDiscount`: ela confere a senha do administrador por um login temporário, verifica o papel dele e grava o orçamento. Assim, a regra não pode ser burlada pela tela.
- O PDF e o recibo são páginas de impressão (`/orcamentos/$id/pdf`, `/financeiro/recibo/$id`) com layout próprio e `window.print()`, sem biblioteca extra.
- Decisões novas registradas no AGENTS.md.
- Teste: a Ana gera um orçamento a partir do plano da Marina, com desconto de 20% autorizado pelo Roberto, em 3x, e aprova. Depois registra um pagamento parcial e confere o recibo. Em seguida, o Roberto estorna o pagamento. Por fim, confirmo que o Dr. Carlos não acessa nenhum dos dois módulos.
