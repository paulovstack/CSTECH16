# 🖥️ CSTECH16 — Loja de Tecnologia

<p align="center">
  <strong>Uma experiência de compra de tecnologia desenvolvida com Python e FastAPI.</strong>
</p>

<p align="center">
  <img src="static/img/logo-cstech16.svg" alt="CSTECH16" width="220">
</p>

---

## 📌 Sobre o projeto

O **CSTECH16** é uma aplicação de e-commerce voltada à comercialização de produtos de tecnologia, desenvolvida como projeto acadêmico e aprimorada com foco em boas práticas de desenvolvimento e construção de portfólio.

A aplicação possui uma API REST construída com FastAPI, integração com banco de dados MySQL e uma interface web desenvolvida com HTML, CSS e JavaScript.

O sistema contempla funcionalidades para clientes, funcionários e administradores, incluindo gerenciamento de produtos, compras, avaliações e relatórios.

## 🚀 Funcionalidades

### 🛍️ Loja
- Catálogo de produtos.
- Pesquisa e filtragem de produtos.
- Página de detalhes dos produtos.
- Carrinho de compras.
- Cadastro e autenticação de clientes.
- Histórico de compras.
- Avaliação de produtos com notas e comentários.

### 📦 Compras
- Registro de pedidos.
- Controle de estoque.
- Diferentes formas de pagamento.
- Acompanhamento do status dos pedidos.
- Cancelamento de compras expiradas.

### 🔐 Administração
- Gerenciamento de produtos.
- Gerenciamento de funcionários.
- Controle de pedidos.
- Relatórios administrativos.
- Indicadores de faturamento e unidades vendidas.
- Histórico de vendas.

### 📊 Relatórios
- Faturamento total.
- Quantidade de unidades vendidas.
- Pedidos concluídos.
- Ticket médio.
- Desempenho de vendas por período.
- Histórico de vendas por produto.

## 🧰 Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| Python | Linguagem principal |
| FastAPI | Desenvolvimento da API REST |
| MySQL | Banco de dados |
| HTML5 | Estrutura das páginas |
| CSS3 | Estilização e responsividade |
| JavaScript | Interatividade e integração com a API |
| JWT | Autenticação baseada em tokens |
| Git e GitHub | Versionamento e hospedagem do código |

## 📁 Estrutura do projeto

```text
CSTECH16/
│
├── auth.py
├── avaliacoes.py
├── compras.py
├── config.py
├── database.py
├── funcionarios.py
├── main.py
├── produtos.py
├── relatorios.py
├── schemas.py
├── security.py
│
├── requirements.txt
├── .env.example
├── .gitignore
│
└── static/
    ├── css/
    ├── img/
    ├── js/
    ├── index.html
    ├── loja.html
    ├── produto.html
    ├── minhas-compras.html
    └── dashboard.html
```

## ⚙️ Como executar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/paulovstack/CSTECH16.git
```

### 2. Entre na pasta

```bash
cd CSTECH16
```

### 3. Crie um ambiente virtual

```bash
python -m venv .venv
```

Ative o ambiente virtual no Windows:

```powershell
.venv\Scripts\activate
```

### 4. Instale as dependências

```bash
pip install -r requirements.txt
```

### 5. Configure as variáveis de ambiente

Crie um arquivo `.env` com base no `.env.example`.

Configure as informações necessárias para conexão com o MySQL e autenticação da aplicação.

**Não compartilhe seu `.env` nem publique credenciais no GitHub.**

### 6. Configure o banco de dados

Crie ou importe a estrutura do banco MySQL e configure os dados de conexão conforme as variáveis de ambiente da aplicação.

### 7. Execute a aplicação

```bash
uvicorn main:app --reload
```

A aplicação estará disponível em:

- Loja/API: http://127.0.0.1:8000
- Documentação Swagger: http://127.0.0.1:8000/docs

## 🔗 API

A API utiliza endpoints organizados por módulos e disponibiliza documentação interativa através do Swagger UI.

Acesse `/docs` para consultar as rotas disponíveis, visualizar parâmetros e realizar testes.

## ☁️ Hospedagem

O projeto está preparado para publicação utilizando:

- **GitHub:** versionamento e armazenamento do código-fonte.
- **Render:** hospedagem da aplicação FastAPI.
- **Aiven:** banco de dados MySQL.

## 👨‍💻 Desenvolvedor

**Paulo Victor**

Estudante de Análise e Desenvolvimento de Sistemas.

Desenvolvedor Back-End em formação, com interesse em Python, C#, APIs REST e Banco de Dados.

- GitHub: [@paulovstack](https://github.com/paulovstack)

---

<p align="center">
  Desenvolvido com dedicação, aprendizado e tecnologia. 💻
</p>
