# CSTECH16
### E-commerce Platform

<p align="center">
  <table align="center" bgcolor="#FFFFFF" cellpadding="24" cellspacing="0">
    <tr>
      <td align="center">
        <img src="static/img/logo-cstech16.svg" alt="CSTECH16" width="250">
      </td>
    </tr>
  </table>
</p>

<p align="center">
  Plataforma de comércio eletrônico especializada em tecnologia.
  <br>
  Desenvolvida com Python, FastAPI e MySQL.
</p>

<p align="center">
  <a href="https://cstech16.onrender.com/">
    <img src="https://img.shields.io/badge/OPEN%20STORE-635BFF?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Open Store">
  </a>
  <a href="https://cstech16.onrender.com/docs">
    <img src="https://img.shields.io/badge/API%20DOCUMENTATION-202B45?style=for-the-badge&logo=swagger&logoColor=white" alt="API Documentation">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-Backend-3776AB?style=flat-square&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/FastAPI-REST%20API-009688?style=flat-square&logo=fastapi&logoColor=white">
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=flat-square&logo=mysql&logoColor=white">
  <img src="https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?style=flat-square&logo=javascript&logoColor=black">
  <img src="https://img.shields.io/badge/Render-Cloud-46E3B7?style=flat-square&logo=render&logoColor=black">
</p>

---

## Overview

**CSTECH16** is a full-stack e-commerce application designed to manage the complete purchasing experience of an online technology store.

The platform combines a web-based storefront with a RESTful API and an administrative environment, integrating product management, customer accounts, order processing, inventory control and sales reporting.

The Back-End is built with **Python and FastAPI**, using **MySQL** for data persistence. The Front-End uses native web technologies to communicate with the API and provide the store interface.

The application is structured around distinct access profiles, separating customer operations from administrative and employee management.

## Live Application

| Environment | Address |
|---|---|
| Production Store | [cstech16.onrender.com](https://cstech16.onrender.com/) |
| REST API Documentation | [Swagger UI](https://cstech16.onrender.com/docs) |
| Source Code | [GitHub Repository](https://github.com/paulovstack/CSTECH16) |

## Platform Modules

### 01 — Storefront

The customer-facing environment provides the product discovery and purchasing experience.

- Product catalog and product details.
- Product search and filtering.
- Shopping cart.
- Customer registration and authentication.
- Customer account management.
- Purchase history.
- Product ratings and written reviews.

### 02 — Order Management

The purchasing module handles order creation and the relationship between customers, products and inventory.

- Order registration.
- Purchase item management.
- Automatic total calculation.
- Stock availability validation.
- Inventory deduction.
- Payment method selection.
- Order status management.
- Expired purchase cancellation.

**Supported payment methods:** PIX, credit card and boleto.

*Payment method selection and order management do not, by themselves, imply integration with an external payment gateway.*

### 03 — Administrative Environment

Administrative resources provide operational visibility and management capabilities.

- Product administration.
- Employee management.
- Purchase monitoring.
- Sales overview.
- Operational indicators.
- Administrative reports.

### 04 — Business Intelligence

The reporting module provides information about store performance.

- Total revenue.
- Units sold.
- Completed orders.
- Average order value.
- Product sales history.
- Sales performance over time.

## Technology Stack

| Layer | Technologies |
|---|---|
| Back-End | Python |
| API Framework | FastAPI |
| Database | MySQL |
| Data Access | mysql-connector-python |
| Authentication | JWT |
| Front-End | HTML5, CSS3, JavaScript |
| API Documentation | Swagger / OpenAPI |
| Version Control | Git |
| Repository | GitHub |
| Application Hosting | Render |
| Database Hosting | Aiven |

## Application Structure

The project follows a modular organization, separating API responsibilities from the static web interface.

```text
CSTECH16/
│
├── main.py
│
├── auth.py
├── security.py
├── schemas.py
├── config.py
├── database.py
│
├── produtos.py
├── compras.py
├── avaliacoes.py
├── funcionarios.py
├── relatorios.py
│
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
│
└── static/
    │
    ├── css/
    │   ├── admin.css
    │   ├── cstech-ui.css
    │   ├── premium.css
    │   └── style.css
    │
    ├── js/
    │   ├── api.js
    │   ├── loja.js
   
