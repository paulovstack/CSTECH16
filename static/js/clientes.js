
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("cliente-form");
    const message = document.getElementById("cliente-message");

    if (!form) return;

    const cpfInput = form.elements.cpf;
    const nomeInput = form.elements.nome;
    const telefoneInput = form.elements.telefone;
    const emailInput = form.elements.email;
    const senhaInput = form.elements.senha;
    const submitButton = form.querySelector('button[type="submit"]');

    const touched = new Set();

    let submitting = false;
    let emailDisponivel = null;
    let emailVerificando = false;
    let emailTimer = null;
    let emailController = null;
    let emailRequisicao = 0;

    function showMessage(text, type = "") {
        if (!message) return;

        message.textContent = text;
        message.className = `message ${type}`.trim();
    }

    function limparNumeros(valor) {
        return String(valor || "").replace(/\D/g, "");
    }

    function formatarCPF(valor) {
        const numeros = limparNumeros(valor).slice(0, 11);

        if (numeros.length <= 3) return numeros;
        if (numeros.length <= 6) {
            return numeros.replace(/^(\d{3})(\d+)/, "$1.$2");
        }
        if (numeros.length <= 9) {
            return numeros.replace(/^(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
        }

        return numeros.replace(
            /^(\d{3})(\d{3})(\d{3})(\d{0,2})$/,
            "$1.$2.$3-$4"
        );
    }

    function formatarCelular(valor) {
        const numeros = limparNumeros(valor).slice(0, 11);

        if (numeros.length === 0) return "";
        if (numeros.length <= 2) return `(${numeros}`;

        if (numeros.length <= 7) {
            return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
        }

        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    }

    // Validação rigorosa do CPF, incluindo os dois dígitos verificadores.
    function validarCPF(valor) {
        const cpf = limparNumeros(valor);

        if (!/^\d{11}$/.test(cpf)) return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false;

        let soma = 0;

        for (let i = 0; i < 9; i++) {
            soma += Number(cpf[i]) * (10 - i);
        }

        let resto = (soma * 10) % 11;
        const digito1 = resto === 10 ? 0 : resto;

        if (digito1 !== Number(cpf[9])) return false;

        soma = 0;

        for (let i = 0; i < 10; i++) {
            soma += Number(cpf[i]) * (11 - i);
        }

        resto = (soma * 10) % 11;
        const digito2 = resto === 10 ? 0 : resto;

        return digito2 === Number(cpf[10]);
    }

    function validarCelular(valor) {
        const numeros = limparNumeros(valor);

        return /^\d{11}$/.test(numeros) &&
            /^[1-9][0-9]9[0-9]{8}$/.test(numeros);
    }

    function validarNome(valor) {
        const nome = valor.trim().replace(/\s+/g, " ");

        return nome.length >= 3 &&
            /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(nome);
    }

    function validarEmail(valor) {
        const email = valor.trim();

        return email.length > 0 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) &&
            emailInput.validity.valid;
    }

    function regrasSenha(senha) {
        return {
            length: senha.length >= 6,
            uppercase: /[A-ZÀ-ÖØ-Þ]/.test(senha),
            lowercase: /[a-zà-öø-ÿ]/.test(senha),
            number: /\d/.test(senha),
            special: /[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s]/.test(senha)
        };
    }

    function atualizarEstadoCampo(input, estado, texto = "") {
        const wrapper = input.closest(".cad-field");

        if (!wrapper) return;

        wrapper.classList.remove(
            "is-valid",
            "is-invalid",
            "is-neutral"
        );

        if (estado === null) {
            wrapper.classList.add("is-neutral");
            input.removeAttribute("aria-invalid");
        } else if (estado) {
            wrapper.classList.add("is-valid");
            input.setAttribute("aria-invalid", "false");
        } else {
            wrapper.classList.add("is-invalid");
            input.setAttribute("aria-invalid", "true");
        }

        const status = wrapper.querySelector(".cad-field-status");

        if (status) {
            status.textContent = texto;
        }
    }

    function atualizarSenha() {
        const senha = senhaInput.value;
        const regras = regrasSenha(senha);
        const lista = document.getElementById("senha-requirements");

        Object.entries(regras).forEach(([regra, passou]) => {
            const item = lista?.querySelector(`[data-rule="${regra}"]`);

            if (!item) return;

            item.classList.toggle("is-met", passou);
            item.classList.toggle("is-missing", !passou);

            const icon = item.querySelector(".requirement-icon");

            if (icon) {
                icon.textContent = passou ? "✓" : "×";
            }
        });

        const valida = Object.values(regras).every(Boolean);
        const mostrarEstado = touched.has("senha") || senha.length > 0;

        atualizarEstadoCampo(
            senhaInput,
            mostrarEstado ? valida : null,
            mostrarEstado
                ? (valida ? "Senha válida." : "Ainda faltam requisitos.")
                : ""
        );

        return valida;
    }

    function atualizarCampoEmail() {
        const emailValido = validarEmail(emailInput.value);

        if (!emailValido) {
            emailDisponivel = null;

            atualizarEstadoCampo(
                emailInput,
                touched.has("email") ? false : null,
                touched.has("email") ? "Informe um e-mail válido." : ""
            );

            return false;
        }

        if (emailVerificando) {
            atualizarEstadoCampo(
                emailInput,
                null,
                "Verificando disponibilidade..."
            );

            return false;
        }

        if (emailDisponivel === true) {
            atualizarEstadoCampo(
                emailInput,
                true,
                "E-mail disponível!"
            );

            return true;
        }

        if (emailDisponivel === false) {
            atualizarEstadoCampo(
                emailInput,
                false,
                "Este e-mail já está cadastrado."
            );

            return false;
        }

        atualizarEstadoCampo(
            emailInput,
            null,
            "Aguardando verificação do e-mail..."
        );

        return false;
    }

    async function verificarDisponibilidadeEmail() {
        const email = emailInput.value.trim();

        if (!validarEmail(email)) {
            emailDisponivel = null;
            emailVerificando = false;
            atualizarCampoEmail();

            return false;
        }

        if (emailTimer) {
            clearTimeout(emailTimer);
            emailTimer = null;
        }

        if (emailController) {
            emailController.abort();
        }

        const requisicaoAtual = ++emailRequisicao;
        emailController = new AbortController();

        emailVerificando = true;
        emailDisponivel = null;

        atualizarCampoEmail();
        atualizarBotao();

        try {
            const response = await fetch(
                `/api/v1/auth/verificar-email?email=${encodeURIComponent(email)}`,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    signal: emailController.signal
                }
            );

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.detail || "Não foi possível verificar o e-mail."
                );
            }

            if (requisicaoAtual !== emailRequisicao) {
                return false;
            }

            emailDisponivel = result.disponivel === true;

            atualizarCampoEmail();

            return emailDisponivel;

        } catch (error) {
            if (error.name === "AbortError") {
                return false;
            }

            if (requisicaoAtual === emailRequisicao) {
                emailDisponivel = null;

                atualizarEstadoCampo(
                    emailInput,
                    false,
                    "Não foi possível verificar. Tente novamente."
                );
            }

            return false;

        } finally {
            if (requisicaoAtual === emailRequisicao) {
                emailVerificando = false;
                atualizarCampoEmail();
                atualizarBotao();
            }
        }
    }

    function agendarVerificacaoEmail() {
        if (emailTimer) {
            clearTimeout(emailTimer);
        }

        if (emailController) {
            emailController.abort();
            emailController = null;
        }

        emailRequisicao++;
        emailVerificando = false;
        emailDisponivel = null;

        if (!validarEmail(emailInput.value)) {
            atualizarCampoEmail();
            atualizarBotao();
            return;
        }

        atualizarCampoEmail();
        atualizarBotao();

        emailTimer = setTimeout(() => {
            verificarDisponibilidadeEmail();
        }, 500);
    }

    function validarCampo(nome, force = false) {
        const input = form.elements[nome];
        const deveMostrar = force || touched.has(nome);

        let valido = false;
        let texto = "";

        switch (nome) {
            case "nome":
                valido = validarNome(input.value);

                texto = valido
                    ? "Nome preenchido corretamente."
                    : "Informe seu nome (mínimo de 3 caracteres).";

                break;

            case "cpf":
                valido = validarCPF(input.value);

                texto = valido
                    ? "CPF válido."
                    : "Digite um CPF válido.";

                break;

            case "telefone":
                if (!input.value.trim()) {
                    atualizarEstadoCampo(
                        input,
                        null,
                        "Campo opcional."
                    );

                    return true;
                }

                valido = validarCelular(input.value);

                texto = valido
                    ? "Celular válido."
                    : "Informe DDD + número de celular com 9 dígitos.";

                break;

            case "email":
                return atualizarCampoEmail();

            case "senha":
                return atualizarSenha();
        }

        atualizarEstadoCampo(
            input,
            deveMostrar ? valido : null,
            deveMostrar ? texto : ""
        );

        return valido;
    }

    function formularioValido() {
        const nomeOk = validarCampo("nome", true);
        const cpfOk = validarCampo("cpf", true);
        const telefoneOk = validarCampo("telefone", true);
        const emailOk = atualizarCampoEmail();
        const senhaOk = atualizarSenha();

        return nomeOk &&
            cpfOk &&
            telefoneOk &&
            emailOk &&
            senhaOk;
    }

    function atualizarBotao() {
        if (!submitButton || submitting) return;

        const valido =
            validarNome(nomeInput.value) &&
            validarCPF(cpfInput.value) &&
            (
                !telefoneInput.value.trim() ||
                validarCelular(telefoneInput.value)
            ) &&
            validarEmail(emailInput.value) &&
            emailDisponivel === true &&
            !emailVerificando &&
            Object.values(regrasSenha(senhaInput.value)).every(Boolean);

        submitButton.disabled = !valido;
    }

    const campos = [
        cpfInput,
        nomeInput,
        telefoneInput,
        emailInput,
        senhaInput
    ];

    campos.forEach(input => {
        input.addEventListener("blur", () => {
            touched.add(input.name);

            if (input === emailInput) {
                if (
                    validarEmail(emailInput.value) &&
                    emailDisponivel !== true
                ) {
                    verificarDisponibilidadeEmail();
                } else {
                    validarCampo(input.name, true);
                }
            } else {
                validarCampo(input.name, true);
            }

            atualizarBotao();
        });

        input.addEventListener("input", () => {
            touched.add(input.name);

            if (input === cpfInput) {
                const inicio = input.selectionStart;
                const antes = input.value;

                input.value = formatarCPF(input.value);

                if (inicio === antes.length) {
                    input.setSelectionRange(
                        input.value.length,
                        input.value.length
                    );
                }
            }

            if (input === telefoneInput) {
                const inicio = input.selectionStart;
                const antes = input.value;

                input.value = formatarCelular(input.value);

                if (inicio === antes.length) {
                    input.setSelectionRange(
                        input.value.length,
                        input.value.length
                    );
                }
            }

            if (input === emailInput) {
                agendarVerificacaoEmail();
            } else {
                validarCampo(input.name, true);
            }

            atualizarBotao();

            if (message) {
                showMessage("");
            }
        });
    });

    // Campos neutros até a primeira interação.
    campos.forEach(input => {
        atualizarEstadoCampo(input, null, "");
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (submitting) return;

        if (emailTimer) {
            clearTimeout(emailTimer);
            emailTimer = null;
        }

        const nomeOk = validarCampo("nome", true);
        const cpfOk = validarCampo("cpf", true);
        const telefoneOk = validarCampo("telefone", true);
        const senhaOk = atualizarSenha();

        if (!nomeOk || !cpfOk || !telefoneOk || !senhaOk) {
            showMessage(
                "Confira os campos destacados antes de continuar.",
                "error"
            );

            const primeiroInvalido = [
                nomeInput,
                cpfInput,
                telefoneInput,
                emailInput,
                senhaInput
            ].find(input =>
                input.closest(".cad-field")?.classList.contains("is-invalid")
            );

            primeiroInvalido?.focus();
            atualizarBotao();

            return;
        }

        // Consulta novamente o banco antes de cadastrar.
        showMessage("Verificando disponibilidade do e-mail...");

        const emailLivre = await verificarDisponibilidadeEmail();

        if (!emailLivre) {
            showMessage(
                emailDisponivel === false
                    ? "Este e-mail já está cadastrado. Utilize outro e-mail."
                    : "Não foi possível verificar o e-mail. Tente novamente.",
                "error"
            );

            emailInput.focus();
            atualizarBotao();

            return;
        }

        const data = {
            cpf: limparNumeros(cpfInput.value),
            nome: nomeInput.value.trim().replace(/\s+/g, " "),
            telefone: limparNumeros(telefoneInput.value) || null,
            email: emailInput.value.trim(),
            senha: senhaInput.value
        };

        submitting = true;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Enviando cadastro...";
        }

        showMessage("Enviando cadastro...");

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
                    detail = detail.map(item => item.msg).join(" ");
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
            touched.clear();

            emailDisponivel = null;
            emailVerificando = false;

            campos.forEach(input => {
                atualizarEstadoCampo(input, null, "");
            });

            const lista = document.getElementById("senha-requirements");

            lista?.querySelectorAll("li").forEach(item => {
                item.classList.remove("is-met");
                item.classList.add("is-missing");

                const icon = item.querySelector(".requirement-icon");

                if (icon) {
                    icon.textContent = "×";
                }
            });

            window.setTimeout(() => {
                window.location.href = "/static/index.html?v=20261106-cs";
            }, 1500);

        } catch (error) {
            showMessage(
                error.message || "Erro ao realizar cadastro.",
                "error"
            );

        } finally {
            submitting = false;

            if (submitButton) {
                submitButton.textContent = "Criar cadastro";
                atualizarBotao();
            }
        }
    });
});
