# Criar a release v2 no GitHub

## O que será feito
1. Usar uma conexão com a sua conta do GitHub só para esta tarefa. Ela não fica ligada ao app. Se ainda não houver conexão, aparece um cartão para você conectar.
2. Localizar o repositório do OdontoERP na sua conta e conferir:
   - que o branch `main` tem o README novo;
   - que a tag `v2` ainda não existe (se já existir, eu paro e te aviso).
3. Criar a release:
   - tag: `v2` (criada agora, apontando para o último commit do `main`)
   - título: "Iteração 2"
   - descrição: "Entrega da Iteração 2 — README com instruções para executar localmente."
   - release normal (não rascunho, não pré-lançamento)
4. Ler a release de volta e te passar o link para conferir.

Antes de criar, o GitHub mostra um cartão de aprovação. Basta clicar em aprovar.

## Detalhes técnicos
- `GET /user/repos` para achar o repositório e `GET /repos/{owner}/{repo}/git/ref/tags/v2` para checar se a tag já existe.
- `POST /repos/{owner}/{repo}/releases` com `{ tag_name: "v2", target_commitish: "main", name: "Iteração 2", draft: false, prerelease: false }`.
- Nenhum arquivo do projeto é alterado.
