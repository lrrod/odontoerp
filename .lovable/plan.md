# Iteração 2: README detalhado e tag v2

## O que eu faço
Reescrever o `README.md` em português com instruções completas para rodar o OdontoERP localmente:
1. **Sobre o projeto** — descrição curta e módulos (Pacientes, Agenda, Prontuários, Orçamentos, Financeiro, Estoque, Relatórios).
2. **Tecnologias** — React 19, TanStack Start, Vite, Tailwind CSS v4, banco/autenticação no Lovable Cloud.
3. **Pré-requisitos** — Git, Node.js 20+ (ou Bun), navegador moderno.
4. **Passo a passo**:
   - `git clone <url>` e `cd` na pasta
   - `git checkout v2` (opcional, para a versão entregue)
   - `npm install` (ou `bun install`)
   - conferir o arquivo `.env` (já vem no repositório, com as variáveis públicas do backend `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) e explicar o que fazer se não existir
   - `npm run dev` e abrir `http://localhost:8080`
5. **Logins de teste** — os 4 perfis (Administrador, Recepcionista, 2 Dentistas) com o que cada um acessa.
6. **Outros comandos** — `npm run build`, `npm run preview`, `npm run lint`.
7. **Estrutura de pastas** — `src/routes`, `src/components`, `src/lib`, `supabase/`.
8. **Problemas comuns** — porta ocupada, versão do Node, login bloqueado por 15 min após 3 erros.
9. **Versionamento** — tags `v1` (Iteração 1), `v2` (Iteração 2) e branch `iteracao2`.

Antes de escrever, confiro os scripts reais no `package.json` e a porta no `vite.config.ts`.

## O que você faz depois (no GitHub)
1. Confirme que o Lovable está no branch `master` (Configurações → Git) para o README ir para o master. Se ainda não fez o merge do `iteracao2`, faça antes.
2. Crie a tag `v2`: **Releases → Create a new release → tag `v2` → alvo `master` → título "Iteração 2" → Publish**.
   Terminal: `git pull && git tag -a v2 -m "Entrega da Iteração 2" && git push origin v2`
