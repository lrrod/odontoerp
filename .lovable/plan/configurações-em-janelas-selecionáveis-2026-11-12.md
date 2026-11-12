# Configurações em janelas selecionáveis

## O que muda para o usuário
- A página Configurações passa a mostrar 4 cartões lado a lado, cada um com ícone, título e uma linha de resumo:
  - **Usuários** — "N usuários ativos"
  - **Dados da clínica** — nome da clínica
  - **Procedimentos** — "N procedimentos ativos"
  - **Jornada dos dentistas** — "N dentistas"
- Clicar num cartão abre uma janela (modal) sobre a página com o conteúdo daquele quadro, exatamente com as mesmas funções de hoje (criar/desativar usuário, salvar dados da clínica, cadastrar procedimentos, salvar jornada).
- Na janela de Jornada, um seletor de dentista no topo mostra a jornada de um dentista por vez (em vez de todos empilhados).
- A janela fecha com X, Esc ou clicando fora; salvar mostra a mesma mensagem de confirmação e mantém a janela aberta.
- Janelas grandes (Usuários, Procedimentos, Jornada) rolam por dentro; em tablet ocupam quase a tela toda.
- Continua visível e acessível somente ao Administrador.

## Detalhes técnicos
- Só interface: `configuracoes.tsx` vira grade de cartões + `Dialog` (shadcn, já existe em `src/components/ui/dialog.tsx`), estado `open: "users" | "clinic" | "procedures" | "journey" | null`.
- `UsersPanel`, `ClinicPanel`, `ProceduresPanel` e `DentistJourney` reaproveitados; ganham prop para renderizar sem a moldura `Panel` dentro do modal.
- Resumos dos cartões usam as consultas já existentes (`users-admin`, `clinic`, `procedures-admin`, `config-schedules`).
- Nenhuma mudança no banco ou nas regras de permissão.
- Teste no navegador como Roberto: abrir cada janela, salvar algo e conferir que persiste.
