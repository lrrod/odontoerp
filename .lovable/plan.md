# Voltar para a tela anterior ao salvar o prontuário

## Por que acontece
A tela do atendimento grava os dados, mas nunca manda o usuário de volta. Ao "Finalizar atendimento", ela só recarrega a mesma página, agora bloqueada para edição, e mostra um link "Voltar aos atendimentos". Ao "Salvar rascunho", aparece o aviso e a tela continua aberta. Não existe nenhum comando de retorno depois de salvar.

## O que será feito
- **Finalizar atendimento:** depois de gravar, mostra "Atendimento finalizado" e volta para a tela de onde o atendimento foi aberto: Agenda, Painel ou Prontuários.
- **Salvar rascunho:** depois de gravar, mostra "Rascunho salvo" e volta para a tela anterior do mesmo jeito.
- Se o prontuário foi aberto direto pelo endereço e não houver tela anterior, vai para a lista de Prontuários.
- Um botão "Voltar" no topo do atendimento, para sair sem salvar.
- Se a gravação der erro, a tela continua aberta com o texto preservado e mostra o aviso.

## Detalhes técnicos
- Em `prontuarios.$patientId.tsx`, no `onSuccess` de `finalize` e `saveDraft`: invalidar as consultas como já é feito e depois chamar `router.history.back()` quando `router.history.canGoBack()`. Caso contrário, `navigate({ to: "/prontuarios" })`.
- O botão "Voltar" usa a mesma função.
