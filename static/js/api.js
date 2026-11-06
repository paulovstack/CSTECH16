
const API_BASE = "";
const TOKEN_KEY = "cstech16_token";

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

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

    if (!response.ok) {
        const mensagem =
            data?.detail ||
            data?.message ||
            `Erro na requisição: ${response.status}`;

        throw new Error(mensagem);
    }

    return data;
}
