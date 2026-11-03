# Atividade Git: tag v1, branch iteracao2 e merge

Eu não consigo criar tags, branches nem fazer merge pelo chat. Essas partes são feitas por você no GitHub (ou na sua máquina). Eu faço só as duas pequenas alterações de arquivo.

Pré-requisito: o projeto precisa estar conectado ao GitHub (Configurações do projeto → Git → Conectar). Se ainda não estiver, conecte primeiro; um repositório novo é criado com todo o código atual.

## Passo 1 — Tag v1 (você, no GitHub)
Opção pelo site:
1. No repositório, clique em **Releases → Create a new release**.
2. Em "Choose a tag", digite `v1` e escolha **Create new tag: v1 on publish**, alvo `master` (ou `main`).
3. Título "Iteração 1" → **Publish release**.

Opção pelo terminal:
```text
git clone <url-do-repo>
cd <repo>
git tag -a v1 -m "Entrega da Iteração 1"
git push origin v1
```

## Passo 2 — Branch iteracao2 (você)
Site: na lista de branches, digite `iteracao2` → **Create branch iteracao2 from master**.
Terminal:
```text
git checkout -b iteracao2 master
git push -u origin iteracao2
```

## Passo 3 — Alterar dois arquivos no iteracao2
1. No Lovable: Configurações do projeto → Git → seletor de branch → escolha `iteracao2`.
2. Me avise e eu faço duas alterações pequenas e inofensivas:
   - `README.md`: seção "Iteração 2" com uma linha de descrição.
   - `src/routes/login.tsx`: texto de rodapé "Versão 2 (Iteração 2)" na tela de login.
3. O Lovable envia essas alterações como commits para o branch `iteracao2`.

(Alternativa sem o Lovable: editar os dois arquivos direto no GitHub com o branch `iteracao2` selecionado, ícone de lápis → Commit.)

## Passo 4 — Merge para o master (você, no GitHub)
1. **Pull requests → New pull request**, base `master` ← compare `iteracao2`.
2. **Create pull request → Merge pull request → Confirm merge**.
3. **Não** clique em "Delete branch" — o professor precisa ver o `iteracao2`.

Terminal equivalente:
```text
git checkout master
git pull
git merge --no-ff iteracao2 -m "Merge iteracao2 em master"
git push origin master
```

## Passo 5 — Voltar o Lovable para o master
Configurações do projeto → Git → seletor de branch → `master`, para continuar trabalhando com o código já mesclado.

## O professor poderá conferir
- Aba Tags/Releases: `v1`.
- Aba Branches: `iteracao2` ainda existe.
- Histórico do `master`: commit de merge com as duas alterações.
