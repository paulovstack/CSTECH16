
document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));

  const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const cartKey = 'cstech16_cart';

  let product;

  function readCart() {
    try {
      const data = JSON.parse(localStorage.getItem(cartKey) || '{}');
      return data && typeof data === 'object' && !Array.isArray(data)
        ? data
        : {};
    } catch {
      return {};
    }
  }

  function updateCount() {
    const cart = readCart();

    $('product-cart-count').textContent = String(
      Object.values(cart).reduce((n, v) => n + (Number(v) || 0), 0)
    );
  }

  updateCount();

  if (!id || !/^\d+$/.test(id)) {
    $('product-status').textContent =
      'Produto inválido. Volte à vitrine e selecione um produto.';
    return;
  }

  // =====================================================
  // AVALIAÇÕES
  // =====================================================

  function renderStars(nota) {
    const notaInteira = Math.round(Number(nota) || 0);

    return `
      <span class="review-stars" aria-label="${notaInteira} de 5 estrelas">
        ${'★'.repeat(notaInteira)}${'☆'.repeat(5 - notaInteira)}
      </span>
    `;
  }

  async function carregarAvaliacoes() {
    const section = $('product-reviews');

    section.hidden = false;

    try {
      const [resumo, avaliacoes] = await Promise.all([
        apiRequest(`/api/v1/avaliacoes/produto/${id}/resumo`),
        apiRequest(`/api/v1/avaliacoes/produto/${id}`)
      ]);

      $('reviews-average').textContent = Number(
        resumo.media_avaliacoes || 0
      ).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });

      $('reviews-average-stars').innerHTML =
        renderStars(resumo.media_avaliacoes);

      const quantidade = Number(resumo.quantidade_avaliacoes) || 0;

      $('reviews-count').textContent =
        quantidade === 1
          ? '1 avaliação'
          : `${quantidade} avaliações`;

      if (!avaliacoes.length) {
        $('reviews-list').innerHTML =
          '<p>Este produto ainda não possui avaliações.</p>';
      } else {
        $('reviews-list').innerHTML = avaliacoes.map(avaliacao => {
          const data = avaliacao.data_avaliacao
            ? new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-BR')
            : '';

          return `
            <article class="review-item">
              <div class="review-item-header">
                <strong>${esc(avaliacao.nome_cliente)}</strong>
                ${renderStars(avaliacao.nota)}
              </div>

              <p>${esc(avaliacao.comentario)}</p>

              <small>${esc(data)}</small>
            </article>
          `;
        }).join('');
      }

    } catch (err) {
      $('reviews-list').innerHTML =
        '<p>Não foi possível carregar as avaliações.</p>';

      console.error('Erro ao carregar avaliações:', err);
    }
  }

  async function prepararFormularioAvaliacao() {
    const token = typeof getToken === 'function' ? getToken() : null;

    if (!token) {
      return;
    }

    $('review-form-container').hidden = false;

    $('review-form').addEventListener('submit', async event => {
      event.preventDefault();

      const nota = Number($('review-rating').value);
      const comentario = $('review-comment').value.trim();
      const botao = $('review-submit');
      const feedback = $('review-feedback');

      if (!nota || nota < 1 || nota > 5) {
        feedback.textContent = 'Selecione uma nota entre 1 e 5.';
        return;
      }

      if (!comentario) {
        feedback.textContent = 'Escreva um comentário.';
        return;
      }

      botao.disabled = true;
      feedback.textContent = 'Enviando avaliação...';

      try {
        const resposta = await apiRequest('/api/v1/avaliacoes/', {
          method: 'POST',
          body: JSON.stringify({
            id_produto: Number(id),
            nota,
            comentario
          })
        });

        feedback.textContent =
          resposta.mensagem || 'Avaliação enviada com sucesso!';

        $('review-form').reset();

        await carregarAvaliacoes();

        $('review-form-container').hidden = true;

      } catch (err) {
        feedback.textContent =
          err.message || 'Não foi possível enviar sua avaliação.';
      } finally {
        botao.disabled = false;
      }
    });
  }

  // =====================================================
  // CARREGAMENTO DO PRODUTO
  // =====================================================

  try {
    product = await apiRequest(
      `/api/v1/produtos/${encodeURIComponent(id)}`
    );

    if (!product || typeof product !== 'object') {
      throw new Error('Resposta inválida da API.');
    }

    const stock = Math.max(0, Number(product.quantidade) || 0);
    const image = String(product.imagem_url || '').trim();

    const safeImage =
      image.startsWith('/static/') || /^https?:\/\//i.test(image)
        ? image
        : '';

    $('product-image').innerHTML = safeImage
      ? `<img src="${esc(safeImage)}" alt="${esc(product.nome || 'Produto')}"
          onerror="this.onerror=null;this.src='/static/img/notebook-air.png'">`
      : '<img src="/static/img/notebook-air.png" alt="Imagem ilustrativa">';

    $('product-name').textContent = product.nome || 'Produto';
    $('breadcrumb-product').textContent = product.nome || 'Produto';

    document.title = `${product.nome || 'Produto'} | CSTECH16`;

    $('product-brand').textContent = product.marca || 'Não informada';
    $('product-category').textContent = product.categoria || 'Tecnologia';
    $('product-price').textContent =
      money.format(Number(product.preco_venda) || 0);

    $('product-stock').textContent = stock
      ? `✓ Em estoque — ${stock} unidade(s) disponível(is)`
      : 'Produto esgotado';

    if (!stock) {
      $('product-stock').classList.add('out');
    }

    $('product-quantity').max = String(stock || 1);
    $('product-quantity').disabled = !stock;
    $('product-add').disabled = !stock;

    $('product-description').textContent =
      product.descricao ||
      'Descrição ainda não cadastrada para este produto.';

    let specs = product.especificacoes;

    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs);
      } catch {
        specs = null;
      }
    }

    if (
      specs &&
      typeof specs === 'object' &&
      !Array.isArray(specs) &&
      Object.keys(specs).length
    ) {
      $('product-specs').innerHTML = Object.entries(specs)
        .map(([key, value]) => `
          <div class="cs-spec-row">
            <span>${esc(key.replaceAll('_', ' '))}</span>
            <strong>${esc(value)}</strong>
          </div>
        `)
        .join('');
    } else {
      $('product-spec-section').hidden = true;
    }

    $('product-status').hidden = true;
    $('product-detail').hidden = false;
    $('product-extra').hidden = false;

    // Carrega as avaliações do produto.
    await carregarAvaliacoes();
    await prepararFormularioAvaliacao();

    // ===================================================
    // CARRINHO
    // ===================================================

    $('product-add').addEventListener('click', () => {
      const quantity = Number($('product-quantity').value);

      if (!Number.isInteger(quantity) || quantity < 1) {
        $('product-feedback').textContent =
          'Informe uma quantidade válida.';
        return;
      }

      const cart = readCart();
      const current = Number(cart[String(id)] || 0);

      if (quantity + current > stock) {
        $('product-feedback').textContent =
          `Estoque insuficiente. Você já possui ${current} unidade(s) no carrinho.`;
        return;
      }

      cart[String(id)] = current + quantity;

      try {
        localStorage.setItem(cartKey, JSON.stringify(cart));
        updateCount();

        $('product-feedback').textContent =
          'Produto adicionado! Abrindo o carrinho...';

        window.location.href = '/static/loja.html?cart=1&v=20261106-cs';

      } catch {
        $('product-feedback').textContent =
          'Não foi possível salvar o carrinho neste navegador.';
      }
    });

  } catch (err) {
    $('product-status').textContent =
      `Não foi possível carregar o produto: ${err.message || 'Erro de conexão'}`;
  }
});
