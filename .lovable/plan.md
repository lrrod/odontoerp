# Iteração 2: README detalhado e tag v2

Abaixo está o README completo como ficará. Ao aprovar, eu substituo o `README.md` atual por este texto. Depois, você cria a tag `v2` no GitHub (instruções no fim).

---

````markdown
# OdontoERP

Sistema de gestão para clínicas odontológicas: pacientes, agenda, prontuários com odontograma, orçamentos, financeiro, estoque e relatórios, com controle de acesso por perfil (Administrador, Recepcionista e Dentista).

## Módulos

| Módulo | Quem acessa |
|---|---|
| Painel | Todos |
| Pacientes | Administrador, Recepcionista |
| Agenda | Todos (o dentista vê só a própria agenda) |
| Prontuários | Administrador, Dentista |
| Orçamentos e Financeiro | Administrador, Recepcionista |
| Estoque, Relatórios e Configurações | Administrador |

## Tecnologias

- React 19 + TanStack Start (rotas e funções de servidor)
- Vite 7 (build e servidor de desenvolvimento)
- Tailwind CSS v4
- Recharts (gráficos dos relatórios)
- Backend no Lovable Cloud (banco PostgreSQL, autenticação e regras de acesso por linha)

## Pré-requisitos

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) versão 20 ou superior (já inclui o npm). Outra opção é o [Bun](https://bun.sh/).
- Um navegador atualizado (Chrome, Edge ou Firefox)

Para conferir as versões instaladas:

```sh
git --version
node --version
npm --version
```

## Como executar no seu computador

1. **Clone o repositório**

   ```sh
   git clone <url-deste-repositorio>
   cd <nome-da-pasta>
   ```

2. **(Opcional) Use exatamente a versão entregue**

   ```sh
   git checkout v2     # Iteração 2
   # ou: git checkout v1   para a Iteração 1
   ```

3. **Instale as dependências**

   ```sh
   npm install
   # ou: bun install
   ```

4. **Confira o arquivo `.env`**

   O arquivo `.env` já vem no repositório com as chaves **públicas** do backend:

   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
   VITE_SUPABASE_PROJECT_ID=...
   ```

   Não é preciso alterar nada. Se o arquivo estiver faltando, peça os valores ao grupo e crie o `.env` na raiz do projeto.

5. **Inicie o servidor de desenvolvimento**

   ```sh
   npm run dev
   # ou: bun run dev
   ```

6. **Abra o endereço exibido no terminal** (por exemplo `http://localhost:8080`) no navegador. A tela de login aparecerá.

## Logins de teste

Na tela de login, clique em um dos usuários de teste para preencher o formulário automaticamente.

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | roberto.lima@odontoerp.com.br | Gestao#Odonto26 |
| Recepcionista | ana.souza@odontoerp.com.br | Recepcao@2026 |
| Dentista | carlos.prado@odontoerp.com.br | Dentista@2026 |
| Dentista | paula.nunes@odontoerp.com.br | Dentista@2026 |

> Depois de 3 senhas erradas, o acesso fica bloqueado por 15 minutos.

## Outros comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento com recarga automática |
| `npm run build` | Gera a versão de produção |
| `npm run preview` | Executa localmente a versão gerada pelo build |
| `npm run lint` | Verifica o código com o ESLint |
| `npm run format` | Formata o código com o Prettier |

## Estrutura de pastas

```
src/
  routes/          páginas do sistema (uma por arquivo)
    _authenticated/  páginas que exigem login (agenda, pacientes, etc.)
  components/      componentes reutilizáveis (menu, odontograma, impressão)
  lib/             regras e utilitários (agenda, financeiro, permissões)
  integrations/    conexão com o backend (gerado automaticamente)
supabase/
  migrations/      scripts SQL do banco (tabelas, regras de acesso, gatilhos)
```

## Problemas comuns

- **`npm install` falha:** confira se o Node.js é a versão 20 ou superior.
- **Porta em uso:** feche outros programas que usem a porta ou use o endereço que o terminal indicar.
- **Não consigo entrar:** verifique o e-mail/senha da tabela acima. Se errou 3 vezes, aguarde 15 minutos.
- **Página em branco:** confira se o arquivo `.env` existe na raiz do projeto.

## Versões

| Identificação | Conteúdo |
|---|---|
| tag `v1` | Entrega da Iteração 1 |
| branch `iteracao2` | Desenvolvimento da Iteração 2 (mantido para conferência) |
| tag `v2` | Entrega da Iteração 2 |
````

---

## Depois de gravado: criar a tag v2 (você, no GitHub)
1. Confirme no GitHub que o `main` já tem o novo README.
2. **Releases → Create a new release → tag `v2` → alvo `main` → título "Iteração 2" → Publish release**.
   Terminal: `git pull && git tag -a v2 -m "Entrega da Iteração 2" && git push origin v2`
