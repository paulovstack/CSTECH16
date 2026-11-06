
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("cliente-form");
    const message = document.getElementById("cliente-message");

    if (!form) return;

    const cpfInput = form.elements.cpf;
    const telefoneInput = form.elements.telefone;
    const senhaInput = form.elements.senha;

    // Exibe mensagens na tela.
    function showMessage(text, type = "") {
        if (message) {
            message.textContent = text;
            message.className = `message ${type}`.trim();
        }
    }

    // Remove tudo que não for número.
    function limparNumeros(valor) {
        return valor.replace(/\D/g, "");
    }

    // Formata o CPF.
    function formatarCPF(valor) {
        const numeros = limparNumeros(valor).slice(0, 11);

        if (numeros.length <= 3) return numeros;

        if (numeros.length <= 6) {
            return numeros.replace(/^(\d{3})(\d+)/, "$1.$2");
        }

        if (numeros.length <= 9) {
            return numeros.replace(
                /^(\d{3})(\d{3})(\d+)/,
                "$1.$2.$3"
            );
        }

        return numeros.replace(
            /^(\d{3})(\d{3})(\d{3})(\d{0,2})$/,
            "$1.$2.$3-$4"
        );
    }

    // Formata o celular.
    function formatarCelular(valor) {
        const numeros = limparNumeros(valor).slice(0, 11);

        if (numeros.length <= 2) {
            return numeros.length ? `(${numeros}` : "";
        }

        if (numeros.length <= 7) {
            return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
        }

        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    }

    // Valida apenas se o CPF possui 11 números.
    // Não verifica os dígitos verificadores.
    function validarCPF(cpf) {
        cpf = limparNumeros(cpf);
        return /^\d{11}$/.test(cpf);
    }

    // Valida celular brasileiro com DDD.
    function validarCelular(telefone) {
        const numeros = limparNumeros(telefone);

        if (numeros.length !== 11) return false;

        return /^[1-9][0-9]9[0-9]{8}$/.test(numeros);
    }

    // Valida os requisitos da senha.
    function validarSenha(senha) {

        if (senha.length < 6) {
            return "A senha precisa ter pelo menos 6 caracteres.";
        }

        if (!/[A-Z]/.test(senha)) {
            return "A senha precisa conter pelo menos uma letra maiúscula.";
        }

        if (!/[a-z]/.test(senha)) {
            return "A senha precisa conter pelo menos uma letra minúscula.";
        }

        if (!/[0-9]/.test(senha)) {
            return "A senha precisa conter pelo menos um número.";
        }

        if (!/[^A-Za-z0-9]/.test(senha)) {
            return "A senha precisa conter pelo menos um caractere especial.";
        }

        return null;
    }

    // Formatação automática do CPF.
    cpfInput.addEventListener("input", () => {
        cpfInput.value = formatarCPF(cpfInput.value);
    });

    // Formatação automática do celular.
    telefoneInput.addEventListener("input", () => {
        telefoneInput.value = formatarCelular(telefoneInput.value);
    });

    // Envio do cadastro.
    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const button = form.querySelector('button[type="submit"]');

        const cpf = limparNumeros(cpfInput.value);
        const telefone = limparNumeros(telefoneInput.value);
        const senha = senhaInput.value;

        // Validação do CPF.
        if (!validarCPF(cpf)) {
            showMessage(
                "Informe um CPF com exatamente 11 números.",
                "error"
            );

            cpfInput.focus();
            return;
        }

        // Validação do celular somente se preenchido.
        if (telefone && !validarCelular(telefone)) {
            showMessage(
                "Informe um celular válido com DDD e 9 números.",
                "error"
            );

            telefoneInput.focus();
            return;
        }

        // Validação da senha.
        const erroSenha = validarSenha(senha);

        if (erroSenha) {
            showMessage(erroSenha, "error");
            senhaInput.focus();
            return;
        }

        // Bloqueia o botão durante o envio.
        if (button) {
            button.disabled = true;
            button.textContent = "Enviando cadastro...";
        }

        showMessage("Enviando cadastro...");

        const data = {
            cpf: cpf,
            nome: form.elements.nome.value.trim(),
            telefone: telefone || null,
            email: form.elements.email.value.trim(),
            senha: senha
        };

        try {

            const response = await fetch("/api/v1/auth/registrar", {
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
                    detail = detail
                        .map(item => item.msg)
                        .join(" ");
                }

                throw new Error(
                    typeof detail === "string"
                        ? detail
                        : "Não foi possível concluir o cadastro."
                );
            }

            showMessage(
                "Cadastro realizado com sucesso! Sua conta está ativa.",
                "success"
            );

            form.reset();

            window.setTimeout(() => {
                window.location.href = "/static/index.html?v=20261106-cs";
            }, 1500);

        } catch (error) {

            showMessage(
                error.message || "Erro ao realizar cadastro.",
                "error"
            );

        } finally {

            if (button) {
                button.disabled = false;
                button.textContent = "Criar cadastro";
            }

        }

    });

});
