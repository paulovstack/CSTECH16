
document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // ELEMENTOS E CONFIGURAÇÕES
  // ==========================================

  const grid = document.getElementById('store-products');
  const cartModal = document.getElementById('cart-modal');
  const cartItems = document.getElementById('cart-items');
  const cartMessage = document.getElementById('cart-message');

  const loginLink = document.getElementById('store-login-link');
  const logoutButton = document.getElementById('store-logout');
  const accountLink = document.getElementById('store-account-link');
  const purchasesLink = document.getElementById('store-purchases-link');
  const dashboardLink = document.getElementById('voltar-dashboard');

  const search = document.getElementById('store-search');
  const category = document.getElementById('store-category');
  const brand = document.getElementById('store-brand');
  const sort = document.getElementById('store-sort');
  const count = document.getElementById('store-count');
  const message = document.getElementById('store-message');

  const modal = document.getElementById('store-modal');
  const modalContent = document.getElementById('store-modal-content');
  const checkoutButton = document.getElementById('cart-checkout');
  const cartButton = document.getElementById('store-cart-button');
  const cartCount = document.getElementById('store-cart-count');
  const cartTotal = document.getElementById('cart-total');
  const refreshButton = document.getElementById('store-refresh');

  let cart = {};
  let products = [];

  const reviewsSummary = new Map();

  const PENDING_CHECKOUT_KEY = 'cstech16_checkout_pendente';
  const LEGACY_PENDING_CHECKOUT_KEY = 'cslog16_checkout_pendente';

  let pendingCheckout = null;
  let paymentTimer = null;
  let isCatalogLoading = false;
  let detailsReturnFocus = null;
  let cartReturnFocus = null;

  try {
    cart = JSON.parse(localStorage.getItem('cstech16_cart') || '{}') || {};

    if (typeof cart !== 'object' || Array.isArray(cart)) {
      cart = {};
    }
  } catch {
    cart = {};
  }

  const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const esc = value =>
    String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const priceValue = p =>
    Number(p.preco_venda ?? p.preco ?? 0);

  const price = p => money.format(priceValue(p));

  const stock = p => Number(p.quantidade ?? 0);

  const productId = p => String(p.id_produto ?? p.id ?? '');

  const label = p =>
    String(p.categoria || 'Outros').trim() || 'Outros';

  const brandLabel = p =>
    String(p.marca || '').trim();

  const normalizeSearch = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

  // ==========================================
  // AVALIAÇÕES
  // ==========================================

  function formatarAvaliacao(media) {
    const nota = Number(media || 0);

    if (!Number.isFinite(nota) || nota <= 0) {
      return '☆☆☆☆☆';
    }

    const arredondada = Math.max(0, Math.min(5, Math.round(nota)));

    return '★'.repeat(arredondada) + '☆'.repeat(5 - arredondada);
  }

  async function carregarResumoAvaliacao(id) {
    const chave = String(id);

    if (!chave) {
      return { media: 0, quantidade: 0 };
    }

    if (reviewsSummary.has(chave)) {
      return reviewsSummary.get(chave);
    }

    try {
      const resumo = await requisicaoApi(
        `/api/v1/avaliacoes/produto/${encodeURIComponent(chave)}/resumo`
      );

      const resultado = {
        media: Number(resumo.media_avaliacoes || 0),
        quantidade: Number(resumo.quantidade_avaliacoes || 0)
      };

      reviewsSummary.set(chave, resultado);

      return resultado;

    } catch (erro) {
      console.warn(
        `Não foi possível carregar avaliações do produto ${chave}:`,
        erro
      );

      const resultado = {
        media: 0,
        quantidade: 0
      };

      reviewsSummary.set(chave, resultado);

      return resultado;
    }
  }

  async function carregarResumosAvaliacoes() {
    await Promise.all(
      products.map(p => carregarResumoAvaliacao(productId(p)))
    );
  }

  async function carregarComentariosAvaliacao(id) {
    try {
      const resposta = await requisicaoApi(
        `/api/v1/avaliacoes/produto/${encodeURIComponent(id)}`
      );

      return Array.isArray(resposta) ? resposta : [];

    } catch (erro) {
      console.error('Erro ao carregar comentários:', erro);
      return null;
    }
  }

  function htmlAvaliacao(id) {
    const avaliacao = reviewsSummary.get(String(id));
    const media = avaliacao?.media || 0;
    const quantidade = avaliacao?.quantidade || 0;

    if (quantidade > 0) {
      return `
        <div class="premium-rating">
          <span aria-label="${media.toFixed(1)} de 5 estrelas">
            ${formatarAvaliacao(media)}
          </span>

          <small>
            ${media.toFixed(1).replace('.', ',')}
            (${quantidade} avaliação${quantidade === 1 ? '' : 'ões'})
          </small>
        </div>
      `;
    }

    return `
      <div class="premium-rating">
        <span>☆☆☆☆☆</span>
        <small>Sem avaliações</small>
      </div>
    `;
  }

  function htmlComentariosAvaliacoes(avaliacoes) {
    if (avaliacoes === null) {
      return `
        <section class="store-reviews">
          <h3>Comentários dos clientes</h3>
          <p class="store-reviews-empty">
            Não foi possível carregar os comentários.
            Tente novamente.
          </p>
        </section>
      `;
    }

    if (!avaliacoes.length) {
      return `
        <section class="store-reviews">
          <h3>Comentários dos clientes</h3>
          <p class="store-reviews-empty">
            Este produto ainda não possui comentários.
          </p>
        </section>
      `;
    }

    return `
      <section class="store-reviews">
        <h3>Comentários dos clientes</h3>

        <div class="store-reviews-list">
          ${avaliacoes.map(avaliacao => {
            const nota = Math.max(
              0,
              Math.min(5, Number(avaliacao.nota || 0))
            );

            const data = avaliacao.data_avaliacao
              ? new Date(avaliacao.data_avaliacao)
                  .toLocaleDateString('pt-BR')
              : '';

            return `
              <article class="store-review">
                <div class="store-review-header">
                  <strong>
                    ${esc(avaliacao.nome_cliente || 'Cliente')}
                  </strong>

                  <span
                    class="store-review-stars"
                    aria-label="${nota} de 5 estrelas"
                  >
                    ${'★'.repeat(nota)}${'☆'.repeat(5 - nota)}
                  </span>
                </div>

                <p>${esc(avaliacao.comentario || '')}</p>

                ${data ? `<small>${esc(data)}</small>` : ''}
              </article>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  // ==========================================
  // AUTENTICAÇÃO
  // ==========================================

  function obterToken() {
    try {
      if (typeof window.getToken === 'function') {
        return window.getToken();
      }

      if (typeof getToken === 'function') {
        return getToken();
      }

      return localStorage.getItem('token') ||
             sessionStorage.getItem('token') ||
             localStorage.getItem('access_token') ||
             sessionStorage.getItem('access_token');

    } catch (erro) {
      console.error('Erro ao obter token:', erro);
      return null;
    }
  }

  async function requisicaoApi(url, options = {}) {
    if (typeof window.apiRequest === 'function') {
      return window.apiRequest(url, options);
    }

    if (typeof apiRequest === 'function') {
      return apiRequest(url, options);
    }

    const token = obterToken();

    const headers = {
      ...(options.headers || {})
    };

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    const resposta = await fetch(url, {
      ...options,
      headers
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      throw new Error(dados.detail || 'Erro ao consultar a API.');
    }

    return resposta.json();
  }

  function ocultarBotoesPrivados() {
    if (accountLink) accountLink.hidden = true;
    if (purchasesLink) purchasesLink.hidden = true;
    if (dashboardLink) dashboardLink.hidden = true;
  }

  async function configurarBotoesUsuario() {
    const token = obterToken();

    if (loginLink) loginLink.hidden = Boolean(token);
    if (logoutButton) logoutButton.hidden = !token;

    ocultarBotoesPrivados();

    if (!token) return;

    try {
      const resposta = await fetch('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!resposta.ok) {
        throw new Error('Não foi possível identificar o usuário.');
      }

      const usuario = await resposta.json();

      const perfil = String(usuario.perfil || '')
        .trim()
        .toLowerCase();

      console.log('Perfil identificado na loja:', perfil);

      if (perfil === 'cliente') {
        if (accountLink) accountLink.hidden = false;
        if (purchasesLink) purchasesLink.hidden = false;
      }

      if (['admin', 'funcionario'].includes(perfil)) {
        if (dashboardLink) dashboardLink.hidden = false;
      }

    } catch (erro) {
      console.error('Erro ao identificar o perfil:', erro);

      if (loginLink) loginLink.hidden = false;
      if (logoutButton) logoutButton.hidden = true;

      ocultarBotoesPrivados();
    }
  }

  // ==========================================
  // VISIBILIDADE DO CABEÇALHO
  // ==========================================

  if (!document.getElementById('store-header-visibility-fix')) {
    const style = document.createElement('style');

    style.id = 'store-header-visibility-fix';

    style.textContent = `
      .v4-head-actions [hidden] {
        display: none !important;
      }

      .v4-head-actions a:not([hidden]),
      .v4-head-actions button:not([hidden]) {
        visibility: visible;
      }
    `;

    document.head.appendChild(style);
  }

  configurarBotoesUsuario();

  // ==========================================
  // ESTILOS DO CHECKOUT E AVALIAÇÕES
  // ==========================================

  if (!document.getElementById('checkout-success-style')) {
    const style = document.createElement('style');

    style.id = 'checkout-success-style';

    style.textContent = `
      .checkout-success {
        text-align: center;
        padding: 30px 20px;
        width: 100%;
        box-sizing: border-box;
      }

      .checkout-success-icon {
        width: 76px;
        height: 76px;
        margin: 0 auto 20px;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 42px;
        font-weight: 700;
      }

      .checkout-success h2 {
        font-size: 25px;
        margin: 0 0 10px;
        color: var(--text-primary, #222);
      }

      .checkout-success > p {
        color: var(--text-secondary, #777);
        margin-bottom: 25px;
      }

      .checkout-success-details {
        max-width: 420px;
        margin: 0 auto 25px;
        padding: 18px;
        border: 1px solid var(--border-color, #ddd);
        border-radius: 12px;
        text-align: left;
      }

      .checkout-success-details div {
        display: flex;
        justify-content: space-between;
        gap: 15px;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-color, #eee);
      }

      .checkout-success-details div:last-child {
        border-bottom: none;
      }

      .checkout-success-details span {
        color: var(--text-secondary, #777);
      }

      .checkout-success-details strong {
        text-align: right;
      }

      .checkout-success .btn {
        margin-top: 5px;
      }

      .checkout-payment {
        padding: 25px 20px;
        text-align: center;
      }

      .checkout-payment h2 {
        margin-bottom: 8px;
      }

      .checkout-payment > p {
        color: var(--text-secondary, #777);
      }

      .checkout-payment-options {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin: 25px auto;
        max-width: 560px;
      }

      .checkout-payment-option {
        min-height: 100px;
        border: 1px solid var(--border-color, #ddd);
        border-radius: 12px;
        background: var(--card-bg, #fff);
        color: var(--text-primary, #222);
        cursor: pointer;
        padding: 15px 8px;
        font-size: 15px;
        font-weight: 600;
      }

      .checkout-payment-option:hover {
        border-color: var(--accent, #555);
        transform: translateY(-2px);
      }

      .checkout-payment-option:disabled {
        opacity: .55;
        cursor: not-allowed;
        transform: none;
      }

      .checkout-payment-option span {
        display: block;
        font-size: 25px;
        margin-bottom: 8px;
      }

      .checkout-payment-timer {
        margin: 20px auto;
        padding: 14px;
        max-width: 350px;
        border-radius: 10px;
        background: var(--surface-bg, #f3f4f6);
      }

      .checkout-payment-timer strong {
        display: block;
        font-size: 28px;
        margin-top: 5px;
      }

      .checkout-payment-warning {
        font-size: 13px;
        max-width: 480px;
        margin: 15px auto;
      }

      .store-reviews {
        margin-top: 30px;
        padding-top: 22px;
        border-top: 1px solid var(--border-color, #333);
      }

      .store-reviews h3 {
        margin-bottom: 18px;
        font-size: 19px;
      }

      .store-reviews-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .store-review {
        padding: 16px;
        border: 1px solid var(--border-color, #333);
        border-radius: 12px;
        background: var(--card-bg, #171b25);
      }

      .store-review-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .store-review-header strong {
        color: var(--text-primary, #fff);
      }

      .store-review-stars {
        color: #f5b942;
        letter-spacing: 2px;
      }

      .store-review p {
        margin: 12px 0;
        line-height: 1.6;
        color: var(--text-secondary, #bbb);
        overflow-wrap: anywhere;
      }

      .store-review small {
        color: var(--text-secondary, #888);
      }

      .store-reviews-empty {
        color: var(--text-secondary, #999);
        padding: 14px 0;
      }

      @media (max-width: 520px) {
        .checkout-payment-options {
          grid-template-columns: 1fr;
        }

        .checkout-payment-option {
          min-height: 70px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ==========================================
  // IMAGENS DOS PRODUTOS
  // ==========================================

  function imageUrl(p) {
    const value = String(p.imagem_url || p.imagem || '').trim();

    if (!value) return '';

    if (
      value.startsWith('/static/') ||
      /^https?:\/\//i.test(value)
    ) {
      return value;
    }

    return '';
  }

  function picture(p) {
    const src = imageUrl(p);
    const fallback = '/static/img/notebook-air.png';

    return `
      <img
        loading="lazy"
        src="${esc(src || fallback)}"
        alt="${esc(p.nome || 'Produto')}"
        onerror="this.onerror=null;this.src='${fallback}'"
      >
    `;
  }

  // ==========================================
  // CATÁLOGO
  // ==========================================

  function updateCategoryButtons() {
    document.querySelectorAll('#premium-category-list [data-category]').forEach(button => {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.category === category.value)
      );
    });
  }

  function render() {
    if (!grid || !search || !category || !sort || !count || isCatalogLoading) {
      return;
    }

    grid.setAttribute('aria-busy', 'false');

    const term = normalizeSearch(search.value);
    const selectedBrand = normalizeSearch(brand?.value || '');

    let list = products.filter(p =>
      (!category.value || label(p) === category.value) &&

      // FILTRO POR MARCA
      (!selectedBrand ||
        normalizeSearch(brandLabel(p)) === selectedBrand) &&

      (!term || [p.nome, p.marca, p.categoria].some(v =>
        normalizeSearch(v).includes(term)
      ))
    );

    if (sort.value === 'lowest') {
      list.sort((a, b) => priceValue(a) - priceValue(b));
    }

    if (sort.value === 'highest') {
      list.sort((a, b) => priceValue(b) - priceValue(a));
    }

    if (sort.value === 'name') {
      list.sort((a, b) =>
        String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
      );
    }

    count.textContent =
      `${list.length} produto${list.length === 1 ? '' : 's'}`;

    updateCategoryButtons();

    if (!list.length) {
      grid.innerHTML = `
        <div class="store-empty">
          Nenhum produto encontrado.
          Tente alterar a busca, categoria ou marca.
        </div>
      `;

      return;
    }

    grid.innerHTML = list.map(p => {
      const id = productId(p);

      return `
        <article class="store-card">
          <div class="store-card-image">
            ${picture(p)}

            <span class="store-stock ${stock(p) > 0 ? '' : 'store-stock-out'}">
              ${stock(p) > 0 ? 'Disponível' : 'Esgotado'}
            </span>
          </div>

          <div class="store-card-body">
            <span class="store-card-category">
              ${esc(label(p))}
            </span>

            <h3>${esc(p.nome || 'Produto')}</h3>

            <p class="store-card-brand">
              ${esc(p.marca || 'Marca não informada')}
            </p>

            ${htmlAvaliacao(id)}

            <div class="store-card-bottom">
              <strong>${price(p)}</strong>

              <button
                type="button"
                data-product="${esc(id)}"
              >
                Ver detalhes ↗
              </button>

              <button
                type="button"
                data-add="${esc(id)}"
                ${stock(p) <= 0 ? 'disabled' : ''}
              >
                + Carrinho
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function load() {
    if (!grid || !message || !count || !category || isCatalogLoading) {
      return;
    }

    isCatalogLoading = true;

    if (refreshButton) refreshButton.disabled = true;

    message.textContent = 'Carregando produtos...';
    count.textContent = 'Carregando...';

    grid.setAttribute('aria-busy', 'true');

    grid.innerHTML = Array.from({ length: 4 }, () => `
      <article class="store-skeleton-card" aria-hidden="true">
        <div class="store-skeleton-image"></div>
        <div class="store-skeleton-body">
          <span class="store-skeleton-line short"></span>
          <span class="store-skeleton-line"></span>
          <span class="store-skeleton-line medium"></span>
          <span class="store-skeleton-price"></span>
        </div>
      </article>
    `).join('');

    const categoryList = document.getElementById('premium-category-list');

    if (categoryList) {
      categoryList.setAttribute('aria-busy', 'true');

      categoryList.innerHTML = Array.from(
        { length: 4 },
        () => '<div class="premium-category-skeleton" aria-hidden="true"></div>'
      ).join('');
    }

    try {
      const data = await requisicaoApi('/api/v1/produtos/');

      products = Array.isArray(data)
        ? data
        : (data?.produtos || data?.items || []);

      const previous = category.value;
      const previousBrand = brand?.value || '';

      const categories = [
        ...new Set(products.map(label))
      ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

      category.replaceChildren(
        new Option('Todas as categorias', ''),
        ...categories.map(c => new Option(c, c))
      );

      if (categories.includes(previous)) {
        category.value = previous;
      }

      // ==========================================
      // FILTRO POR MARCA - CARREGAMENTO AUTOMÁTICO
      // ==========================================

      const uniqueBrands = new Map();

      products.forEach(p => {
        const marca = brandLabel(p);

        if (marca && !uniqueBrands.has(normalizeSearch(marca))) {
          uniqueBrands.set(normalizeSearch(marca), marca);
        }
      });

      const brands = [...uniqueBrands.values()]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

      if (brand) {
        brand.replaceChildren(
          new Option('Todas as marcas', ''),
          ...brands.map(m => new Option(m, m))
        );

        const marcaAnterior = brands.find(m =>
          normalizeSearch(m) === normalizeSearch(previousBrand)
        );

        if (marcaAnterior) {
          brand.value = marcaAnterior;
        }
      }

      // ==========================================
      // CATEGORIAS VISUAIS
      // ==========================================

      const categoryArea =
        document.getElementById('premium-category-list');

      if (categoryArea) {
        categoryArea.setAttribute('aria-busy', 'false');

        categoryArea.innerHTML = categories.length
          ? categories.map(c => `
              <button
                type="button"
                class="premium-category"
                data-category="${esc(c)}"
                aria-pressed="${category.value === c}"
              >
                <span class="premium-category-icon">
                  ${categoryIcon(c)}
                </span>

                <strong>${esc(c)}</strong>
                <small>Explorar produtos ↗</small>
              </button>
            `).join('')
          : '<p class="store-category-empty">As categorias aparecerão quando houver produtos cadastrados.</p>';
      }

      // Carrega as avaliações dos produtos
      await carregarResumosAvaliacoes();

      isCatalogLoading = false;
      message.textContent = '';

      grid.setAttribute('aria-busy', 'false');

      render();
      renderCart();

      const params = new URLSearchParams(location.search);

      if (params.has('checkout') || params.has('cart')) {
        openCart();

        if (params.has('checkout') && cartMessage) {
          cartMessage.textContent =
            'Login concluído. Confira seu carrinho para continuar.';
        }
      }

      await restaurarCheckoutPendente();

    } catch (err) {
      isCatalogLoading = false;

      grid.setAttribute('aria-busy', 'false');

      console.error('Erro ao carregar catálogo:', err);

      grid.innerHTML = `
        <div class="store-empty">
          Não foi possível carregar o catálogo agora.
        </div>
      `;

      const categoryArea =
        document.getElementById('premium-category-list');

      if (categoryArea) {
        categoryArea.setAttribute('aria-busy', 'false');

        categoryArea.innerHTML = `
          <p class="store-category-empty">
            As categorias aparecerão quando o catálogo estiver disponível.
          </p>
        `;
      }

      message.textContent = 'Tente atualizar a página em instantes.';
      count.textContent = '0 produtos';

    } finally {
      isCatalogLoading = false;

      if (refreshButton) {
        refreshButton.disabled = false;
      }
    }
  }

  // ==========================================
  // DETALHES DO PRODUTO
  // ==========================================

  function specsHtml(p) {
    let specs = p.especificacoes;

    try {
      if (typeof specs === 'string') {
        specs = JSON.parse(specs);
      }
    } catch {
      return '';
    }

    if (!specs || typeof specs !== 'object' || Array.isArray(specs)) {
      return '';
    }

    const rows = Object.entries(specs).map(([k, v]) => `
      <div class="cs-spec-row">
        <span>${esc(k.replaceAll('_', ' '))}</span>
        <strong>${esc(v)}</strong>
      </div>
    `).join('');

    return rows
      ? `<section class="cs-specifications">
           <h3>Ficha técnica</h3>
           ${rows}
         </section>`
      : '';
  }

  async function buscarDetalhesProduto(id) {
    try {
      const produto = await requisicaoApi(
        `/api/v1/produtos/${encodeURIComponent(id)}`
      );

      if (!produto || typeof produto !== 'object') {
        throw new Error('Resposta inválida ao consultar produto.');
      }

      const index = products.findIndex(p => productId(p) === String(id));

      if (index >= 0) {
        products[index] = produto;
      }

      await carregarResumoAvaliacao(id);

      const comentarios = await carregarComentariosAvaliacao(id);

      openDetails(produto, comentarios);

    } catch (erro) {
      console.error('Erro ao buscar produto:', erro);

      const produtoLocal = products.find(p => productId(p) === String(id));

      if (produtoLocal) {
        const comentarios = await carregarComentariosAvaliacao(id);
        openDetails(produtoLocal, comentarios);

      } else if (message) {
        message.textContent =
          erro.message || 'Não foi possível carregar os detalhes do produto.';
      }
    }
  }

  function openDetails(p, comentarios = []) {
    if (!modal || !modalContent) return;

    const quantidadeEmEstoque = stock(p);

    modalContent.innerHTML = `
      <div class="store-detail-image">
        ${picture(p)}
      </div>

      <div class="store-detail-body">
        <span class="premium-detail-overline">
          DETALHES DO PRODUTO
        </span>

        <span class="store-card-category">
          ${esc(label(p))}
        </span>

        <h2 id="store-modal-title">
          ${esc(p.nome || 'Produto')}
        </h2>

        <p>
          Marca:
          <strong>${esc(p.marca || 'Não informada')}</strong>
        </p>

        <p class="premium-detail-description" id="store-modal-description">
          ${esc(p.descricao || 'Conheça os detalhes deste produto e adicione-o ao seu carrinho.')}
        </p>

        ${htmlAvaliacao(productId(p))}

        <p class="store-detail-stock ${quantidadeEmEstoque > 0 ? 'available' : 'out'}" role="status">
          <span class="stock-indicator" aria-hidden="true"></span>
          <strong>${quantidadeEmEstoque > 0
            ? `${quantidadeEmEstoque} ${quantidadeEmEstoque === 1 ? 'unidade disponível' : 'unidades disponíveis'}`
            : 'Produto esgotado'}</strong>
        </p>

        <div class="store-detail-price">
          ${price(p)}
        </div>

        ${specsHtml(p)}

        <button
          type="button"
          class="btn primary"
          data-add="${esc(productId(p))}"
          ${stock(p) <= 0 ? 'disabled' : ''}
        >
          ${quantidadeEmEstoque > 0 ? 'Adicionar ao carrinho' : 'Produto indisponível'}
        </button>

        ${htmlComentariosAvaliacoes(comentarios)}
      </div>
    `;

    detailsReturnFocus = detailsReturnFocus || document.activeElement;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    modal.querySelector('.store-modal-close')?.focus();
  }

  function closeDetails() {
    if (!modal) return;

    modal.hidden = true;

    document.body.style.overflow =
      cartModal && !cartModal.hidden ? 'hidden' : '';

    const returnFocus = detailsReturnFocus;
    detailsReturnFocus = null;

    returnFocus?.focus?.();
  }

  // ==========================================
  // CONTROLE DO PAGAMENTO
  // ==========================================

  function salvarCheckoutPendente(dados) {
    pendingCheckout = {
      compra_id: dados.compra_id ?? dados.id_compra ?? dados.id,
      valor_total: Number(dados.valor_total ?? dados.total ?? 0),
      segundos_restantes: Number(dados.segundos_restantes ?? 60),
      iniciado_em: Date.now()
    };

    localStorage.setItem(
      PENDING_CHECKOUT_KEY,
      JSON.stringify(pendingCheckout)
    );
  }

  function limparCheckoutPendente() {
    if (paymentTimer) {
      clearInterval(paymentTimer);
      paymentTimer = null;
    }

    pendingCheckout = null;

    localStorage.removeItem(PENDING_CHECKOUT_KEY);
    localStorage.removeItem(LEGACY_PENDING_CHECKOUT_KEY);
  }

  function formatarTempo(segundos) {
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = segundos % 60;

    return `${String(minutos).padStart(2, '0')}:${String(segundosRestantes).padStart(2, '0')}`;
  }

  function mostrarPagamento(dados) {
    salvarCheckoutPendente(dados);

    if (!cartModal || !cartItems) return;

    checkoutButton.hidden = true;

    const compraId = pendingCheckout.compra_id;
    const valorTotal = pendingCheckout.valor_total;

    cartItems.innerHTML = `
      <div class="checkout-payment">
        <h2>Escolha a forma de pagamento</h2>

        <p>
          Pedido <strong>#${esc(compraId)}</strong>
        </p>

        <p>
          Total:
          <strong>${money.format(valorTotal)}</strong>
        </p>

        <div class="checkout-payment-timer">
          Tempo restante para pagamento
          <strong id="checkout-countdown" role="timer" aria-live="off">01:00</strong>
        </div>

        <div class="checkout-payment-options">
          <button
            type="button"
            class="checkout-payment-option"
            data-payment-method="pix"
          >
            <span>▦</span>
            Pix
          </button>

          <button
            type="button"
            class="checkout-payment-option"
            data-payment-method="cartao"
          >
            <span>▣</span>
            Cartão
          </button>

          <button
            type="button"
            class="checkout-payment-option"
            data-payment-method="boleto"
          >
            <span>▤</span>
            Boleto
          </button>
        </div>

        <p class="checkout-payment-warning">
          Esta é uma simulação de pagamento para fins de demonstração.
          Nenhuma cobrança real será realizada.
        </p>
      </div>
    `;

    if (cartTotal) {
      cartTotal.textContent = money.format(valorTotal);
    }

    if (cartMessage) {
      cartMessage.textContent =
        'Seu pedido está reservado. Escolha uma forma de pagamento.';
    }

    iniciarContadorPagamento();
  }

  function iniciarContadorPagamento() {
    if (paymentTimer) {
      clearInterval(paymentTimer);
      paymentTimer = null;
    }

    if (!pendingCheckout) return;

    const countdown = document.getElementById('checkout-countdown');

    const atualizar = async () => {
      if (!pendingCheckout) return;

      const decorrido = Math.floor(
        (Date.now() - pendingCheckout.iniciado_em) / 1000
      );

      const restante = Math.max(
        0,
        pendingCheckout.segundos_restantes - decorrido
      );

      if (countdown) {
        countdown.textContent = formatarTempo(restante);
      }

      if (restante <= 0) {
        if (paymentTimer) {
          clearInterval(paymentTimer);
          paymentTimer = null;
        }

        await atualizarStatusPagamento();
      }
    };

    atualizar();

    paymentTimer = setInterval(atualizar, 1000);
  }

  async function confirmarPagamento(formaPagamento, botao) {
    if (!pendingCheckout) return;

    const token = obterToken();

    if (!token) {
      if (cartMessage) {
        cartMessage.textContent = 'Sua sessão expirou. Faça login novamente.';
      }

      return;
    }

    const botoes = cartItems.querySelectorAll('[data-payment-method]');

    botoes.forEach(item => {
      item.disabled = true;
    });

    if (botao) {
      botao.textContent = 'Confirmando...';
    }

    try {
      const compraId = pendingCheckout.compra_id;

      const resposta = await fetch(
        `/api/v1/compras/${encodeURIComponent(compraId)}/pagamento`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            forma_pagamento: formaPagamento
          })
        }
      );

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        if (resposta.status === 401) {
          throw new Error('Sua sessão expirou. Faça login novamente.');
        }

        if (resposta.status === 410 || resposta.status === 409) {
          await atualizarStatusPagamento();
          return;
        }

        throw new Error(
          dados.detail || 'Não foi possível confirmar o pagamento.'
        );
      }

      mostrarCompraConcluida({
        ...dados,
        compra_id: compraId,
        valor_total: dados.valor_total ?? pendingCheckout.valor_total,
        forma_pagamento: formaPagamento
      });

    } catch (erro) {
      console.error('Erro ao confirmar pagamento:', erro);

      if (cartMessage) {
        cartMessage.textContent =
          erro.message || 'Erro ao confirmar pagamento.';
      }

      if (pendingCheckout) {
        botoes.forEach(item => {
          item.disabled = false;

          item.textContent = item.dataset.paymentMethod === 'pix'
            ? '▦ Pix'
            : item.dataset.paymentMethod === 'cartao'
              ? '▣ Cartão'
              : '▤ Boleto';
        });
      }
    }
  }

  async function atualizarStatusPagamento() {
    if (!pendingCheckout) return;

    const token = obterToken();

    if (!token) return;

    try {
      const compraId = pendingCheckout.compra_id;

      const resposta = await fetch(
        `/api/v1/compras/${encodeURIComponent(compraId)}/status`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível consultar o pedido.'
        );
      }

      const status = String(dados.status || '').toUpperCase();

      if (status === 'CONCLUIDA') {
        mostrarCompraConcluida({
          ...dados,
          compra_id: compraId,
          valor_total: dados.valor_total ?? pendingCheckout.valor_total
        });

        return;
      }

      if (status === 'CANCELADA') {
        mostrarCompraCancelada({
          ...dados,
          compra_id: compraId
        });

        return;
      }

      if (status === 'EM_PROCESSAMENTO') {
        if (Number(dados.segundos_restantes) > 0) {
          pendingCheckout.segundos_restantes =
            Number(dados.segundos_restantes);

          pendingCheckout.iniciado_em = Date.now();

          localStorage.setItem(
            PENDING_CHECKOUT_KEY,
            JSON.stringify(pendingCheckout)
          );

          iniciarContadorPagamento();
        }
      }

    } catch (erro) {
      console.error('Erro ao consultar status:', erro);

      if (cartMessage) {
        cartMessage.textContent =
          'Não foi possível atualizar o status do pedido. Tentaremos novamente.';
      }

      if (pendingCheckout && !paymentTimer) {
        paymentTimer = setInterval(() => {
          atualizarStatusPagamento();
        }, 5000);
      }
    }
  }

  function mostrarCompraConcluida(dados) {
    const valorTotal = Number(
      dados.valor_total ?? pendingCheckout?.valor_total ?? 0
    );

    const compraId =
      dados.compra_id ?? dados.id_compra ?? pendingCheckout?.compra_id;

    const formaPagamento = String(
      dados.forma_pagamento || 'Não informada'
    ).toUpperCase();

    limparCheckoutPendente();

    if (cartItems) {
      cartItems.innerHTML = `
        <div class="checkout-success">
          <div class="checkout-success-icon" aria-hidden="true">✓</div>

          <h2 id="checkout-success-title">
            Pagamento aprovado!
          </h2>

          <p>
            Seu pedido foi confirmado com sucesso.
          </p>

          <div class="checkout-success-details">
            <div>
              <span>Número do pedido</span>
              <strong>#${esc(compraId)}</strong>
            </div>

            <div>
              <span>Valor total</span>
              <strong>${money.format(valorTotal)}</strong>
            </div>

            <div>
              <span>Forma de pagamento</span>
              <strong>${esc(formaPagamento)}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>Concluída</strong>
            </div>
          </div>

          <button
            type="button"
            class="btn primary"
            data-close-cart
          >
            Continuar comprando
          </button>
        </div>
      `;
    }

    if (cartTotal) {
      cartTotal.textContent = money.format(valorTotal);
    }

    if (cartMessage) {
      cartMessage.textContent = '';
    }

    if (checkoutButton) {
      checkoutButton.hidden = true;
    }
  }

  function mostrarCompraCancelada(dados) {
    const compraId =
      dados.compra_id ?? pendingCheckout?.compra_id;

    limparCheckoutPendente();

    if (cartItems) {
      cartItems.innerHTML = `
        <div class="checkout-success">
          <div
            class="checkout-success-icon"
            aria-hidden="true"
            style="background:#fee2e2;color:#b91c1c;"
          >
            !
          </div>

          <h2>Pedido cancelado</h2>

          <p>
            O prazo de 60 segundos terminou sem a confirmação do pagamento.
          </p>

          <div class="checkout-success-details">
            <div>
              <span>Número do pedido</span>
              <strong>#${esc(compraId)}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>Cancelada</strong>
            </div>

            <div>
              <span>Estoque</span>
              <strong>Devolvido</strong>
            </div>
          </div>

          <button
            type="button"
            class="btn primary"
            data-close-cart
          >
            Voltar à loja
          </button>
        </div>
      `;
    }

    if (cartMessage) {
      cartMessage.textContent = '';
    }

    if (checkoutButton) {
      checkoutButton.hidden = true;
    }
  }

  async function restaurarCheckoutPendente() {
    let salvo = null;

    try {
      const atual = localStorage.getItem(PENDING_CHECKOUT_KEY);
      const legado = localStorage.getItem(LEGACY_PENDING_CHECKOUT_KEY);
      const valorSalvo = atual || legado;

      salvo = JSON.parse(valorSalvo || 'null');

      if (!atual && legado) {
        localStorage.setItem(PENDING_CHECKOUT_KEY, legado);
      }

      if (legado) {
        localStorage.removeItem(LEGACY_PENDING_CHECKOUT_KEY);
      }

    } catch {
      localStorage.removeItem(PENDING_CHECKOUT_KEY);
      localStorage.removeItem(LEGACY_PENDING_CHECKOUT_KEY);
    }

    if (!salvo || !salvo.compra_id) return;

    pendingCheckout = salvo;

    const token = obterToken();

    if (!token) return;

    const decorrido = Math.floor(
      (Date.now() - Number(salvo.iniciado_em || Date.now())) / 1000
    );

    const restante = Math.max(
      0,
      Number(salvo.segundos_restantes ?? 60) - decorrido
    );

    pendingCheckout.segundos_restantes = restante;
    pendingCheckout.iniciado_em = Date.now();

    openCart();

    await atualizarStatusPagamento();

    if (pendingCheckout) {
      mostrarPagamento(pendingCheckout);
    }
  }

  // ==========================================
  // CARRINHO
  // ==========================================

  function saveCart() {
    localStorage.setItem('cstech16_cart', JSON.stringify(cart));
    renderCart();
  }

  function addItem(id) {
    const p = products.find(x => productId(x) === String(id));

    if (!p || stock(p) <= 0) return;

    const key = String(id);
    const quantity = Number(cart[key] || 0);

    if (quantity >= stock(p)) {
      alert('Quantidade máxima disponível em estoque.');
      return;
    }

    cart[key] = quantity + 1;
    saveCart();

    if (modal && !modal.hidden) {
      closeDetails();
    }

    openCart();
  }

  function renderCart() {
    if (!cartItems || !cartCount || !cartTotal || !checkoutButton) return;

    const entries = Object.entries(cart).filter(([id, q]) =>
      Number(q) > 0 &&
      products.some(p => productId(p) === id)
    );

    const totalQuantity = entries.reduce(
      (sum, [, q]) => sum + Number(q),
      0
    );

    cartCount.textContent = String(totalQuantity);

    cartButton?.setAttribute(
      'aria-label',
      `Abrir carrinho, ${totalQuantity} ${totalQuantity === 1 ? 'item' : 'itens'}`
    );

    cartItems.innerHTML = entries.length
      ? entries.map(([id, q]) => {
          const p = products.find(p => productId(p) === id);
          const imagem = imageUrl(p) || '/static/img/notebook-air.png';
          const subtotal = money.format(priceValue(p) * Number(q));

          return `
            <article class="cart-row">
              <img
                class="cart-row-image"
                src="${esc(imagem)}"
                alt=""
                aria-hidden="true"
              />

              <div class="cart-row-details">
                <strong>${esc(p.nome)}</strong>
                <small>${price(p)} por unidade</small>
                <span class="cart-row-subtotal">
                  Subtotal: ${subtotal}
                </span>
              </div>

              <div class="cart-controls" role="group" aria-label="Quantidade de ${esc(p.nome)}">
                <button
                  type="button"
                  data-minus="${esc(id)}"
                  aria-label="Diminuir quantidade de ${esc(p.nome)}"
                >−</button>

                <span aria-label="${q} unidades">${q}</span>

                <button
                  type="button"
                  data-plus="${esc(id)}"
                  aria-label="Aumentar quantidade de ${esc(p.nome)}"
                >+</button>

                <button
                  type="button"
                  data-remove="${esc(id)}"
                  aria-label="Remover ${esc(p.nome)} do carrinho"
                >
                  Remover
                </button>
              </div>
            </article>
          `;
        }).join('')
      : `
          <div class="cart-empty" role="status">
            <span class="cart-empty-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22 8H6"></path>
                <circle cx="10" cy="21" r="1"></circle>
                <circle cx="19" cy="21" r="1"></circle>
              </svg>
            </span>

            <strong>Seu carrinho está vazio</strong>

            <p>
              Explore o catálogo e encontre algo para o seu dia a dia.
            </p>

            <a href="#catalogo" data-close-cart>Explorar produtos</a>
          </div>
        `;

    const total = entries.reduce((sum, [id, q]) => {
      const p = products.find(p => productId(p) === id);
      return sum + priceValue(p) * Number(q);
    }, 0);

    cartTotal.textContent = money.format(total);
    checkoutButton.disabled = !entries.length;
  }

  function openCart() {
    if (!cartModal || !checkoutButton) return;

    cartReturnFocus = document.activeElement === document.body
      ? cartButton
      : document.activeElement;

    renderCart();

    checkoutButton.hidden = false;

    if (cartMessage) {
      cartMessage.textContent = '';
    }

    cartModal.hidden = false;

    cartButton?.setAttribute('aria-expanded', 'true');

    document.body.style.overflow = 'hidden';

    cartModal.querySelector('.store-modal-close')?.focus();
  }

  function closeCart() {
    if (!cartModal) return;

    cartModal.hidden = true;

    cartButton?.setAttribute('aria-expanded', 'false');

    document.body.style.overflow =
      modal && !modal.hidden ? 'hidden' : '';

    const returnFocus = cartReturnFocus || cartButton;
    cartReturnFocus = null;

    returnFocus?.focus?.();
  }

  function handleAdd(e) {
    const b = e.target.closest('[data-add]');

    if (b) {
      addItem(b.dataset.add);
    }
  }

  // ==========================================
  // EVENTOS DO CATÁLOGO
  // ==========================================

  if (grid) {
    grid.addEventListener('click', event => {
      if (event.target.closest('[data-add]')) {
        return handleAdd(event);
      }

      const button = event.target.closest('[data-product]');
      const card = event.target.closest('.store-card');

      if (!button && !card) return;

      const productTrigger =
        button || card?.querySelector('[data-product]');

      const id = productTrigger?.dataset.product;

      if (id) {
        detailsReturnFocus = productTrigger;
        buscarDetalhesProduto(id);
      }
    });
  }

  if (modalContent) {
    modalContent.addEventListener('click', handleAdd);
  }

  // ==========================================
  // CATEGORIAS
  // ==========================================

  const categoryArea =
    document.getElementById('premium-category-list');

  function selectCategory(value) {
    if (!category) return;

    if (!Array.from(category.options).some(option => option.value === value)) {
      category.add(new Option(value, value));
    }

    category.value = value;

    render();

    document.getElementById('catalogo')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  if (categoryArea) {
    categoryArea.addEventListener('click', event => {
      const button = event.target.closest('[data-category]');

      if (button) {
        selectCategory(button.dataset.category);
      }
    });
  }

  const departmentArea = document.querySelector('.v4-departments');

  if (departmentArea) {
    departmentArea.addEventListener('click', event => {
      const link = event.target.closest('[data-filter-category]');

      if (!link) return;

      event.preventDefault();

      selectCategory(link.dataset.filterCategory);
    });
  }

  // ==========================================
  // EVENTOS DO CARRINHO
  // ==========================================

  if (cartButton) {
    cartButton.addEventListener('click', openCart);
  }

  if (cartModal) {
    cartModal.addEventListener('click', e => {
      if (e.target.closest('[data-close-cart]')) {
        closeCart();
        return;
      }

      const b = e.target.closest(
        '[data-plus], [data-minus], [data-remove]'
      );

      if (!b) return;

      const id =
        b.dataset.plus ??
        b.dataset.minus ??
        b.dataset.remove;

      const p = products.find(p => productId(p) === id);

      if (!p) return;

      if (b.hasAttribute('data-remove')) {
        delete cart[id];

      } else if (b.hasAttribute('data-minus')) {
        cart[id]--;

        if (cart[id] <= 0) {
          delete cart[id];
        }

      } else if (Number(cart[id] || 0) < stock(p)) {
        cart[id]++;

      } else {
        if (cartMessage) {
          cartMessage.textContent = 'Quantidade máxima em estoque.';
        }

        return;
      }

      if (cartMessage) {
        cartMessage.textContent = '';
      }

      saveCart();
    });
  }

  // ==========================================
  // FINALIZAÇÃO DA COMPRA
  // ==========================================

  if (checkoutButton) {
    checkoutButton.addEventListener('click', async () => {
      const token = obterToken();

      if (!token) {
        sessionStorage.setItem(
          'cstech16_after_login',
          '/static/loja.html?checkout=1'
        );

        window.location.href = '/static/index.html?v=20261106-cs';
        return;
      }

      const itens = Object.entries(cart)
        .filter(([id, quantidade]) =>
          /^\d+$/.test(id) &&
          Number.isInteger(Number(quantidade)) &&
          Number(quantidade) > 0
        )
        .map(([id, quantidade]) => ({
          produto_id: Number(id),
          quantidade: Number(quantidade)
        }));

      if (!itens.length) {
        if (cartMessage) {
          cartMessage.textContent = 'Seu carrinho está vazio.';
        }

        return;
      }

      checkoutButton.disabled = true;
      checkoutButton.textContent = 'Processando compra...';

      if (cartMessage) {
        cartMessage.textContent =
          'Aguarde, estamos registrando seu pedido.';
      }

      try {
        const resposta = await fetch('/api/v1/compras/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ itens })
        });

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
          if (resposta.status === 401) {
            sessionStorage.setItem(
              'cstech16_after_login',
              '/static/loja.html?checkout=1'
            );

            window.location.href = '/static/index.html?v=20261106-cs';
            return;
          }

          throw new Error(
            dados.detail || 'Não foi possível iniciar a compra.'
          );
        }

        cart = {};

        localStorage.removeItem('cstech16_cart');

        renderCart();

        mostrarPagamento(dados);

      } catch (erro) {
        if (cartMessage) {
          cartMessage.textContent =
            erro.message || 'Erro de conexão ao iniciar a compra.';
        }

      } finally {
        if (!checkoutButton.hidden) {
          checkoutButton.disabled = Object.keys(cart).length === 0;
          checkoutButton.textContent = 'Finalizar compra';
        }
      }
    });
  }

  if (cartModal) {
    cartModal.addEventListener('click', event => {
      const botaoPagamento =
        event.target.closest('[data-payment-method]');

      if (!botaoPagamento) return;

      confirmarPagamento(
        botaoPagamento.dataset.paymentMethod,
        botaoPagamento
      );
    });
  }

  // ==========================================
  // EVENTOS DOS MODAIS
  // ==========================================

  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target.closest('[data-close-modal]')) {
        closeDetails();
      }
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (cartModal && !cartModal.hidden) {
        closeCart();
      } else if (modal && !modal.hidden) {
        closeDetails();
      }

      return;
    }

    if (event.key !== 'Tab') return;

    const activeModal = cartModal && !cartModal.hidden
      ? cartModal
      : modal && !modal.hidden
        ? modal
        : null;

    const dialog = activeModal?.querySelector('[role="dialog]');

    if (!dialog) return;

    const focusable = Array.from(dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element =>
      !element.hidden && element.getClientRects().length > 0
    );

    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();

    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();

    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // ==========================================
  // BUSCAS E FILTROS
  // ==========================================

  if (search) {
    search.addEventListener('input', render);
  }

  if (category) {
    category.addEventListener('change', render);
  }

  // NOVO: EVENTO DO FILTRO DE MARCA
  if (brand) {
    brand.addEventListener('change', render);
  }

  if (sort) {
    sort.addEventListener('change', render);
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      reviewsSummary.clear();
      load();
    });
  }

  // Busca do cabeçalho integrada à busca do catálogo.
  const headerSearch = document.getElementById('v4-search');
  const headerSearchButton = document.getElementById('v4-search-btn');

  function executarBuscaCabecalho() {
    if (!headerSearch || !search) return;

    search.value = headerSearch.value;

    render();

    document.getElementById('catalogo')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  if (headerSearch) {
    headerSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        executarBuscaCabecalho();
      }
    });
  }

  if (headerSearchButton) {
    headerSearchButton.addEventListener('click', executarBuscaCabecalho);
  }

  // ==========================================
  // INICIALIZAÇÃO
  // ==========================================

  renderCart();
  load();
});

// ==========================================
// ÍCONES DAS CATEGORIAS
// ==========================================

function categoryIcon(name) {
  const n = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const P = {
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2.5 19h19l-1.5-4H4z"/>',
    audio: '<path d="M4 15v-3a8 8 0 0116 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4"/>',
    hdd: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 14h.01M11 14h6M7 10h10"/>',
    board: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="5" height="5" rx="1"/><path d="M16 8v8M8 16h5"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    bolt: '<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    bag: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
    ram: '<rect x="2.5" y="7" width="19" height="9" rx="1.5"/><path d="M6 16v3M10 16v3M14 16v3M18 16v3M6 10.5h2M11 10.5h2M16 10.5h2"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    mouse: '<rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 3v6"/>',
    gpu: '<rect x="2.5" y="7" width="19" height="10" rx="2"/><circle cx="9" cy="12" r="2.8"/><circle cx="16" cy="12" r="2.2"/><path d="M5 17v2.5"/>',
    wifi: '<path d="M2.5 9a14 14 0 0119 0M5.5 12.5a9.5 9.5 0 0113 0M8.7 16a5 5 0 016.6 0"/><circle cx="12" cy="19.2" r=".9"/>',
    watch: '<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6l.6-3h4.8L15 6M9 18l.6 3h4.8l.6-3M12 10v2l1.5 1"/>',
    game: '<path d="M7 8h10a4.5 4.5 0 014.4 5.4l-.7 3.3a2.4 2.4 0 01-4 1.2L14.5 16h-5l-2.2 1.9a2.4 2.4 0 01-4-1.2l-.7-3.3A4.5 4.5 0 017 8z"/><path d="M8 11v3M6.5 12.5h3M15.5 11.8h.01M17.5 13.2h.01"/>',
    box: '<path d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>'
  };

  const rules = [
    [/smartphone|celular|telefone/, 'phone'],
    [/notebook|laptop/, 'laptop'],
    [/audio|fone|som\b|caixa/, 'audio'],
    [/acessor/, 'plug'],
    [/armazen|ssd|\bhd\b|disco/, 'hdd'],
    [/process|cpu/, 'cpu'],
    [/componente|placa.?mae/, 'board'],
    [/energia|bateria|carreg|fonte/, 'bolt'],
    [/escritorio/, 'bag'],
    [/impress/, 'printer'],
    [/memoria|\bram\b/, 'ram'],
    [/monitor|tela/, 'monitor'],
    [/periferic|mouse|teclado/, 'mouse'],
    [/placa|gpu|video/, 'gpu'],
    [/rede|wifi|roteador/, 'wifi'],
    [/wearable|watch|relogio/, 'watch'],
    [/game|jogo|console/, 'game']
  ];

  const hit = rules.find(([re]) => re.test(n));

  return `<svg viewBox="0 0 24 24" aria-hidden="true">${P[hit ? hit[1] : 'box']}</svg>`;
}
