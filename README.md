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
.
├── .lovable/              planos e configurações do Lovable (não alterar)
├── public/                arquivos estáticos (favicon, robots.txt)
├── src/
│   ├── routes/            páginas: cada arquivo vira uma URL (TanStack Router)
│   │   ├── __root.tsx     layout raiz (HTML, fontes, avisos)
│   │   ├── index.tsx      página inicial (redireciona para login/painel)
│   │   ├── login.tsx, reset-password.tsx
│   │   └── _authenticated/  páginas que exigem login
│   │       ├── route.tsx    menu lateral + verificação de perfil
│   │       ├── painel.tsx, pacientes.tsx, agenda.tsx
│   │       ├── prontuarios.index.tsx, prontuarios.$patientId.tsx
│   │       ├── orcamentos.index.tsx, orcamentos.$id.pdf.tsx
│   │       ├── financeiro.index.tsx, financeiro.recibo.$id.tsx
│   │       └── estoque.tsx, relatorios.tsx, configuracoes.tsx
│   ├── components/        componentes (AppShell, Odontogram, PrintSheet...)
│   │   └── ui/            componentes base (shadcn/ui)
│   ├── hooks/             hooks React
│   ├── lib/               regras e utilitários (agenda, financeiro, permissões,
│   │                      funções de servidor *.functions.ts)
│   ├── integrations/supabase/  conexão com o backend (gerado, não editar)
│   ├── routeTree.gen.ts   mapa de rotas (gerado, não editar)
│   ├── router.tsx, start.ts, server.ts   inicialização do app
│   └── styles.css         tema e cores (Tailwind v4)
├── supabase/
│   ├── config.toml        configuração do backend
│   └── migrations/        scripts SQL (tabelas, regras de acesso, gatilhos, dados de exemplo)
├── AGENTS.md              decisões técnicas do projeto
├── package.json           dependências e comandos
└── vite.config.ts         configuração do Vite
```

## Desenvolvimento com Lovable

Este projeto foi criado e é mantido com o [Lovable](https://lovable.dev), plataforma que gera e edita o código a partir de instruções em linguagem natural.

- **Editor:** https://lovable.dev/projects/7b338096-545f-4c43-88fc-16afa6597555
- **Aplicação publicada:** https://odontoerp.lovable.app
- **Sincronização com o GitHub:** cada alteração feita no Lovable vira um commit neste repositório, e cada `push` no branch `main` volta para o Lovable automaticamente. Só o branch selecionado no Lovable (Configurações → Git) é sincronizado.
- **Backend:** banco, autenticação e regras de acesso ficam no Lovable Cloud. Mudanças no banco são feitas por migrations em `supabase/migrations/`, aplicadas pelo Lovable (não rodam sozinhas com `git push`).
- **Desenvolvimento local:** dá para editar no seu computador (passos acima) e enviar com `git push`; o Lovable recebe as alterações. Faça `git pull` antes para não conflitar com edições feitas no Lovable.
- **Arquivos gerados automaticamente** (não editar à mão): `src/routeTree.gen.ts`, `src/integrations/supabase/*` e `.env`.

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
