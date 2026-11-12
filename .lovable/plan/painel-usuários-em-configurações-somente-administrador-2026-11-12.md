# Painel "Usuários" em Configurações (somente Administrador)

## O que muda para o usuário
- Em Configurações aparece o painel **Usuários** (a tela inteira já é exclusiva do Administrador).
- Tabela: nome, e-mail, perfil, situação (Ativo/Inativo).
- **+ Novo usuário**: nome completo*, e-mail*, senha provisória* (mín. 8 caracteres), perfil*. Login imediato, sem confirmação de e-mail. Perfil Dentista cria também o cadastro de dentista (aparece na Agenda e na jornada).
- E-mail já existente: aviso "Já existe um usuário com este e-mail" e nada é criado.
- **Trocar perfil** por um seletor na linha; vale no banco na hora e o menu muda no próximo login (ou recarregar).
- **Desativar / Reativar**: conta e histórico preservados; inativo é recusado no login com "Usuário inativo" e suas sessões abertas são encerradas.
- Na própria linha do administrador logado, o seletor de perfil e o botão desativar ficam bloqueados (e o servidor também recusa).

## Regras ao trocar perfil
- Para Dentista: cria (ou reativa) o cadastro de dentista ligado ao usuário.
- Saindo de Dentista: o cadastro de dentista é inativado (consultas antigas preservadas).
- Desativar um dentista inativa também seu cadastro de dentista; reativar o reativa.

## Detalhes técnicos
- Migração: coluna `profiles.active boolean not null default true`; `has_role()`/`is_staff()` passam a exigir perfil ativo, então um inativo perde acesso no banco mesmo com token válido.
- `src/lib/users.functions.ts` com `listUsers`, `createUser`, `updateUserRole`, `setUserActive`: todas com `requireSupabaseAuth` + `has_role(admin)` via cliente do usuário, depois `supabaseAdmin` carregado dentro do handler (chave nunca no cliente). Validação com zod.
  - createUser: `auth.admin.createUser({ email_confirm: true, user_metadata.full_name })`, garante profile, insere user_roles, cria `dentists` se dentista; em erro após criar a conta, remove a conta (rollback). Duplicado detectado antes e pelo erro do auth.
  - updateUserRole: substitui a linha em user_roles (um perfil por usuário); bloqueia se alvo = chamador.
  - setUserActive: atualiza `profiles.active`, `auth.admin.updateUserById({ ban_duration })` ("876000h" / "none") e recusa alvo = chamador.
- `loginWithLock`: após senha correta, checa `profiles.active`; se inativo, retorna "Usuário inativo" (sem contar tentativa).
- UI: `UsersPanel` no topo de `configuracoes.tsx`, invalida também a lista de dentistas da jornada.
- Teste no navegador: Roberto cria recepcionista e dentista, loga com eles, troca perfil, desativa e confirma login recusado.
- AGENTS.md: regra de gestão de usuários via server fns admin-verificadas + `profiles.active`.
