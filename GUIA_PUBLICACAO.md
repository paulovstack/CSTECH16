# Guia de publicação — CSTECH16

## 1. Preparar o repositório

Copie `README.md`, `.gitignore` e `.env.example` para a pasta `minha_api`, ao lado de `main.py`. Mantenha o `.env` apenas na sua máquina.

Antes de publicar, confira `config.py`, `database.py`, `criar_adm.py` e scripts SQL para garantir que não contenham senhas ou dados pessoais. Verifique também se segredos já foram versionados anteriormente: `.gitignore` não remove arquivos do histórico Git.

No terminal aberto em `minha_api`:

```powershell
git status
git add .
git status
git commit -m "Documenta projeto CSTECH16"
```

Confirme com `git status` e `git diff --cached --name-only` que `.env` não está sendo incluído. Se o Git ainda não foi iniciado, use `git init` antes de `git add .`. Para criar o repositório remoto, use a interface do GitHub e siga as instruções que ela fornecer para associar o repositório local.

## 2. Preparar o MySQL no Aiven

1. Crie ou selecione um serviço MySQL no Aiven.
2. Copie, no painel do Aiven, host, porta, nome do banco, usuário, senha e exigências de TLS.
3. Importe **um esquema SQL compatível com o código atual**. Não presuma que um arquivo SQL antigo esteja atualizado: verifique tabelas e colunas usadas por `auth.py`, `produtos.py` e `funcionarios.py`.
4. Teste a conexão antes de publicar a aplicação.

**Atenção:** o projeto pode precisar de `DB_PORT` e opções SSL/TLS em `database.py`. Não basta definir essas variáveis no Render se o código não as utiliza.

## 3. Preparar o Render

1. Crie um serviço **Web Service** conectado ao repositório GitHub.
2. Se o repositório tiver `main.py` dentro de `minha_api`, configure o diretório raiz (`Root Directory`) como `minha_api`. Se `main.py` estiver na raiz do repositório, deixe o diretório raiz padrão.
3. Configure a instalação com `pip install -r requirements.txt`.
4. Configure o comando de inicialização:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

5. Adicione no painel do Render as variáveis de ambiente `SECRET_KEY`, `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`, além de porta/TLS caso seu `database.py` esteja preparado para usá-las.
6. Publique e teste as rotas `/api`, `/api/v1/produtos/` e `/`.

**Importante:** não ative um serviço público antes de corrigir o endpoint de recuperação de senha que aceita apenas e-mail e nova senha. Esse fluxo não verifica a identidade de quem pede a alteração.

## 4. Testes de demonstração

- Loja abre e lista produtos.
- Login de cliente funciona com conta fictícia.
- Área Minha Conta altera somente os dados do usuário autenticado.
- Funcionário não consegue acessar operações exclusivas do administrador.
- Carrinho funciona no navegador (sem pagamento/compra efetiva).
- Nenhuma credencial aparece no repositório ou nos logs públicos.

## Observações

- O README e este guia não publicam o projeto automaticamente; você fará a conexão das contas GitHub, Render e Aiven.
- Planos gratuitos, limites e requisitos de hospedagem podem mudar. Confira as condições atuais nos painéis das plataformas.
