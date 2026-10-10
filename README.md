# CSTECH16 — Sistema de Loja e Gestão

Projeto acadêmico desenvolvido na disciplina **Integração de Competências**, do curso de **Análise e Desenvolvimento de Sistemas (ADS)**.

A CSTECH16 reúne uma vitrine de produtos e um painel para administração de cadastros, utilizando uma API REST construída com Python e FastAPI e um banco de dados MySQL.

## Funcionalidades

- Vitrine pública com catálogo, pesquisa e categorias de produtos.
- Carrinho de compras no navegador (sem finalização de pedidos integrada ao banco, por enquanto).
- Cadastro e autenticação de clientes.
- Área **Minha Conta** para consultar e atualizar dados cadastrais.
- Painel de gerenciamento para funcionários e administradores.
- Cadastro, listagem, edição e exclusão de produtos.
- Gerenciamento de funcionários com permissões de administrador.
- Documentação interativa da API pelo Swagger.

> **Estado do projeto:** aplicação acadêmica em desenvolvimento. O carrinho não realiza pagamentos nem registra pedidos no banco de dados. Não utilize dados pessoais reais para demonstrações públicas.

## Tecnologias

- **Back-end:** Python, FastAPI e autenticação JWT.
- **Front-end:** HTML, CSS e JavaScript.
- **Banco de dados:** MySQL.
- **Ferramentas:** VS Code, Git e GitHub.
- **Hospedagem planejada:** Render (aplicação) e Aiven (MySQL).

## Estrutura principal

```text
minha_api/
├── static/
│   ├── css/
│   ├── js/
│   ├── loja.html
│   ├── minha-conta.html
│   └── dashboard.html
├── main.py
├── auth.py
├── security.py
├── database.py
├── config.py
├── produtos.py
├── funcionarios.py
├── schemas.py
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Como executar localmente

Requisitos: Python, MySQL e banco de dados com as tabelas esperadas pelo projeto.

1. Abra o terminal na pasta `minha_api`.
2. Crie e ative um ambiente virtual:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Instale as dependências:

```powershell
python -m pip install -r requirements.txt
```

4. Copie `.env.example` para `.env` e configure os valores reais localmente. **Nunca publique o `.env`.**
5. Prepare o banco MySQL com o esquema compatível com a versão atual da API.
6. Inicie o servidor:

```powershell
python -m uvicorn main:app --reload
```

Acesse:

- Loja: http://127.0.0.1:8000/
- Documentação da API: http://127.0.0.1:8000/docs
- Status da API: http://127.0.0.1:8000/api

## Publicação

O código pode ser publicado no GitHub, enquanto a aplicação pode ser hospedada no Render com o MySQL no Aiven. Consulte o arquivo `GUIA_PUBLICACAO.md` para um roteiro de configuração e verificações.

## Cuidados de segurança

- Não publique senhas, arquivos `.env`, chaves JWT ou dados pessoais reais.
- Antes de uma implantação pública, substitua a recuperação de senha baseada apenas em e-mail por um fluxo com token de verificação.
- Não exponha contas administrativas de teste com senhas conhecidas.
- Confirme que o SQL publicado corresponde à estrutura efetivamente usada pela API.

## Finalidade

Aplicar, de forma prática, conhecimentos de desenvolvimento web, APIs REST, autenticação, banco de dados relacional e organização de projetos de software.
