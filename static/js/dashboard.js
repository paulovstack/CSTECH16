
/* ==================================================
   DASHBOARD - CSTECH16
================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    // Verifica se o usuário está autenticado.
    if (!requireLogin()) return;

    const message = document.getElementById("dashboard-message");

    try {

        /* ==========================================
           CONSULTA DOS DADOS DO USUÁRIO
        ========================================== */

        const user = await apiRequest("/api/v1/auth/me");

        // Armazena os dados do usuário durante a sessão.
        sessionStorage.setItem(
            "cstech16_user",
            JSON.stringify(user)
        );


        /* ==========================================
           PERSONALIZAÇÃO DO DASHBOARD
        ========================================== */

        const nome = user.nome || user.email || "usuário";

        const welcomeTitle = document.getElementById("welcome-title");
        const userChip = document.getElementById("user-chip");

        if (welcomeTitle) {
            welcomeTitle.textContent = `Olá, ${nome}!`;
        }

        if (userChip) {
            userChip.textContent =
                `${user.perfil || "Usuário"} · ${user.email || ""}`;
        }


        /* ==========================================
           CONTROLE DE EXIBIÇÃO DE FUNCIONÁRIOS
        ========================================== */

        const perfil = String(user.perfil || "").toUpperCase();

        const isEmployee = perfil === "ADMIN";
        if (!(["ADMIN", "FUNCIONARIO"].includes(perfil))) { window.location.href = "/static/loja.html"; return; }

        const employeeElements = [
            "employee-nav",
            "employee-card",
            "employee-link"
        ];

        employeeElements.forEach(id => {
            const element = document.getElementById(id);

            if (element) {
                element.hidden = !isEmployee;
            }
        });

    } catch (error) {

        /* ==========================================
           TRATAMENTO DE ERROS
        ========================================== */

        const errorMessage = String(error.message || "").toLowerCase();

        if (
            errorMessage.includes("401") ||
            errorMessage.includes("token")
        ) {
            logout();
            return;
        }

        showApiError(message, error);
    }

});
