
document.addEventListener("DOMContentLoaded", () => {

    const emailSection = document.getElementById("recovery-email-section");
    const tokenSection = document.getElementById("recovery-token-section");
    const passwordSection = document.getElementById("recovery-password-section");
    const successSection = document.getElementById("recovery-success-section");

    const emailForm = document.getElementById("recovery-email-form");
    const passwordForm = document.getElementById("recovery-password-form");

    const emailInput = document.getElementById("recovery-email");
    const tokenInput = document.getElementById("recovery-token");
    const newPasswordInput = document.getElementById("new-password");
    const confirmPasswordInput = document.getElementById("confirm-password");

    const demoToken = document.getElementById("demo-token");

    let tokenDemonstracao = "";

    const sections = [
        emailSection,
        tokenSection,
        passwordSection,
        successSection
    ];

    function showSection(section) {
        sections.forEach(item => item.classList.remove("active"));
        section.classList.add("active");
    }

    function showMessage(id, message, type = "") {
        const element = document.getElementById(id);

        element.textContent = message;
        element.className = "message";

        if (type) {
            element.classList.add(type);
        }
    }

    async function requestApi(url, data) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            let detail = result.detail;

            if (Array.isArray(detail)) {
                detail = detail.map(item => item.msg).join(", ");
            }

            throw new Error(
                detail || "Não foi possível concluir a operação."
            );
        }

        return result;
    }

    // Solicitar recuperação
    emailForm.addEventListener("submit", async event => {

        event.preventDefault();

        const button = document.getElementById("request-token-button");

        button.disabled = true;
        button.textContent = "Solicitando...";

        showMessage("recovery-email-message", "Verificando e-mail...");

        try {

            const result = await requestApi(
                "/api/v1/auth/recuperar-senha",
                {
                    email: emailInput.value.trim()
                }
            );

            if (!result.token_demonstracao) {
                throw new Error("A API não retornou o token demonstrativo.");
            }

            tokenDemonstracao = result.token_demonstracao;
            demoToken.textContent = tokenDemonstracao;

            showSection(tokenSection);

        } catch (error) {

            showMessage(
                "recovery-email-message",
                error.message,
                "error"
            );

        } finally {

            button.disabled = false;
            button.textContent = "Solicitar recuperação";

        }

    });

    // Copiar token
    document.getElementById("copy-token-button")
        .addEventListener("click", async () => {

            try {

                await navigator.clipboard.writeText(tokenDemonstracao);

                const button = document.getElementById("copy-token-button");
                button.textContent = "Token copiado!";

                setTimeout(() => {
                    button.textContent = "Copiar token";
                }, 2000);

            } catch {

                alert("Não foi possível copiar. Copie o token manualmente.");

            }

        });

    // Continuar para nova senha
    document.getElementById("continue-recovery-button")
        .addEventListener("click", () => {

            tokenInput.value = tokenDemonstracao;

            showMessage("recovery-password-message", "");

            showSection(passwordSection);

        });

    // Redefinir senha
    passwordForm.addEventListener("submit", async event => {

        event.preventDefault();

        const button = document.getElementById("reset-password-button");

        const token = tokenInput.value.trim();
        const novaSenha = newPasswordInput.value;
        const confirmarSenha = confirmPasswordInput.value;

        if (novaSenha.length < 6) {
            showMessage(
                "recovery-password-message",
                "A senha precisa ter pelo menos 6 caracteres.",
                "error"
            );
            return;
        }

        if (novaSenha !== confirmarSenha) {
            showMessage(
                "recovery-password-message",
                "As senhas não coincidem.",
                "error"
            );
            return;
        }

        button.disabled = true;
        button.textContent = "Atualizando...";

        try {

            await requestApi(
                "/api/v1/auth/redefinir-senha",
                {
                    token: token,
                    nova_senha: novaSenha,
                    confirmar_senha: confirmarSenha
                }
            );

            passwordForm.reset();

            showSection(successSection);

        } catch (error) {

            showMessage(
                "recovery-password-message",
                error.message,
                "error"
            );

        } finally {

            button.disabled = false;
            button.textContent = "Redefinir senha";

        }

    });

    // Finalizar e voltar ao login
    document.getElementById("finish-recovery-button")
        .addEventListener("click", () => {

            window.location.href = "/static/index.html?v=20261106-cs";

        });

});
