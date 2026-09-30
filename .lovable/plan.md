# Corrigir mudança de status no Plano de tratamento

## Problema
No prontuário, escolher "Em andamento" ou "Concluída" no menu de status de uma etapa não tem efeito: a etapa continua "Pendente". No banco, as duas etapas da paciente continuam como "pendente", sem nenhuma mudança gravada. Ainda não sei a causa exata.

## O que será feito
1. Reproduzir o problema no navegador com o Dr. Carlos e com o Roberto, na mesma consulta. Vou registrar a resposta do banco ao trocar o status.
2. Corrigir a causa encontrada. As causas possíveis são uma regra de acesso que recusa a gravação sem mostrar erro, ou a tela recarregando o valor antigo.
3. Mostrar um aviso de erro sempre que a gravação não acontecer. Assim o status não volta para "Pendente" sem nenhuma explicação.
4. Testar de novo: a etapa muda para "Em andamento", continua assim depois de recarregar a página, e "Finalizar atendimento" ainda conclui as etapas marcadas.

## Detalhes técnicos
- Os valores do menu (`pendente`, `andamento` e `concluida`) batem com o que o banco aceita, então o problema não está nesses valores.
- A gravação passará a usar `.update(...).select()`. Se nenhuma linha voltar, ela será tratada como erro e mostrará um aviso na tela. O mesmo vale para reordenar e remover etapas.
- Se a regra de acesso da tabela `treatment_plan_steps` for a causa, ela será ajustada com uma cláusula `WITH CHECK` que usa `can_access_chart(patient_id)`.
