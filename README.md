**Kash Dashboard**

Projeto React/Vite ajustado para rodar localmente e publicar no GitHub Pages.

**Como rodar**

1. Entre na pasta do projeto.
2. Use Node `18.16.1` ou superior.
3. Rode `npm install`.
4. Rode `npm run dev`.

**GitHub Pages**

- O projeto usa `HashRouter`, então as rotas funcionam em hospedagem estática.
- O workflow de deploy está em `.github/workflows/deploy-pages.yml`.
- Ao subir commits para `master`, o GitHub Actions pode publicar a versão do Pages.

**Login e cadastro**

- O usuário precisa criar conta ou fazer login antes de entrar no dashboard.
- A primeira conta criada vira admin.
- As demais entram como usuário comum.

**Persistência**

- No GitHub Pages não existe backend nem escrita em arquivos do repositório em runtime.
- Por isso, os dados ficam salvos no `localStorage` do navegador.
- Cada conta usa um espaço isolado, então um usuário não vê os dados do outro no mesmo navegador.

**Limitação importante**

- Como o app é estático no GitHub Pages, os dados não são compartilhados entre navegadores ou dispositivos.
- Se limpar o armazenamento do navegador, os dados locais dessa instalação são perdidos.
