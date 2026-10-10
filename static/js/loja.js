document.addEventListener('DOMContentLoaded', () => {
  // Catálogo público: autenticação exigida apenas ao tentar finalizar.
  const grid = document.getElementById('store-products');
  const cartModal = document.getElementById('cart-modal');
  const cartItems = document.getElementById('cart-items');
  const cartMessage = document.getElementById('cart-message');
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem('cstech16_cart') || '{}') || {}; } catch { cart = {}; }
  const loginLink = document.getElementById('store-login-link');
  const logoutButton = document.getElementById('store-logout');
  loginLink.hidden = Boolean(getToken());
  const accountLink = document.getElementById("store-account-link");
  accountLink.hidden = true;
  logoutButton.hidden = !getToken();
  // Exibe o retorno ao painel somente para equipe autenticada.
  async function configurarVoltarDashboard() {
    const botao = document.getElementById('voltar-dashboard');
    const token = getToken();
    if (!botao || !token) return;
    try {
      const resposta = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resposta.ok) return;
      const usuario = await resposta.json();
      const perfil = String(usuario.perfil || '').toLowerCase();
      accountLink.hidden = perfil !== 'cliente';
      botao.hidden = !['admin', 'funcionario'].includes(perfil);
    } catch (erro) {
      console.error('Não foi possível verificar o perfil:', erro);
    }
  }
  configurarVoltarDashboard();
  const search = document.getElementById('store-search');
  const category = document.getElementById('store-category');
  const sort = document.getElementById('store-sort');
  const count = document.getElementById('store-count');
  const message = document.getElementById('store-message');
  const modal = document.getElementById('store-modal');
  const modalContent = document.getElementById('store-modal-content');
  let products = [];
  const money = new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'});
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const price = p => money.format(Number(p.preco_venda ?? p.preco ?? 0));
  const stock = p => Number(p.quantidade ?? 0);
  const label = p => String(p.categoria || 'Outros').trim() || 'Outros';
  // Aceita imagens hospedadas em http(s) ou arquivos locais na pasta /static/.
  function imageUrl(p) {
    const value = String(p.imagem_url || p.imagem || '').trim();
    if (!value) return '';
    if (value.startsWith('/static/') || /^https?:\/\//i.test(value)) return value;
    return '';
  }
  const placeholder = '<div class="store-no-image"><span>▣</span><small>CSTECH16</small></div>';
  function picture(p) {
    const src = imageUrl(p);
    return src ? `<img loading="lazy" src="${esc(src)}" alt="${esc(p.nome || 'Produto')}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'store-no-image',textContent:'Imagem indisponível'}))">` : placeholder;
  }
  function render() {
    const term = search.value.trim().toLocaleLowerCase('pt-BR');
    let list = products.filter(p => (!category.value || label(p) === category.value) && (!term || [p.nome,p.marca,p.categoria].some(v => String(v||'').toLocaleLowerCase('pt-BR').includes(term))));
    if (sort.value === 'lowest') list.sort((a,b)=>Number(a.preco_venda||0)-Number(b.preco_venda||0));
    if (sort.value === 'highest') list.sort((a,b)=>Number(b.preco_venda||0)-Number(a.preco_venda||0));
    if (sort.value === 'name') list.sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
    count.textContent = `${list.length} produto${list.length === 1 ? '' : 's'}`;
    if (!list.length) { grid.innerHTML='<div class="store-empty">Nenhum produto encontrado. Tente outra busca ou categoria.</div>'; return; }
    grid.innerHTML = list.map(p => `<article class="store-card"><div class="store-card-image">${picture(p)}<span class="store-stock ${stock(p)>0?'':'store-stock-out'}">${stock(p)>0?'Disponível':'Esgotado'}</span></div><div class="store-card-body"><span class="store-card-category">${esc(label(p))}</span><h3>${esc(p.nome || 'Produto')}</h3><p class="store-card-brand">${esc(p.marca || 'Marca não informada')}</p><div class="store-card-bottom"><strong>${price(p)}</strong><button type="button" data-product="${esc(p.id_produto ?? p.id ?? '')}">Ver detalhes ↗</button><button type="button" data-add="${esc(p.id_produto ?? p.id ?? '')}" ${stock(p) <= 0 ? 'disabled' : ''}>+ Carrinho</button></div></div></article>`).join('');
  }
  async function load() {
    message.textContent=''; grid.innerHTML='<div class="store-loading">Carregando produtos...</div>';
    try {
      const data = await apiRequest('/api/v1/produtos/');
      products = Array.isArray(data) ? data : (data?.produtos || data?.items || []);
      const previous = category.value;
      const categories = [...new Set(products.map(label))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
      category.replaceChildren(new Option('Todas as categorias',''),...categories.map(c=>new Option(c,c)));
      if (categories.includes(previous)) category.value=previous;
      render();
      renderCart();
      if(new URLSearchParams(location.search).has('checkout')){openCart();cartMessage.textContent='Login concluído. Confira seu carrinho para continuar.';}
    } catch (err) { grid.innerHTML='<div class="store-empty">Não foi possível carregar o catálogo.</div>'; message.textContent=err.message || 'Erro ao consultar API.'; count.textContent='0 produtos'; }
  }
  function openDetails(p) {
    modalContent.innerHTML = `<div class="store-detail-image">${picture(p)}</div><div class="store-detail-body"><span class="store-card-category">${esc(label(p))}</span><h2 id="store-modal-title">${esc(p.nome||'Produto')}</h2><p>Marca: <strong>${esc(p.marca||'Não informada')}</strong></p><p>Estoque: <strong>${stock(p)} unidade(s)</strong></p><div class="store-detail-price">${price(p)}</div><button type="button" class="btn primary" data-add="${esc(p.id_produto ?? p.id ?? '')}" ${stock(p) <= 0 ? 'disabled' : ''}>Adicionar ao carrinho</button></div>`;
    modal.hidden=false; document.body.style.overflow='hidden';
  }
  function closeDetails(){modal.hidden=true;document.body.style.overflow='';}
  function saveCart(){ localStorage.setItem('cstech16_cart',JSON.stringify(cart)); renderCart(); }
  function addItem(id){
    const p=products.find(x=>String(x.id_produto??x.id??'')===String(id));
    if(!p || stock(p)<=0)return;
    const key=String(id);
    const quantity=Number(cart[key]||0);
    if(quantity>=stock(p)){alert('Quantidade máxima disponível em estoque.');return;}
    cart[key]=quantity+1;saveCart();
    if(!modal.hidden)closeDetails();
    openCart();
  }
  function renderCart(){
    const entries=Object.entries(cart).filter(([id,q])=>q>0 && products.some(p=>String(p.id_produto??p.id)===id));
    const totalQuantity=entries.reduce((sum,[,q])=>sum+Number(q),0);
    document.getElementById('store-cart-count').textContent=String(totalQuantity);
    cartItems.innerHTML=entries.length?entries.map(([id,q])=>{
      const p=products.find(p=>String(p.id_produto??p.id)===id);
      return `<div class="cart-row"><div><strong>${esc(p.nome)}</strong><small>${price(p)} por unidade</small></div><div class="cart-controls"><button type="button" data-minus="${esc(id)}" aria-label="Diminuir">−</button><span>${q}</span><button type="button" data-plus="${esc(id)}" aria-label="Aumentar">+</button><button type="button" data-remove="${esc(id)}">Remover</button></div></div>`;
    }).join(''):'<p class="muted">Seu carrinho está vazio.</p>';
    const total=entries.reduce((sum,[id,q])=>{const p=products.find(p=>String(p.id_produto??p.id)===id);return sum+Number(p.preco_venda??p.preco??0)*q;},0);
    document.getElementById('cart-total').textContent=money.format(total);
    document.getElementById('cart-checkout').disabled=!entries.length;
  }
  function openCart(){renderCart();cartMessage.textContent='';cartModal.hidden=false;document.body.style.overflow='hidden';}
  function closeCart(){cartModal.hidden=true;document.body.style.overflow='';}
  function handleAdd(e){const b=e.target.closest('[data-add]');if(b)addItem(b.dataset.add);}
  grid.addEventListener('click', event=>{
    if(event.target.closest('[data-add]'))return handleAdd(event);
    const button=event.target.closest('[data-product]');if(!button)return;
    const p=products.find(x=>String(x.id_produto??x.id??'')===button.dataset.product);
    if(p)openDetails(p);
  });
  modalContent.addEventListener('click',handleAdd);
  document.getElementById('store-cart-button').addEventListener('click',openCart);
  cartModal.addEventListener('click',e=>{
    if(e.target.closest('[data-close-cart]')){closeCart();return;}
    const b=e.target.closest('[data-plus],[data-minus],[data-remove]');if(!b)return;
    const id=b.dataset.plus??b.dataset.minus??b.dataset.remove;
    const p=products.find(p=>String(p.id_produto??p.id)===id);
    if(!p)return;
    if(b.hasAttribute('data-remove'))delete cart[id];
    else if(b.hasAttribute('data-minus')){cart[id]--;if(cart[id]<=0)delete cart[id];}
    else if(Number(cart[id]||0)<stock(p))cart[id]++;
    else{cartMessage.textContent='Quantidade máxima em estoque.';return;}
    cartMessage.textContent='';saveCart();
  });
  document.getElementById('cart-checkout').addEventListener('click',()=>{
    if(!getToken()){
      sessionStorage.setItem('cstech16_after_login','/static/loja.html?checkout=1');
      window.location.href='/static/index.html';
      return;
    }
    cartMessage.textContent='Você está autenticado. O registro do pedido ainda depende de uma rota de compras na API; nenhum pagamento ou pedido foi realizado.';
  });
  modal.addEventListener('click',e=>{if(e.target.closest('[data-close-modal]'))closeDetails();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!modal.hidden)closeDetails();if(!cartModal.hidden)closeCart();}});
  search.addEventListener('input',render);category.addEventListener('change',render);sort.addEventListener('change',render);
  document.getElementById('store-refresh').addEventListener('click',load);
  load();
});
