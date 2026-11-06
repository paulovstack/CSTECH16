
/* ==================================================
   DASHBOARD - CSTECH16
================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    if (!requireLogin()) return;

    const message = document.getElementById("dashboard-message");

    const formatNumber = value =>
        Number(value || 0).toLocaleString("pt-BR");

    const formatMoney = value =>
        Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    /* ==========================================
       DATA E STATUS
    ========================================== */

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(String(value).replace(" ", "T"));

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString("pt-BR");
    }

    function formatStatus(status) {
        const statuses = {
            CONCLUIDA: "Concluída",
            PENDENTE: "Pendente",
            EM_PROCESSAMENTO: "Em processamento",
            CANCELADA: "Cancelada"
        };

        return statuses[String(status || "").toUpperCase()]
            || status
            || "—";
    }

    /* ==========================================
       CARREGAMENTO DO USUÁRIO
    ========================================== */

    let user;

    try {
        user = await apiRequest("/api/v1/auth/me");

        sessionStorage.setItem(
            "cstech16_user",
            JSON.stringify(user)
        );

    } catch (error) {
        const errorMessage = String(error.message || "").toLowerCase();

        if (
            errorMessage.includes("401") ||
            errorMessage.includes("token")
        ) {
            logout();
            return;
        }

        showApiError(message, error);
        return;
    }

    /* ==========================================
       PERSONALIZAÇÃO
    ========================================== */

    const nome = user.nome || user.email || "usuário";

    setText("welcome-title", `Olá, ${nome}!`);

    setText(
        "user-chip",
        `${user.perfil || "Usuário"} · ${user.email || ""}`
    );

    /* ==========================================
       PERMISSÕES
    ========================================== */

    const perfil = String(user.perfil || "").toUpperCase();

    const isAdmin = perfil === "ADMIN";
    const isFuncionario = perfil === "FUNCIONARIO";

    if (!isAdmin && !isFuncionario) {
        window.location.href = "/static/loja.html?v=20261106-cs";
        return;
    }

    ["employee-nav", "employee-card", "employee-link"].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.hidden = !isAdmin;
    });

    const salesSection = document.getElementById("admin-sales-section");

    if (salesSection) {
        salesSection.hidden = !isAdmin;
    }

    /* ==========================================
       CARREGAMENTO DO ESTOQUE
    ========================================== */

    async function carregarEstoque() {
        try {
            const response = await apiRequest("/api/v1/produtos/");

            const produtos = Array.isArray(response)
                ? response
                : (response?.produtos || response?.items || []);

            const total = produtos.length;

            const estoque = produtos.reduce(
                (soma, produto) =>
                    soma + Number(produto.quantidade || 0),
                0
            );

            const semEstoque = produtos.filter(
                produto => Number(produto.quantidade || 0) <= 0
            ).length;

            const valorEstoque = produtos.reduce(
                (soma, produto) =>
                    soma +
                    Number(produto.quantidade || 0) *
                    Number(produto.preco_venda || 0),
                0
            );

            setText("metric-products", formatNumber(total));
            setText("metric-stock", formatNumber(estoque));
            setText("metric-out", formatNumber(semEstoque));
            setText("metric-value", formatMoney(valorEstoque));

            setText("available-count", formatNumber(total - semEstoque));
            setText("empty-count", formatNumber(semEstoque));

            const availableProgress = document.getElementById("available-progress");
            const emptyProgress = document.getElementById("empty-progress");

            if (availableProgress) {
                availableProgress.style.width =
                    `${total ? ((total - semEstoque) / total) * 100 : 0}%`;
            }

            if (emptyProgress) {
                emptyProgress.style.width =
                    `${total ? (semEstoque / total) * 100 : 0}%`;
            }

            /* CATEGORIAS */

            const counts = {};

            produtos.forEach(produto => {
                const categoria = String(produto.categoria || "Outros");
                counts[categoria] = (counts[categoria] || 0) + 1;
            });

            const colors = [
                "#3478ed",
                "#14b8a6",
                "#f59e0b",
                "#8b5cf6",
                "#ef6c65",
                "#7bbd4b",
                "#e56da4"
            ];

            const categories = Object.entries(counts)
                .sort((a, b) => b[1] - a[1]);

            const donut = document.querySelector(".premium-donut");
            const legend = document.querySelector(".premium-donut-legend");

            if (donut && total > 0) {
                let percentage = 0;

                const segments = categories.map(([name, quantity], index) => {
                    const start = percentage;
                    percentage += (quantity / total) * 100;

                    return `${colors[index % colors.length]} ${start}% ${percentage}%`;
                });

                donut.style.background =
                    `conic-gradient(${segments.join(",")})`;

            } else if (donut) {
                donut.style.background = "#26354e";
            }

            if (legend) {
                legend.replaceChildren();

                if (!categories.length) {
                    legend.textContent = "Nenhuma categoria cadastrada";
                } else {
                    categories.forEach(([name, quantity], index) => {
                        const item = document.createElement("div");
                        const color = document.createElement("i");
                        const label = document.createElement("span");
                        const value = document.createElement("strong");

                        color.style.background = colors[index % colors.length];
                        label.textContent = name;
                        value.textContent = quantity;

                        item.append(color, label, value);
                        legend.appendChild(item);
                    });
                }
            }

        } catch (error) {
            showApiError(message, error);
        }
    }

    /* ==========================================
       RESUMO FINANCEIRO
    ========================================== */

    async function carregarResumo() {
        try {
            const dados = await apiRequest("/api/v1/relatorios/resumo");

            setText("sales-revenue", formatMoney(dados.faturamento_total));
            setText("sales-units", formatNumber(dados.unidades_vendidas));
            setText("sales-orders", formatNumber(dados.pedidos_concluidos));
            setText("sales-ticket", formatMoney(dados.ticket_medio));

        } catch (error) {
            setText("sales-revenue", "Indisponível");
            setText("sales-units", "—");
            setText("sales-orders", "—");
            setText("sales-ticket", "—");

            console.error("Erro ao carregar resumo:", error);
        }
    }

    /* ==========================================
       RANKING DE PRODUTOS
    ========================================== */

    async function carregarRanking() {
        const tbody = document.getElementById("sales-ranking-body");
        if (!tbody) return;

        try {
            const response = await apiRequest("/api/v1/relatorios/produtos");

            const produtos = Array.isArray(response)
                ? response
                : (response?.produtos || response?.items || []);

            tbody.replaceChildren();

            if (!produtos.length) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 4;
                cell.textContent = "Nenhuma venda concluída encontrada.";

                row.appendChild(cell);
                tbody.appendChild(row);
                return;
            }

            produtos.forEach(produto => {
                const row = document.createElement("tr");

                const values = [
                    produto.nome || "Produto",
                    formatNumber(produto.unidades_vendidas),
                    formatNumber(produto.pedidos),
                    formatMoney(produto.valor_arrecadado)
                ];

                values.forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            });

        } catch (error) {
            tbody.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 4;
            cell.textContent = "Não foi possível carregar o ranking.";

            row.appendChild(cell);
            tbody.appendChild(row);

            console.error("Erro no ranking:", error);
        }
    }

    /* ==========================================
       HISTÓRICO DE COMPRAS
    ========================================== */

    async function carregarHistorico() {
        const tbody = document.getElementById("sales-history-body");
        const historyMessage = document.getElementById("history-message");

        if (!tbody) return;

        try {
            setText("history-message", "Consultando histórico...");

            const status = document.getElementById("history-status")?.value || "";
            const dataInicio = document.getElementById("history-start")?.value || "";
            const dataFim = document.getElementById("history-end")?.value || "";

            if (dataInicio && dataFim && dataInicio > dataFim) {
                throw new Error(
                    "A data inicial não pode ser posterior à data final."
                );
            }

            const params = new URLSearchParams();

            if (status) params.append("status", status);
            if (dataInicio) params.append("data_inicio", dataInicio);
            if (dataFim) params.append("data_fim", dataFim);

            const query = params.toString();

            const endpoint = query
                ? `/api/v1/relatorios/historico?${query}`
                : "/api/v1/relatorios/historico";

            const response = await apiRequest(endpoint);

            const compras = Array.isArray(response)
                ? response
                : (response?.historico || response?.items || []);

            tbody.replaceChildren();

            if (!compras.length) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 7;
                cell.textContent = "Nenhuma compra encontrada.";

                row.appendChild(cell);
                tbody.appendChild(row);

                setText(
                    "history-message",
                    "Nenhum resultado para os filtros selecionados."
                );

                return;
            }

            compras.forEach(compra => {
                const row = document.createElement("tr");

                const values = [
                    `#${compra.id_compra ?? "—"}`,
                    compra.nome_cliente || compra.cpf || "—",
                    compra.nome_produto || "—",
                    formatNumber(compra.quantidade),
                    formatMoney(compra.preco_unit),
                    formatStatus(compra.status),
                    formatDate(compra.data_compra)
                ];

                values.forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            });

            setText(
                "history-message",
                `${compras.length} registro(s) encontrado(s).`
            );

        } catch (error) {
            tbody.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 7;
            cell.textContent = error.message ||
                "Não foi possível carregar o histórico.";

            row.appendChild(cell);
            tbody.appendChild(row);

            if (historyMessage) {
                historyMessage.textContent = error.message;
            }
        }
    }

    /* ==========================================
       FILTROS DO HISTÓRICO
    ========================================== */

    const filterButton = document.getElementById("filter-history");
    const clearButton = document.getElementById("clear-history");

    if (filterButton) {
        filterButton.addEventListener("click", carregarHistorico);
    }

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            document.getElementById("history-status").value = "";
            document.getElementById("history-start").value = "";
            document.getElementById("history-end").value = "";

            carregarHistorico();
        });
    }

    /* ==========================================
       GRÁFICO DE VENDAS
    ========================================== */

    const salesChart = {
        svg: document.getElementById("sales-chart"),
        mensagem: document.getElementById("sales-chart-message")
    };

    function dataLocalISO(date) {
        const ano = date.getFullYear();
        const mes = String(date.getMonth() + 1).padStart(2, "0");
        const dia = String(date.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
    }

    function configurarDatasGrafico() {
        const inicio = document.getElementById("chart-start-date");
        const fim = document.getElementById("chart-end-date");

        if (!inicio || !fim) return;

        const hoje = new Date();
        const trintaDiasAtras = new Date();

        trintaDiasAtras.setDate(hoje.getDate() - 29);

        inicio.value = inicio.value || dataLocalISO(trintaDiasAtras);
        fim.value = fim.value || dataLocalISO(hoje);

        inicio.max = dataLocalISO(hoje);
        fim.max = dataLocalISO(hoje);
    }

    function criarElementoSVG(tag, atributos = {}) {
        const elemento = document.createElementNS(
            "http://www.w3.org/2000/svg",
            tag
        );

        Object.entries(atributos).forEach(([chave, valor]) => {
            elemento.setAttribute(chave, valor);
        });

        return elemento;
    }

    function limparGrafico() {
        if (salesChart.svg) {
            salesChart.svg.replaceChildren();
        }
    }

    function mostrarMensagemGrafico(mensagem) {
        if (salesChart.mensagem) {
            salesChart.mensagem.textContent = mensagem;
            salesChart.mensagem.hidden = false;
        }

        if (salesChart.svg) {
            salesChart.svg.hidden = true;
        }
    }

    function esconderMensagemGrafico() {
        if (salesChart.mensagem) {
            salesChart.mensagem.hidden = true;
        }

        if (salesChart.svg) {
            salesChart.svg.hidden = false;
        }
    }

    function formatarValorGrafico(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0
        });
    }

    function formatarDataGrafico(data) {
        const partes = String(data).split("-");

        if (partes.length !== 3) return data;

        return `${partes[2]}/${partes[1]}`;
    }

    function preencherDias(dados) {
        const inicio = document.getElementById("chart-start-date");
        const fim = document.getElementById("chart-end-date");
        const mapa = new Map(dados.map(d => [String(d.data).slice(0, 10), d]));
        const chaves = [...mapa.keys()].sort();
        const ini = [inicio && inicio.value, chaves[0]].filter(Boolean).sort()[0];
        const fimV = [fim && fim.value, chaves[chaves.length - 1]].filter(Boolean).sort().pop();
        if (!ini || !fimV) return dados;
        const [a, b, c] = ini.split("-").map(Number);
        const d0 = new Date(a, b - 1, c);
        const out = [];
        for (let i = 0; i < 400; i++) {
            const dia = dataLocalISO(d0);
            out.push(mapa.get(dia) || { data: dia, faturamento: 0, pedidos: 0, unidades_vendidas: 0 });
            if (dia >= fimV) break;
            d0.setDate(d0.getDate() + 1);
        }
        return out.length > 1 && out.length <= 366 ? out : dados;
    }

    function desenharGraficoVendas(brutos) {
        const svg = salesChart.svg;
        if (!svg) return;
        limparGrafico();
        const box = svg.parentElement;
        box.querySelectorAll(".cs-tip,.cs-legend").forEach(e => e.remove());

        if (!brutos.length) {
            mostrarMensagemGrafico("Nenhuma venda concluída encontrada neste período.");
            return;
        }
        esconderMensagemGrafico();

        const dados = preencherDias(brutos);
        const NS = "http://www.w3.org/2000/svg";
        const W = 860, H = 360, m = { top: 34, right: 78, bottom: 44, left: 74 };
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        const iw = W - m.left - m.right, ih = H - m.top - m.bottom, n = dados.length;
        const vals = dados.map(d => Number(d.faturamento || 0));
        let soma = 0;
        const acum = vals.map(v => (soma += v));
        const nice = v => {
            if (v <= 0) return 100;
            const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
            return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
        };
        const maxD = nice(Math.max(...vals) * 1.08), maxC = nice(soma * 1.04);
        const banda = iw / n, bw = Math.max(1.5, Math.min(46, banda * 0.62));
        const px = i => m.left + banda * (i + 0.5);
        const yD = v => m.top + ih - (v / maxD) * ih;
        const yC = v => m.top + ih - (v / maxC) * ih;
        const base = m.top + ih;
        const el = (tag, attrs, pai) => {
            const e = document.createElementNS(NS, tag);
            for (const k in attrs) e.setAttribute(k, attrs[k]);
            (pai || svg).appendChild(e);
            return e;
        };
        const curto = v => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`
            : v >= 1000 ? `R$ ${(v / 1000).toFixed(v % 1000 ? 1 : 0).replace(".", ",")} mil`
            : `R$ ${Math.round(v)}`;
        const fonte = "font:600 11px Inter,system-ui,sans-serif";

        /* gradientes e brilho */
        const defs = el("defs", {});
        const grad = (id, x2, y2, stops, extra = {}) => {
            const g = el("linearGradient", { id, x1: 0, y1: 0, x2, y2, ...extra }, defs);
            stops.forEach(([o, c, op]) => el("stop", { offset: o, "stop-color": c, "stop-opacity": op }, g));
        };
        grad("cs-gbar", 0, 1, [[0, "#8da0ff", .95], [1, "#dfe6ff", .35]]);
        grad("cs-gbar-hot", 0, 1, [[0, "#4357d5", 1], [1, "#8da0ff", .6]]);
        grad("cs-garea", 0, 1, [[0, "#4357d5", .22], [1, "#4357d5", 0]]);
        grad("cs-gline", 1, 0, [[0, "#4357d5", 1], [.6, "#7c5cff", 1], [1, "#22d3ee", 1]],
            { gradientUnits: "userSpaceOnUse", x1: m.left, x2: W - m.right, y1: 0, y2: 0 });
        const flt = el("filter", { id: "cs-glow", x: "-20%", y: "-40%", width: "140%", height: "180%" }, defs);
        el("feGaussianBlur", { stdDeviation: 3.2, result: "b" }, flt);
        const fm = el("feMerge", {}, flt);
        el("feMergeNode", { in: "b" }, fm);
        el("feMergeNode", { in: "SourceGraphic" }, fm);

        /* grade + escalas (esquerda: dia, direita: acumulado) */
        for (let i = 0; i <= 4; i++) {
            const y = m.top + (ih / 4) * i, t = 1 - i / 4;
            el("line", { x1: m.left, x2: W - m.right, y1: y, y2: y, stroke: i === 4 ? "#cfd6e6" : "#e8ecf5", "stroke-dasharray": i === 4 ? "0" : "4 6" });
            const l = el("text", { x: m.left - 12, y: y + 4, "text-anchor": "end", fill: "#7d89a0", style: fonte });
            l.textContent = curto(maxD * t);
            const r = el("text", { x: W - m.right + 12, y: y + 4, fill: "#4357d5", style: fonte });
            r.textContent = curto(maxC * t);
        }

        /* colunas do faturamento diário */
        const barras = vals.map((v, i) => {
            if (v <= 0) return null;
            const y = yD(v);
            return el("rect", { x: px(i) - bw / 2, y, width: bw, height: base - y, rx: Math.min(9, bw / 2), fill: "url(#cs-gbar)", class: "cs-bar", style: `--d:${Math.min(i * 28, 900)}ms` });
        });

        /* linha crescente do acumulado + seta */
        const pts = acum.map((v, i) => [px(i), yC(v)]);
        if (n > 1) {
            let d = `M ${pts[0][0]} ${pts[0][1]}`;
            for (let i = 1; i < n; i++) {
                const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
                d += ` C ${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
            }
            el("path", { d: `${d} L ${pts[n - 1][0]} ${base} L ${pts[0][0]} ${base} Z`, fill: "url(#cs-garea)", class: "cs-area" });
            el("path", { d, pathLength: 1, fill: "none", stroke: "url(#cs-gline)", "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#cs-glow)", class: "cs-line" });
            const k = Math.max(0, n - 1 - Math.max(2, Math.round(n / 6)));
            const ang = Math.atan2(pts[n - 1][1] - pts[k][1], pts[n - 1][0] - pts[k][0]);
            const g = el("g", { class: "cs-arrow", transform: `translate(${pts[n - 1][0]} ${pts[n - 1][1]}) rotate(${ang * 180 / Math.PI})` });
            el("path", { d: "M 3 0 L -9 -7.5 L -5 0 L -9 7.5 Z", fill: "#22d3ee", stroke: "#22d3ee", "stroke-width": 2, "stroke-linejoin": "round" }, g);
        }
        pts.forEach(([x, y], i) => {
            if (vals[i] > 0 || i === n - 1) el("circle", { cx: x, cy: y, r: 4.6, fill: "#fff", stroke: "#4357d5", "stroke-width": 3, class: "cs-pt" });
        });
        el("circle", { cx: pts[n - 1][0], cy: pts[n - 1][1], r: 6, fill: "none", stroke: "#22d3ee", "stroke-width": 2, class: "cs-pulse" });

        /* datas */
        const passo = Math.ceil(n / 8);
        dados.forEach((it, i) => {
            if (i % passo !== 0 && i !== n - 1) return;
            if (i !== n - 1 && n - 1 - i < passo * 0.6) return;
            const t = el("text", { x: px(i), y: H - 14, "text-anchor": "middle", fill: "#7d89a0", style: fonte });
            t.textContent = formatarDataGrafico(it.data);
        });

        /* legenda */
        const melhor = vals.indexOf(Math.max(...vals));
        const lg = document.createElement("div");
        lg.className = "cs-legend";
        lg.innerHTML = '<span><i class="b"></i>Faturamento diário</span><span><i class="l"></i>Acumulado no período</span>';
        if (vals[melhor] > 0) {
            const em = document.createElement("em");
            em.textContent = `Melhor dia: ${formatarDataGrafico(dados[melhor].data)} · ${formatarValorGrafico(vals[melhor])}`;
            lg.appendChild(em);
        }
        box.insertBefore(lg, svg);

        /* interação: guia, destaque e tooltip */
        const guia = el("line", { y1: m.top, y2: base, stroke: "#4357d5", "stroke-opacity": .4, "stroke-dasharray": "3 4", style: "opacity:0;pointer-events:none" });
        const tip = document.createElement("div");
        tip.className = "cs-tip";
        box.appendChild(tip);
        dados.forEach((it, i) => {
            const hit = el("rect", { x: m.left + banda * i, y: m.top, width: banda, height: ih + 6, fill: "transparent", style: "cursor:crosshair" });
            hit.addEventListener("pointerenter", () => {
                guia.setAttribute("x1", px(i));
                guia.setAttribute("x2", px(i));
                guia.style.opacity = 1;
                if (barras[i]) barras[i].setAttribute("fill", "url(#cs-gbar-hot)");
                const p = String(it.data).replace(/[^0-9-]/g, "").split("-");
                tip.innerHTML = `<b>${p[2]}/${p[1]}/${p[0]}</b>` +
                    `<span><i class="b"></i>Dia <strong>${formatarValorGrafico(vals[i])}</strong></span>` +
                    `<span><i class="l"></i>Acumulado <strong>${formatarValorGrafico(acum[i])}</strong></span>` +
                    `<small>${Number(it.pedidos || 0)} pedidos · ${Number(it.unidades_vendidas || 0)} unidades</small>`;
                const r = svg.getBoundingClientRect(), br = box.getBoundingClientRect(), s = r.width / W;
                const x = (r.left - br.left) + px(i) * s;
                const y = (r.top - br.top) + Math.min(vals[i] > 0 ? yD(vals[i]) : base, yC(acum[i])) * s;
                tip.style.left = Math.max(95, Math.min(br.width - 95, x)) + "px";
                tip.style.top = Math.max(8, y - 14) + "px";
                tip.classList.add("on");
            });
            hit.addEventListener("pointerleave", () => {
                guia.style.opacity = 0;
                tip.classList.remove("on");
                if (barras[i]) barras[i].setAttribute("fill", "url(#cs-gbar)");
            });
        });
    }

    function atualizarResumoGrafico(dados) {
        const faturamento = dados.reduce(
            (soma, item) => soma + Number(item.faturamento || 0),
            0
        );

        const pedidos = dados.reduce(
            (soma, item) => soma + Number(item.pedidos || 0),
            0
        );

        const unidades = dados.reduce(
            (soma, item) => soma + Number(item.unidades_vendidas || 0),
            0
        );

        setText("chart-total-revenue", formatMoney(faturamento));
        setText("chart-total-orders", formatNumber(pedidos));
        setText("chart-total-units", formatNumber(unidades));

        const resumo = document.querySelector(".sales-chart-summary");
        if (resumo) {
            if (!document.getElementById("chart-ticket")) {
                const bloco = document.createElement("div");
                bloco.innerHTML = '<span>Ticket médio</span><strong id="chart-ticket">R$ 0,00</strong>';
                resumo.appendChild(bloco);
            }
            setText("chart-ticket", formatMoney(pedidos ? faturamento / pedidos : 0));
        }
    }

    async function carregarGraficoVendas() {
        const inicio = document.getElementById("chart-start-date");
        const fim = document.getElementById("chart-end-date");
        const botao = document.getElementById("filter-sales-chart");

        if (!inicio || !fim) {
            console.warn("Campos de data do gráfico não encontrados.");
            return;
        }

        if (inicio.value && fim.value && inicio.value > fim.value) {
            mostrarMensagemGrafico(
                "A data inicial não pode ser posterior à data final."
            );
            return;
        }

        if (botao) {
            botao.disabled = true;
            botao.textContent = "Carregando...";
        }

        try {
            const params = new URLSearchParams();

            if (inicio.value) {
                params.append("data_inicio", inicio.value);
            }

            if (fim.value) {
                params.append("data_fim", fim.value);
            }

            const response = await apiRequest(
                `/api/v1/relatorios/vendas-periodo?${params.toString()}`
            );

            const dados = Array.isArray(response)
                ? response
                : (response?.dados || response?.items || []);

            atualizarResumoGrafico(dados);
            desenharGraficoVendas(dados);

        } catch (error) {
            console.error("Erro ao carregar gráfico de vendas:", error);

            mostrarMensagemGrafico(
                "Não foi possível carregar o gráfico. Verifique sua conexão e tente novamente."
            );

            setText("chart-total-revenue", "—");
            setText("chart-total-orders", "—");
            setText("chart-total-units", "—");

        } finally {
            if (botao) {
                botao.disabled = false;
                botao.textContent = "Filtrar período";
            }
        }
    }

    function iniciarGraficoVendas() {
        if (!salesChart.svg) {
            console.warn("Elemento SVG do gráfico não encontrado.");
            return;
        }

        configurarDatasGrafico();

        const filtrosGrafico = document.querySelector(".sales-chart-filters");
        if (filtrosGrafico && !filtrosGrafico.querySelector(".cs-chips")) {
            const chips = document.createElement("div");
            chips.className = "cs-chips";
            [["7 dias", 7], ["30 dias", 30], ["90 dias", 90], ["12 meses", 365]].forEach(([rotulo, dias]) => {
                const b = document.createElement("button");
                b.type = "button";
                b.textContent = rotulo;
                if (dias === 30) b.className = "on";
                b.addEventListener("click", () => {
                    const hoje = new Date(), ini = new Date();
                    ini.setDate(hoje.getDate() - (dias - 1));
                    document.getElementById("chart-start-date").value = dataLocalISO(ini);
                    document.getElementById("chart-end-date").value = dataLocalISO(hoje);
                    chips.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
                    carregarGraficoVendas();
                });
                chips.appendChild(b);
            });
            filtrosGrafico.prepend(chips);
        }

        const botao = document.getElementById("filter-sales-chart");

        if (botao) {
            botao.addEventListener("click", carregarGraficoVendas);
        }

        carregarGraficoVendas();
    }

    /* ==========================================
       INICIALIZAÇÃO
    ========================================== */

    await carregarEstoque();

    if (isAdmin) {
        await Promise.all([
            carregarResumo(),
            carregarRanking(),
            carregarHistorico()
        ]);

        iniciarGraficoVendas();
    }

});
