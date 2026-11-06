# CSTECH16 | E-commerce de Tecnologia

<p align="center">
  <table align="center" bgcolor="#ffffff" cellpadding="18">
    <tr>
      <td align="center">
        <img src="static/img/logo-cstech16.svg" alt="CSTECH16" width="240">
      </td>
    </tr>
  </table>
</p>

<p align="center">
  <strong>Uma plataforma de comércio eletrônico desenvolvida com Python, FastAPI e MySQL.</strong>
</p>

<p align="center">
  <a href="https://cstech16.onrender.com/">
    <img src="https://img.shields.io/badge/ACESSAR_LOJA-CSTECH16-635BFF?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Acessar loja">
  </a>
  <a href="https://cstech16.onrender.com/docs">
    <img src="https://img.shields.io/badge/API-SWAGGER-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Documentação da API">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.x-3776AB?style=flat-square&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/FastAPI-Framework-009688?style=flat-square&logo=fastapi&logoColor=white">
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=flat-square&logo=mysql&logoColor=white">
  <img src="https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?style=flat-square&logo=javascript&logoColor=black">
  <img src="https://img.shields.io/badge/Render-Deployment-46E3B7?style=flat-square&logo=render&logoColor=black">
</p>

---

## 01. Sobre o projeto

O **CSTECH16** é uma aplicação web de comércio eletrônico voltada à venda de produtos de tecnologia.

Desenvolvido como projeto acadêmico e evoluído com foco em desenvolvimento Back-End, integração de sistemas e construção de portfólio, o projeto reúne uma loja virtual, uma API REST e um ambiente administrativo para gerenciamento da operação.

A aplicação foi construída utilizando Python e FastAPI, com persistência de dados em MySQL e interface desenvolvida com HTML5, CSS3 e JavaScript.

O sistema possui diferentes níveis de acesso, permitindo que clientes realizem compras e avaliações, enquanto funcionários e administradores possuem recursos de gerenciamento de acordo com suas permissões.

## 02. Acesse o projeto

<p align="center">
  <a href="https://cstech16.onrender.com/">
    <img src="https://img.shields.io/badge/ABRIR_CSTECH16-635BFF?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Abrir CSTECH16">
  </a>
</p>

| Recurso | Acesso |
|---|---|
| Loja virtual | [Acessar CSTECH16](https://cstech16.onrender.com/) |
| Documentação da API | [Swagger UI](https://cstech16.onrender.com/docs) |

*Observação: a disponibilidade da aplicação depende do serviço de hospedagem.*

## 03. Funcionalidades

### Loja virtual

- Catálogo de produtos.
- Pesquisa e filtros de produtos.
- Página individual de detalhes.
- Carrinho de compras.
- Cadastro e autenticação de clientes.
- Área de conta do cliente.
- Histórico de compras.
- Avaliação de produtos com notas e comentários.

### Sistema de compras

- Criação de pedidos.
- Registro dos itens adquiridos.
- Cálculo do valor total.
- Controle de estoque.
- Opções de pagamento: PIX, cartão e boleto.
- Controle de status dos pedidos.
- Gerenciamento de prazo de pagamento.
- Cancelamento automático de compras expiradas.

### Painel administrativo

- Gerenciamento de produtos.
- Gerenciamento de funcionários.
- Acompanhamento de compras.
- Controle administrativo.
- Visualização de indicadores de vendas.
- Relatórios financeiros e operacionais.

### Relatórios e indicadores

- Faturamento total.
- Quantidade de unidades vendidas.
- Total de pedidos concluídos.
- Ticket médio.
- Histórico de vendas por produto.
- Acompanhamento de vendas por período.

## 04. Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Python | Linguagem principal do Back-End |
| FastAPI | Construção da API REST |
| MySQL | Gerenciamento e persistência dos dados |
| HTML5 | Estrutura da interface |
| CSS3 | Estilização e responsividade |
| JavaScript | Interatividade e consumo da API |
| JWT | Autenticação baseada em tokens |
| Git | Controle de versão |
| GitHub | Hospedagem do código-fonte |
| Render | Hospedagem da aplicação |
| Aiven | Hospedagem do banco de dados |

## 05. Arquitetura do projeto

A aplicação utiliza uma organização modular, separando responsabilidades de autenticação, produtos, compras, avaliações, funcionários e relatórios.

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
├── README.md
│
└── static/
    ├── css/
    ├── img/
    ├── js/
    ├── index.html
    ├── loja.html
    ├── produto.html
    ├── minhas-compras.html
    ├── minha-conta.html
    └── dashboard.html
```

## 06. Executando localmente

Para executar o projeto em ambiente local, siga os passos abaixo.

### Pré-requisitos

- Python instalado.
- Git instalado.
- Servidor MySQL ou banco MySQL acessível.
- Editor de código de sua preferência.

### 1. Clone o repositório

```bash
git clone https://github.com/paulovstack/CSTECH16.git
```

### 2. Acesse a pasta

```bash
cd CSTECH16
```

### 3. Crie um ambiente virtual

```bash
python -m venv .venv
```

### 4. Ative o ambiente virtual

Windows:

```powershell
.venv\Scripts\activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

### 5. Instale as dependências

```bash
pip install -r requirements.txt
```

### 6. Configure as variáveis de ambiente

Crie um arquivo `.env` com base no arquivo `.env.example`.

Configure as informações necessárias para conexão com o banco de dados e autenticação.

**Importante:** nunca publique senhas, tokens, chaves privadas ou certificados no repositório.

### 7. Configure o banco de dados

Configure a estrutura do banco MySQL e os dados de conexão necessários para a aplicação.

### 8. Execute o servidor

```bash
uvicorn main:app --reload
```

A aplicação estará disponível em:

- Loja: http://127.0.0.1:8000/
- Swagger: http://127.0.0.1:8000/docs

## 07. API REST

A API foi desenvolvida com FastAPI e organizada em módulos, facilitando a manutenção e a evolução das funcionalidades.

A documentação interativa permite visualizar os endpoints, parâmetros, modelos de dados e testar as operações disponíveis.

**Documentação online:** [CSTECH16 — Swagger UI](https://cstech16.onrender.com/docs)

## 08. Infraestrutura e publicação

O projeto utiliza uma arquitetura de hospedagem baseada nos seguintes serviços:

| Serviço | Responsabilidade |
|---|---|
| GitHub | Versionamento e código-fonte |
| Render | Hospedagem da aplicação FastAPI |
| Aiven | Banco de dados MySQL |

A aplicação é disponibilizada pela plataforma Render, enquanto os dados são armazenados no MySQL hospedado na Aiven.

## 09. Segurança e boas práticas

Durante o desenvolvimento, foram aplicadas práticas voltadas à organização e segurança da aplicação:

- Separação de responsabilidades por módulos.
- Autenticação baseada em JWT.
- Controle de acesso por perfil.
- Validação de dados recebidos pela API.
- Variáveis de ambiente para configurações sensíveis.
- Arquivo `.gitignore` para proteger arquivos locais.
- Comunicação com banco de dados utilizando configuração SSL.

## 10. Objetivos e aprendizado

O desenvolvimento do CSTECH16 proporcionou a aplicação prática de conceitos importantes da área de desenvolvimento de software:

- Construção de APIs REST.
- Desenvolvimento Back-End com Python.
- Integração com banco de dados relacionais.
- Modelagem de dados.
- Autenticação e autorização.
- Desenvolvimento de interfaces web.
- Integração entre Front-End e Back-End.
- Versionamento com Git e GitHub.
- Publicação de aplicações na nuvem.

## 11. Desenvolvedor

<p align="center">
  <strong>Paulo Victor</strong>
  <br>
  Desenvolvedor Back-End em formação
  <br>
  Estudante de Análise e Desenvolvimento de Sistemas
</p>

<p align="center">
  <a href="https://github.com/paulovstack">
    <img src="https://img.shields.io/badge/GitHub-paulovstack-181717?style=for-the-badge&logo=github&logoColor=white">
  </a>
  <a href="https://cstech16.onrender.com/">
    <img src="https://img.shields.io/badge/Projeto-CSTECH16-635BFF?style=for-the-badge&logo=googlechrome&logoColor=white">
  </a>
</p>

---

<p align="center">
  <strong>CSTECH16</strong>
  <br>
  Tecnologia, desenvolvimento e aprendizado em prática.
  <br><br>
  Desenvolvido por Paulo Victor.
</p>
