
/* ==================================================
   COMPRAS - CSTECH16
================================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Verifica se o usuário está autenticado.
    if (!requireLogin()) return;

    const content = document.getElementById("purchases-content");
    const message = document.getElementById("purchases-message");
    const refreshButton = document.getElementById("refresh-purchases");

    /*
     * Configure esta variável quando a rota de compras
     * estiver disponível no backend FastAPI.
     *
     * Exemplo: "/api/v1/compras"
     */
    const PURCHASES_ENDPOINT = null;


    /* ==============================================
       ESCAPE DE HTML
    ============================================== */

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }


    /* ==============================================
       FORMATAÇÃO DOS DADOS
    ============================================== */

    function formatValue(value) {
        if (value === null || value === undefined || value === "") {
            return "—";
        }

        return escapeHtml(value);
    }


    /* ==============================================
       CARREGAMENTO DAS COMPRAS
    ============================================== */

    async function loadPurchases() {

        // Verifica se a rota foi configurada.
        if (!PURCHASES_ENDPOINT) {
            setMessage(
                message,
                "A interface está pronta, mas o projeto ainda precisa disponibilizar uma rota de compras no backend."
            );

            return;
        }

        if (refreshButton) {
            refreshButton.disabled = true;
        }

        setMessage(message, "Carregando compras...");

        try {

            // Consulta a API com autenticação.
            const data = await apiRequest(PURCHASES_ENDPOINT);

            // Aceita uma lista direta ou uma resposta com coleção.
            const rows = Array.isArray(data)
                ? data
                : (data?.items || data?.compras || []);

            // Verifica se existem compras.
            if (!Array.isArray(rows) || rows.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <h3>Nenhuma compra encontrada</h3>
                    </div>
                `;

                setMessage(message, "");
                return;
            }

            // Monta a tabela de compras.
            content.innerHTML = `
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Pedido</th>
                                <th>Data</th>
                                <th>Valor</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${rows.map(purchase => `
                                <tr>
                                    <td>
                                        ${formatValue(
                                            purchase.id_compra ??
                                            purchase.id ??
                                            purchase.numero
                                        )}
                                    </td>

                                    <td>
                                        ${formatValue(
                                            purchase.data ??
                                            purchase.data_compra
                                        )}
                                    </td>

                                    <td>
                                        ${formatValue(
                                            purchase.valor_total ??
                                            purchase.valor
                                        )}
                                    </td>

                                    <td>
                                        ${formatValue(purchase.status)}
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;

            setMessage(message, "");

        } catch (error) {

            showApiError(message, error);

        } finally {

            if (refreshButton) {
                refreshButton.disabled = false;
            }

        }
    }


    /* ==============================================
       EVENTOS
    ============================================== */

    if (refreshButton) {
        refreshButton.addEventListener("click", loadPurchases);
    }

    // Carrega as compras ao abrir a página.
    loadPurchases();

});
