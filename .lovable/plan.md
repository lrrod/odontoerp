# Módulo Estoque (somente Administrador)

## O que será construído

**Tabela de itens** (como no protótipo)
- Colunas: nome, categoria (Restaurador, Descartável, Medicamento, Instrumental, Escritório), lote, validade, saldo, mínimo e situação.
- Linha vermelha + etiqueta "Repor" quando o saldo está abaixo do mínimo; linha amarela + "Vence em X dias" quando a validade está a menos de 60 dias; "Vencido" quando já passou; "OK" nos demais.
- Busca por nome e filtro por categoria. Contador no topo: "X itens em reposição".
- Botão "Novo item" (nome, categoria, mínimo).

**+ Entrada (compra)**
- Fornecedor, quantidade, lote, validade e valor.
- Se o lote já existe para o item, soma ao saldo; se é um lote novo, cria uma nova linha do item com esse lote.

**− Saída (consumo)**
- Quantidade e observação opcional; não permite sair mais que o saldo.
- Lote vencido: a saída é bloqueada com a mensagem "Lote vencido — faça a baixa por descarte" e um botão "Baixa por descarte" (registrada como descarte no histórico).

**Última movimentação**
- Painel lateral com os movimentos mais recentes: tipo (Entrada/Saída/Descarte), item, lote, quantidade, autor, data e hora. Movimentos não podem ser editados nem apagados.

**Alerta automático**
- O destaque vermelho, o contador "itens em reposição" e o cartão vermelho do Painel inicial são calculados a partir do saldo atual — ao cruzar o mínimo aparecem, e somem sozinhos quando o saldo é regularizado.
- Os alertas de validade do Painel passam a usar o mesmo prazo de 60 dias.

## Detalhes técnicos
- `stock_items`: adicionar CHECK de categoria; cada linha = item + lote.
- Nova tabela `stock_movements` (item_id, kind entrada/saida/descarte, quantity, supplier, unit_value/total, lot, expiry, author_id, author_name, note, created_at) com GRANT + RLS somente admin; trigger bloqueia UPDATE/DELETE.
- RPCs `stock_entry(...)` e `stock_exit(item, qty, kind, note)` (security definer, verificam admin): gravam o movimento e atualizam o saldo atomicamente; `stock_exit` recusa `saida` de lote vencido e saldo insuficiente, aceita `descarte`.
- `dashboard_stock_alerts()`: prazo de validade 45 → 60 dias.
- Nova tela `src/routes/_authenticated/estoque.tsx` substituindo o "Em construção"; permissão já restrita ao admin em `permissions.ts`.
- Registrar a regra no AGENTS.md (estoque só muda via RPC; movimentos append-only).
