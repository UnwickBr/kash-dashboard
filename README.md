**Kash Dashboard**

Projeto React/Vite com frontend estático e backend serverless na Vercel usando Neon como banco de dados.

**Stack**

- Frontend: Vite + React
- Backend: Vercel Functions em `api/`
- Banco: Neon PostgreSQL

**Pré-requisitos**

1. Use Node `20` ou superior.
2. Rode `npm install`.
3. Configure `DATABASE_URL` com a string de conexão do Neon.

Você pode copiar `.env.example` para `.env` em ambiente local.

**Desenvolvimento**

- `npm run dev`: sobe o frontend Vite
- `npm run dev:vercel`: sobe o projeto completo com as functions da Vercel

Para testar login, cadastro e persistência do Neon localmente, use `npm run dev:vercel`.

**Deploy na Vercel**

1. Importe o repositório na Vercel.
2. Configure a variável `DATABASE_URL`.
3. Faça o deploy.

**Google Agenda**

- Para integrar lembretes com Google Agenda, configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `APP_URL`.
- O callback usado pela aplicação é `/api/google-calendar/callback`.
- Os lembretes podem ser sincronizados com o calendário apenas para contas conectadas com Google.

**Envio de Email**

- Para enviar emails pelo Gmail, configure `GMAIL_USER` e `GMAIL_APP_PASSWORD`.
- Se quiser personalizar o remetente, configure também `GMAIL_FROM_EMAIL`.
- O ideal é usar uma senha de app do Google, não a senha normal da conta.

**Banco de dados**

O projeto cria/usa estas estruturas:
- `users`
- `sessions`
- `entity_records`

O SQL de referência está em `neon/schema.sql`.

**Observação**

No deploy final, o frontend não acessa o Neon diretamente. As credenciais ficam protegidas nas functions da Vercel, e o navegador fala apenas com `/api`.
