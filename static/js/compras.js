
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('orders-list-container');
    const totalPedidosEl = document.getElementById('total-pedidos');
    const totalValorEl = document.getElementById('valor-pedidos');

    let todosOsPedidos = [];
    const produtosAvaliados = new Set();

    const money = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    function escaparHTML(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[caractere]);
    }

    // =====================================================
    // MODAL DE AVALIAÇÃO
    // =====================================================

    function criarModalAvaliacao() {
        if (document.getElementById('modal-avaliacao')) return;

        const modal = document.createElement('div');

        modal.id = 'modal-avaliacao';
        modal.className = 'avaliacao-overlay';

        modal.innerHTML = `
            <div class="avaliacao-modal">
                <h2>Avaliar produto</h2>
                <p id="avaliacao-nome-produto"></p>

                <form id="form-avaliacao">
                    <input type="hidden" id="avaliacao-id-produto">

                    <label>Como você avalia este produto?</label>

                    <div class="avaliacao-stars" id="avaliacao-stars">
                        ${[1, 2, 3, 4, 5].map(n => `
                            <button type="button"
                                data-nota="${n}"
                                aria-label="${n} estrelas">★</button>
                        `).join('')}
                    </div>

                    <textarea
                        id="avaliacao-comentario"
                        maxlength="2000"
                        placeholder="Conte sua experiência com o produto..."
                        required
                    ></textarea>

                    <div id="avaliacao-feedback"
                        class="avaliacao-feedback"></div>

                    <div class="avaliacao-actions">
                        <button type="button"
                            class="btn-cancelar-avaliacao"
                            id="fechar-avaliacao">
                            Cancelar
                        </button>

                        <button type="submit"
                            class="btn-enviar-avaliacao"
                            id="enviar-avaliacao">
                            Enviar avaliação
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    }

    let notaSelecionada = 0;

    function abrirModalAvaliacao(idProduto, nomeProduto) {
        const modal = document.getElementById('modal-avaliacao');

        document.getElementById('avaliacao-id-produto').value = idProduto;
        document.getElementById('avaliacao-nome-produto').textContent =
            nomeProduto;

        document.getElementById('avaliacao-comentario').value = '';
        document.getElementById('avaliacao-feedback').textContent = '';

        notaSelecionada = 0;
        atualizarEstrelas();

        modal.classList.add('active');
    }

    function fecharModalAvaliacao() {
        document.getElementById('modal-avaliacao')
            .classList.remove('active');
    }

    function atualizarEstrelas() {
        document.querySelectorAll('#avaliacao-stars button')
            .forEach(botao => {
                const nota = Number(botao.dataset.nota);
                botao.classList.toggle('selected', nota <= notaSelecionada);
            });
    }

    // =====================================================
    // RENDERIZAÇÃO DAS COMPRAS
    // =====================================================

    function renderizarPedidos(pedidos) {
        if (!container) return;

        if (!pedidos || pedidos.length === 0) {
            container.innerHTML = `
                <div class="message"
                    style="padding:40px;text-align:center;color:#687487;">
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Sua conta não possui compras com os filtros selecionados.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pedidos.map(pedido => {
            if (!pedido) return '';

            const statusAtual = String(pedido.status || '').toUpperCase();

            const isApproved = [
                'CONCLUIDA',
                'CONCLUÍDA',
                'APPROVED'
            ].includes(statusAtual);

            const isCancelled = [
                'CANCELADA',
                'CANCELLED'
            ].includes(statusAtual);

            const statusClass = isApproved
                ? 'approved'
                : isCancelled
                    ? 'cancelled'
                    : '';

            const statusTexto = isApproved
                ? 'CONCLUÍDA'
                : isCancelled
                    ? 'CANCELADA'
                    : (pedido.status || 'PENDENTE');

            const dataBruta =
                pedido.data_compra ||
                pedido.data_pedido ||
                pedido.data;

            const dataFormatada = dataBruta
                ? new Date(String(dataBruta).replace(' ', 'T'))
                    .toLocaleDateString('pt-BR')
                : 'Data não informada';

            const itensDoPedido = Array.isArray(pedido.itens)
                ? pedido.itens
                : [pedido];

            const itensHTML = itensDoPedido.map(item => {
                if (!item) return '';

                const nomeOriginal =
                    item.nome_produto || item.nome || 'Produto';

                const nomeProduto = escaparHTML(nomeOriginal);

                const idProduto = Number(
                    item.produto_id || item.id_produto || 0
                );

                let linkImagem = item.imagem_url || item.imagem || '';

                if (!linkImagem || !String(linkImagem).trim()) {
                    linkImagem = '/static/img/notebook-air.png';
                }

                linkImagem = escaparHTML(linkImagem);

                const precoUnitario = Number(
                    item.preco_unit ??
                    item.preco_unitario ??
                    item.price ??
                    0
                );

                const qtd = Number(item.quantidade || 1);

                let botaoAvaliacao = '';

                if (isApproved && idProduto > 0) {
                    const jaAvaliou = produtosAvaliados.has(idProduto);

                    botaoAvaliacao = `
                        <button
                            type="button"
                            class="btn-avaliar-produto"
                            data-id-produto="${idProduto}"
                            data-nome-produto="${nomeProduto}"
                            ${jaAvaliou ? 'disabled' : ''}>
                            ${jaAvaliou ? 'Já avaliado' : '★ Avaliar produto'}
                        </button>
                    `;
                } else if (!isApproved) {
                    botaoAvaliacao = `
                        <small class="avaliacao-indisponivel">
                            Avaliação disponível após a conclusão da compra.
                        </small>
                    `;
                }

                return `
                    <div class="order-item">
                        <img
                            src="${linkImagem}"
                            alt="${nomeProduto}"
                            class="order-item-image"
                            onerror="this.onerror=null;this.src='/static/img/notebook-air.png'"
                        >

                        <div class="order-item-details">
                            <div class="item-name">${nomeProduto}</div>

                            <div class="item-info">
                                Quantidade: ${qtd} × ${money.format(precoUnitario)}
                            </div>

                            ${botaoAvaliacao}
                        </div>

                        <div class="item-price">
                            ${money.format(qtd * precoUnitario)}
                        </div>
                    </div>
                `;
            }).join('');

            const totalCalculado = Number(
                pedido.valor_total ??
                pedido.total ??
                itensDoPedido.reduce((acc, item) => {
                    return acc +
                        Number(item?.quantidade || 1) *
                        Number(item?.preco_unit ?? item?.preco_unitario ?? 0);
                }, 0)
            );

            return `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-number">
                            Pedido #${escaparHTML(pedido.id_compra || '—')}
                            <small>Realizado em: ${dataFormatada}</small>
                        </div>

                        <span class="status ${statusClass}">
                            ${escaparHTML(statusTexto)}
                        </span>
                    </div>

                    <div class="order-body">
                        <div class="order-items">
                            ${itensHTML}
                        </div>

                        <div class="order-footer">
                            <span>Valor total do pedido</span>
                            <div class="order-total">
                                ${money.format(totalCalculado)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // =====================================================
    // FILTROS
    // =====================================================

    function aplicarFiltros() {
        const searchInput =
            document.getElementById('filter-search-order');

        const statusSelect =
            document.getElementById('filter-status-order');

        const sortSelect =
            document.getElementById('filter-sort-order');

        const termoBusca = searchInput
            ? searchInput.value.toLowerCase().trim()
            : '';

        const statusFiltro = statusSelect
            ? statusSelect.value
            : 'all';

        const ordenacaoFiltro = sortSelect
            ? sortSelect.value
            : 'newest';

        let filtrados = [...todosOsPedidos];

        if (termoBusca) {
            filtrados = filtrados.filter(pedido => {
                if (!pedido) return false;

                const idMatch = String(
                    pedido.id_compra || ''
                ).includes(termoBusca);

                const itens = Array.isArray(pedido.itens)
                    ? pedido.itens
                    : [pedido];

                const produtoMatch = itens.some(item =>
                    item &&
                    String(item.nome_produto || item.nome || '')
                        .toLowerCase()
                        .includes(termoBusca)
                );

                return idMatch || produtoMatch;
            });
        }

        if (statusFiltro !== 'all') {
            filtrados = filtrados.filter(pedido => {
                if (!pedido) return false;

                const st = String(pedido.status || '').toLowerCase();

                if (statusFiltro === 'approved') {
                    return [
                        'concluida',
                        'concluída',
                        'approved'
                    ].includes(st);
                }

                if (statusFiltro === 'cancelled') {
                    return st === 'cancelada' || st === 'cancelled';
                }

                return st === statusFiltro;
            });
        }

        filtrados.sort((a, b) => {
            const dataA = a.data_compra || a.data_pedido || a.data;
            const dataB = b.data_compra || b.data_pedido || b.data;

            if (dataA && dataB) {
                const diferenca = new Date(dataB) - new Date(dataA);

                if (!Number.isNaN(diferenca) && diferenca !== 0) {
                    return ordenacaoFiltro === 'newest'
                        ? diferenca
                        : -diferenca;
                }
            }

            const idA = Number(a.id_compra || 0);
            const idB = Number(b.id_compra || 0);

            return ordenacaoFiltro === 'newest'
                ? idB - idA
                : idA - idB;
        });

        renderizarPedidos(filtrados);
    }

    // =====================================================
    // EVENTOS DA AVALIAÇÃO
    // =====================================================

    criarModalAvaliacao();

    if (container) {
        container.addEventListener('click', event => {
            const botao = event.target.closest('.btn-avaliar-produto');

            if (!botao || botao.disabled) return;

            abrirModalAvaliacao(
                Number(botao.dataset.idProduto),
                botao.dataset.nomeProduto
            );
        });
    }

    document.getElementById('avaliacao-stars')
        .addEventListener('click', event => {
            const botao = event.target.closest('button[data-nota]');

            if (!botao) return;

            notaSelecionada = Number(botao.dataset.nota);
            atualizarEstrelas();
        });

    document.getElementById('fechar-avaliacao')
        .addEventListener('click', fecharModalAvaliacao);

    document.getElementById('modal-avaliacao')
        .addEventListener('click', event => {
            if (event.target.id === 'modal-avaliacao') {
                fecharModalAvaliacao();
            }
        });

    document.getElementById('form-avaliacao')
        .addEventListener('submit', async event => {
            event.preventDefault();

            const idProduto = Number(
                document.getElementById('avaliacao-id-produto').value
            );

            const comentario = document.getElementById(
                'avaliacao-comentario'
            ).value.trim();

            const feedback = document.getElementById(
                'avaliacao-feedback'
            );

            const botaoEnviar = document.getElementById(
                'enviar-avaliacao'
            );

            feedback.textContent = '';

            if (notaSelecionada < 1 || notaSelecionada > 5) {
                feedback.textContent = 'Selecione uma nota de 1 a 5 estrelas.';
                return;
            }

            if (!comentario) {
                feedback.textContent = 'Escreva um comentário antes de enviar.';
                return;
            }

            botaoEnviar.disabled = true;
            botaoEnviar.textContent = 'Enviando...';

            try {
                await apiRequest('/api/v1/avaliacoes/', {
                    method: 'POST',
                    body: JSON.stringify({
                        id_produto: idProduto,
                        nota: notaSelecionada,
                        comentario: comentario
                    })
                });

                produtosAvaliados.add(idProduto);

                feedback.style.color = '#067647';
                feedback.textContent = 'Avaliação enviada com sucesso!';

                aplicarFiltros();

                setTimeout(fecharModalAvaliacao, 900);

            } catch (erro) {
                console.error('Erro ao enviar avaliação:', erro);

                const mensagem = erro.message || '';

                if (
                    mensagem.toLowerCase().includes('já avaliou') ||
                    mensagem.toLowerCase().includes('ja avaliou')
                ) {
                    produtosAvaliados.add(idProduto);
                    aplicarFiltros();

                    feedback.textContent = 'Você já avaliou este produto.';
                } else {
                    feedback.textContent =
                        mensagem || 'Não foi possível enviar sua avaliação.';
                }

            } finally {
                botaoEnviar.disabled = false;
                botaoEnviar.textContent = 'Enviar avaliação';
            }
        });

    // =====================================================
    // CARREGAMENTO DAS COMPRAS
    // =====================================================

    const searchEl = document.getElementById('filter-search-order');
    const statusEl = document.getElementById('filter-status-order');
    const sortEl = document.getElementById('filter-sort-order');

    if (searchEl) searchEl.addEventListener('input', aplicarFiltros);
    if (statusEl) statusEl.addEventListener('change', aplicarFiltros);
    if (sortEl) sortEl.addEventListener('change', aplicarFiltros);

    try {
        const apiFunc =
            typeof apiRequest === 'function'
                ? apiRequest
                : typeof requisicaoApi === 'function'
                    ? requisicaoApi
                    : null;

        if (!apiFunc) {
            throw new Error('Função de comunicação com a API não encontrada.');
        }

        const resposta = await apiFunc(
            '/api/v1/compras/minhas_compras',
            { method: 'GET' }
        );

        todosOsPedidos = Array.isArray(resposta)
            ? resposta
            : (
                resposta?.historico ||
                resposta?.compras ||
                resposta?.items ||
                []
            );

        if (!Array.isArray(todosOsPedidos)) {
            throw new Error('Formato de resposta da API inválido.');
        }

        if (totalPedidosEl) {
            totalPedidosEl.textContent = todosOsPedidos.length;
        }

        if (totalValorEl) {
            const soma = todosOsPedidos.reduce((acc, pedido) => {
                return acc + Number(
                    pedido.valor_total || pedido.total || 0
                );
            }, 0);

            totalValorEl.textContent = money.format(soma);
        }

        aplicarFiltros();

        console.log('Total de compras carregadas:', todosOsPedidos.length);
        console.log('Compras recebidas:', todosOsPedidos);

    } catch (err) {
        console.error('Erro ao carregar compras:', err);

        if (container) {
            container.innerHTML = `
                <div class="message"
                    style="padding:30px;text-align:center;">
                    <h3>Não foi possível carregar suas compras.</h3>
                    <p>Verifique sua conexão e tente novamente.</p>
                </div>
            `;
        }
    }
});
