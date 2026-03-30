**Kash Dashboard Local**

Projeto React/Vite com autenticação local e persistência por usuário em arquivos JSON.

**Como rodar**

1. Entre na pasta do projeto.
2. Use Node `18.16.1` ou superior.
3. Rode `npm install`.
4. Rode `npm run dev`.

O comando `npm run dev` sobe:
- o frontend Vite
- a API local em Node/Express

**Login e cadastro**

- Antes de entrar no dashboard, o usuário precisa criar conta ou fazer login.
- A primeira conta criada vira admin.
- As demais contas entram como usuário comum.

**Banco de dados local**

- Os dados ficam na pasta `local-db`.
- `local-db/accounts.json` guarda as contas cadastradas.
- `local-db/sessions.json` guarda as sessões locais.
- `local-db/users/` guarda um arquivo JSON por usuário com os dados do dashboard.

Sempre que o usuário altera transações, orçamentos, poupança, lembretes ou lista de compras, o arquivo individual dele é atualizado.

**Privacidade entre usuários**

- Cada usuário lê e grava apenas o próprio arquivo.
- Usuários comuns não conseguem listar outros cadastros.
- O dashboard é carregado somente após autenticação.

**Observação**

Os arquivos gerados em `local-db/users/`, `local-db/accounts.json` e `local-db/sessions.json` ficam fora do versionamento por padrão.
