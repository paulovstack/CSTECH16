
/* ==================================================
   CONFIGURAÇÕES
================================================== */

const API_BASE = ""; // A API utiliza o mesmo host do front-end.
const TOKEN_KEY = "cstech16_token";


/* ==================================================
   GERENCIAMENTO DO TOKEN
================================================== */

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function setMessage(element, text, kind = "") {
    if (!element) return;

    element.textContent = text;
    element.className = "message" + (kind ? " " + kind : "");
}


/* ==================================================
   REQUISIÇÕES À API
================================================== */

async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();

    // Adiciona o token de autenticação, quando disponível.
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // Define JSON como formato do corpo, quando necessário.
    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers.has("Content-Type")
    ) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(API_BASE + path, {
        ...options,
        headers
    });

    const raw = await response.text();

    let data = null;

    try {
        data = raw ? JSON.parse(raw) : null;
    } catch {
        data = raw;
    }

    // Trata respostas de erro da API.
    if (!response.ok) {
        const detail =
            data && typeof data === "object"
                ? (data.detail || data.message)
                : data;

        throw new Error(
            detail || `Erro HTTP ${response.status}`
        );
    }

    return data;
}


/* ==================================================
   AUTENTICAÇÃO E SESSÃO
================================================== */

function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem("cstech16_user");

    window.location.href = "/static/loja.html";
}

function requireLogin() {
    if (!getToken()) {
        window.location.href = "/";
        return false;
    }

    return true;
}


/* ==================================================
   TRATAMENTO DE ERROS
================================================== */

function showApiError(element, error) {
    setMessage(
        element,
        error.message || "Não foi possível concluir a operação.",
        "error"
    );
}


/* ==================================================
   EVENTOS GLOBAIS
================================================== */

// Permite sair da conta por meio do atributo data-logout.
document.addEventListener("click", event => {
    const button = event.target.closest("[data-logout]");

    if (button) {
        logout();
    }
});


/* ==================================================
   INICIALIZAÇÃO DA APLICAÇÃO
================================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Botão de saída do Dashboard, quando utilizado.
    const logoutButton = document.getElementById("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }


    // Formulário de login.
    const form = document.getElementById("login-form");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const message = document.getElementById("login-message");
        const button = form.querySelector("button");

        button.disabled = true;

        setMessage(message, "Validando acesso...");

        const email = form.elements.username.value.trim();
        const senha = form.elements.password.value;

        try {
            // Envia as credenciais no formato esperado pelo OAuth2.
            const body = new URLSearchParams({
                username: email,
                password: senha
            });

            const result = await apiRequest(
                "/api/v1/auth/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },

                    body
                }
            );

            // Verifica se a API retornou o token.
            if (!result.access_token) {
                throw new Error(
                    "A API não retornou o token de acesso."
                );
            }

            // Armazena o token durante a sessão.
            sessionStorage.setItem(
                TOKEN_KEY,
                result.access_token
            );

        // Redireciona após o login.
        // Consulta os dados do usuário autenticado.
        const usuario = await apiRequest("/api/v1/auth/me");

        // Direciona conforme o perfil.
        if (["FUNCIONARIO", "ADMIN"].includes(String(usuario.perfil).toUpperCase())) {
            window.location.href = "/static/dashboard.html";

        } else if (String(usuario.perfil).toUpperCase() === "CLIENTE") {
            window.location.href = sessionStorage.getItem("cstech16_after_login") || "/static/loja.html";
            sessionStorage.removeItem("cstech16_after_login");

        } else {
            throw new Error("Perfil de usuário não reconhecido.");
        }

        } catch (error) {
            showApiError(message, error);

        } finally {
            button.disabled = false;
        }
    });

});
