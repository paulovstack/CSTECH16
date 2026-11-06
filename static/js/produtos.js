
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return;

    const form = document.getElementById('product-form');
    const content = document.getElementById('products-content');
    const message = document.getElementById('product-message');
    const submit = document.getElementById('product-submit');
    const cancel = document.getElementById('product-cancel');
    const specFields = document.getElementById('spec-fields');

    let products = [];
    let editing = null;
    let searchTerm = '';
    let categoryFilter = '';
    let brandFilter = '';
    let stockFilter = '';

    // ==========================================
    // CONTROLE DAS ABAS
    // ==========================================

    const tabButtons = document.querySelectorAll('.cs-tab');
    const panels = document.querySelectorAll('[data-panel]');

    function showTab(name) {
        tabButtons.forEach(button => {
            const active = button.dataset.tab === name;
            button.classList.toggle('is-on', active);
            button.setAttribute('aria-selected', String(active));
        });

        panels.forEach(panel => {
            panel.classList.toggle('cs-tab-off', panel.dataset.panel !== name);
        });

        const activeButton = document.querySelector('.cs-tab.is-on');
        const indicator = document.querySelector('.cs-tab-ind');

        if (activeButton && indicator) {
            indicator.style.width = activeButton.offsetWidth + 'px';
            indicator.style.transform =
                `translateX(${activeButton.offsetLeft}px)`;
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            showTab(button.dataset.tab);
        });
    });

    window.addEventListener('resize', () => {
        const active = document.querySelector('.cs-tab.is-on');
        if (active) showTab(active.dataset.tab);
    });

    showTab('cadastrar');

    // ==========================================
    // ESPECIFICAÇÕES TÉCNICAS
    // ==========================================

    function addSpec(key = '', value = '') {
        const row = document.createElement('div');
        row.className = 'spec-entry';

        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'Característica (ex.: memoria_ram)';
        keyInput.value = key;
        keyInput.setAttribute('aria-label', 'Nome da característica');

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.placeholder = 'Valor (ex.: 16 GB)';
        valueInput.value = value;
        valueInput.setAttribute('aria-label', 'Valor da característica');

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn secondary';
        remove.textContent = 'Remover';
        remove.addEventListener('click', () => row.remove());

        row.append(keyInput, valueInput, remove);
        specFields.append(row);
    }

    function populateSpecs(specs) {
        specFields.replaceChildren();

        try {
            if (typeof specs === 'string') {
                specs = JSON.parse(specs);
            }
        } catch {
            specs = null;
        }

        if (specs && typeof specs === 'object' && !Array.isArray(specs)) {
            Object.entries(specs).forEach(([key, value]) => {
                addSpec(key, String(value ?? ''));
            });
        }

        if (!specFields.children.length) {
            addSpec();
        }
    }

    function collectSpecs() {
        const specs = {};

        for (const row of specFields.children) {
            const [keyEl, valueEl] = row.querySelectorAll('input');

            const key = keyEl.value.trim();
            const value = valueEl.value.trim();

            if (!key && !value) continue;

            if (!key || !value) {
                throw Error(
                    'Preencha o nome e o valor de cada característica.'
                );
            }

            if (Object.prototype.hasOwnProperty.call(specs, key)) {
                throw Error('Característica repetida: ' + key);
            }

            specs[key] = value;
        }

        return Object.keys(specs).length ? specs : null;
    }

    document.getElementById('add-spec').addEventListener('click', () => {
        addSpec();
    });

    populateSpecs();

    // ==========================================
    // PERMISSÕES
    // ==========================================

    try {
        const me = await apiRequest('/api/v1/auth/me');
        const role = String(me.perfil || '').toUpperCase();

        if (!['ADMIN', 'FUNCIONARIO'].includes(role)) {
            location.href = '/static/loja.html?v=20261106-cs';
            return;
        }

        document.getElementById('employee-nav').hidden = role !== 'ADMIN';

    } catch (error) {
        setMessage(message, error.message, 'error');
        return;
    }

    // ==========================================
    // UTILITÁRIOS
    // ==========================================

    const currency = value =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(Number(value || 0));

    function cell(tr, value) {
        const td = document.createElement('td');
        td.textContent = String(value ?? '—');
        tr.appendChild(td);
        return td;
    }

    function getStockStatus(quantity) {
        const stock = Number(quantity);

        if (stock <= 0) return 'Sem estoque';
        if (stock <= 5) return 'Estoque baixo';
        return 'Disponível';
    }

    // ==========================================
    // FILTROS
    // ==========================================

    function createFilters() {
        const oldFilters = document.getElementById('product-filters');

        if (oldFilters) oldFilters.remove();

        const filters = document.createElement('div');
        filters.id = 'product-filters';
        filters.className = 'sales-filters';

        filters.innerHTML = `
            <div>
                <label for="product-search">Pesquisar produto</label>
                <input
                    id="product-search"
                    type="search"
                    placeholder="Nome ou ID do produto..."
                >
            </div>

            <div>
                <label for="product-category-filter">Categoria</label>
                <select id="product-category-filter">
                    <option value="">Todas as categorias</option>
                </select>
            </div>

            <div>
                <label for="product-brand-filter">Marca</label>
                <select id="product-brand-filter">
                    <option value="">Todas as marcas</option>
                </select>
            </div>

            <div>
                <label for="product-stock-filter">Estoque</label>
                <select id="product-stock-filter">
                    <option value="">Todos</option>
                    <option value="available">Disponível</option>
                    <option value="low">Estoque baixo</option>
                    <option value="empty">Sem estoque</option>
                </select>
            </div>

            <button type="button" class="btn secondary" id="clear-product-filters">
                Limpar filtros
            </button>
        `;

        content.parentNode.insertBefore(filters, content);

        const search = filters.querySelector('#product-search');
        const category = filters.querySelector('#product-category-filter');
        const brand = filters.querySelector('#product-brand-filter');
        const stock = filters.querySelector('#product-stock-filter');

        const categories = [...new Set(
            products.map(p => p.categoria).filter(Boolean)
        )].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));

        const brands = [...new Set(
            products.map(p => p.marca).filter(Boolean)
        )].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));

        categories.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            category.append(option);
        });

        brands.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            brand.append(option);
        });

        search.value = searchTerm;
        category.value = categoryFilter;
        brand.value = brandFilter;
        stock.value = stockFilter;

        search.addEventListener('input', () => {
            searchTerm = search.value;
            renderTable();
        });

        category.addEventListener('change', () => {
            categoryFilter = category.value;
            renderTable();
        });

        brand.addEventListener('change', () => {
            brandFilter = brand.value;
            renderTable();
        });

        stock.addEventListener('change', () => {
            stockFilter = stock.value;
            renderTable();
        });

        filters.querySelector('#clear-product-filters')
            .addEventListener('click', () => {
                searchTerm = '';
                categoryFilter = '';
                brandFilter = '';
                stockFilter = '';

                search.value = '';
                category.value = '';
                brand.value = '';
                stock.value = '';

                renderTable();
            });
    }

    // ==========================================
    // TABELA
    // ==========================================

    function renderTable() {
        const filtered = products.filter(product => {
            const term = searchTerm.toLowerCase();

            const matchesSearch =
                !term ||
                String(product.nome || '').toLowerCase().includes(term) ||
                String(product.id_produto || '').includes(term);

            const matchesCategory =
                !categoryFilter ||
                product.categoria === categoryFilter;

            const matchesBrand =
                !brandFilter ||
                product.marca === brandFilter;

            const quantity = Number(product.quantidade || 0);

            const matchesStock =
                !stockFilter ||
                (stockFilter === 'available' && quantity > 5) ||
                (stockFilter === 'low' && quantity > 0 && quantity <= 5) ||
                (stockFilter === 'empty' && quantity <= 0);

            return matchesSearch &&
                matchesCategory &&
                matchesBrand &&
                matchesStock;
        });

        if (!products.length) {
            content.textContent = 'Nenhum produto cadastrado.';
            return;
        }

        const table = document.createElement('table');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Marca</th>
                    <th>Categoria</th>
                    <th>Preço</th>
                    <th>Estoque</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
        `;

        const tbody = document.createElement('tbody');

        filtered.forEach(product => {
            const tr = document.createElement('tr');

            cell(tr, product.id_produto);
            cell(tr, product.nome);
            cell(tr, product.marca);
            cell(tr, product.categoria);
            cell(tr, currency(product.preco_venda));
            cell(tr, product.quantidade);
            cell(tr, getStockStatus(product.quantidade));

            const actions = document.createElement('td');

            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'btn secondary';
            edit.textContent = 'Editar';

            edit.addEventListener('click', () => {
                editing = product.id_produto;

                for (const field of [
                    'nome',
                    'marca',
                    'preco_venda',
                    'quantidade',
                    'categoria',
                    'imagem_url'
                ]) {
                    form.elements[field].value = product[field] ?? '';
                }

                form.elements.descricao.value = product.descricao ?? '';

                populateSpecs(product.especificacoes);

                submit.textContent = 'Salvar alterações';

                document.getElementById('product-form-title').textContent =
                    'Editar produto #' + editing;

                cancel.hidden = false;

                showTab('cadastrar');

                form.scrollIntoView({ behavior: 'smooth' });
            });

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'btn danger-btn';
            del.textContent = 'Excluir';

            del.addEventListener('click', async () => {
                if (!confirm('Excluir o produto ' + product.nome + '?')) {
                    return;
                }

                try {
                    await apiRequest(
                        '/api/v1/produtos/' + product.id_produto,
                        { method: 'DELETE' }
                    );

                    setMessage(message, 'Produto excluído.', 'success');
                    await load();

                } catch (error) {
                    setMessage(message, error.message, 'error');
                }
            });

            actions.append(
                edit,
                document.createTextNode(' '),
                del
            );

            tr.appendChild(actions);
            tbody.appendChild(tr);
        });

        if (!filtered.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');

            td.colSpan = 8;
            td.textContent = 'Nenhum produto encontrado com esses filtros.';

            tr.appendChild(td);
            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        content.replaceChildren(table);
    }

    // ==========================================
    // CARREGAR PRODUTOS
    // ==========================================

    async function load() {
        content.textContent = 'Carregando produtos...';

        try {
            const result = await apiRequest('/api/v1/produtos/');

            products = Array.isArray(result)
                ? result
                : (result.produtos || result.items || []);

            createFilters();
            renderTable();

        } catch (error) {
            content.textContent = 'Erro ao carregar produtos: ' + error.message;
        }
    }

    // ==========================================
    // FORMULÁRIO
    // ==========================================

    function reset() {
        editing = null;
        form.reset();
        populateSpecs();

        submit.textContent = 'Cadastrar produto';
        cancel.hidden = true;

        document.getElementById('product-form-title').textContent =
            'Cadastrar produto';
    }

    cancel.addEventListener('click', reset);

    document.getElementById('refresh-products')
        .addEventListener('click', load);

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const data = {
            nome: form.elements.nome.value.trim(),
            marca: form.elements.marca.value.trim(),
            preco_venda: Number(form.elements.preco_venda.value),
            quantidade: Number(form.elements.quantidade.value),
            categoria: form.elements.categoria.value.trim(),
            imagem_url: form.elements.imagem_url.value.trim() || null,
            descricao: form.elements.descricao.value.trim() || null
        };

        try {
            data.especificacoes = collectSpecs();
        } catch (error) {
            setMessage(message, error.message, 'error');
            return;
        }

        submit.disabled = true;

        try {
            const isEditing = editing !== null;

            await apiRequest(
                isEditing
                    ? '/api/v1/produtos/' + editing
                    : '/api/v1/produtos/',
                {
                    method: isEditing ? 'PUT' : 'POST',
                    body: JSON.stringify(data)
                }
            );

            setMessage(
                message,
                isEditing ? 'Produto atualizado!' : 'Produto cadastrado!',
                'success'
            );

            reset();
            await load();

        } catch (error) {
            setMessage(message, error.message, 'error');

        } finally {
            submit.disabled = false;
        }
    });

    await load();
});
