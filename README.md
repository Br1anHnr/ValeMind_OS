# ValeMind OS

Painel central de gestão interna da **ValeMind** construído com **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Drizzle ORM** e **Neon Postgres**.

## Módulos incluídos

- **Dashboard Semanal** — indicadores reais de Comercial, Financeiro, Projetos, Tarefas, Metas Semanais, Follow-ups e Atividades.
- **Comercial / CRM** — Leads, Pipeline Kanban em 8 etapas com conversão atômica para Cliente + Projeto, e Propostas Comerciais.
- **Clientes e Projetos** — páginas dedicadas com contatos, projetos vinculados, status, prazos, links técnicos e histórico.
- **Tarefas e Operação** — visões *Minhas tarefas*, *Tarefas da semana*, *Por projeto* e *Atrasadas*.
- **Financeiro Gerencial** — contratos por projeto, recebimentos, geração automática de mensalidades recorrentes, MRR e Pontual × Recorrente.
- **Reuniões e Decisões** — atas internas e com clientes vinculadas a projetos.
- **Cofre ValeMind** — armazenamento de credenciais e API Keys criptografadas com **AES-256-GCM** no backend.
- **Busca Global** — pesquisa unificada entre os módulos (sem nunca indexar ou expor segredos do Cofre).

## Configuração local

1. Copie `.env.example` para `.env` e preencha `DATABASE_URL` (Neon Postgres), `AUTH_SECRET` e `VAULT_ENCRYPTION_KEY`.
2. Instale as dependências e aplique as migrations:

```bash
npm install
npm run db:migrate
npm run db:seed
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse `http://localhost:3000`.
