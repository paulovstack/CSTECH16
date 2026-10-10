document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("cliente-form");
    const message = document.getElementById("cliente-message");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const showMessage = (text, type = "") => {
            if (message) {
                message.textContent = text;
                message.className = `message ${type}`.trim();
            }
        };

        if (button) {
            button.disabled = true;
            button.textContent = "Enviando cadastro...";
        }
        showMessage("Enviando cadastro...");

        const data = {
            cpf: form.elements.cpf.value.replace(/\D/g, ""),
            nome: form.elements.nome.value.trim(),
            telefone: form.elements.telefone.value.replace(/\D/g, "") || null,
            email: form.elements.email.value.trim(),
            senha: form.elements.senha.value,
            status: form.elements.status.value === "true"
        };

        try {
            const response = await fetch("/api/v1/auth/registrar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                const detail = result.detail;
                throw new Error(typeof detail === "string" ? detail : "Não foi possível concluir o cadastro.");
            }

            showMessage(
                data.status
                    ? "Cadastro realizado. A conta está ativa."
                    : "Cadastro realizado. A conta está inativa e não poderá entrar até ser ativada.",
                "success"
            );
            form.reset();
            form.elements.status.value = "true";

            if (data.status) {
                window.setTimeout(() => { window.location.href = "/"; }, 1500);
            }
        } catch (error) {
            showMessage(error.message || "Erro ao realizar cadastro.", "error");
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Criar cadastro";
            }
        }
    });
});
