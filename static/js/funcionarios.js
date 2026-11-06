
document.addEventListener('DOMContentLoaded', async () => {

    if (!requireLogin()) return;

    const form = document.getElementById('funcionario-form');
    const msg = document.getElementById('funcionario-message');
    const list = document.getElementById('employees-content');

    const editPanel = document.getElementById('employee-edit-panel');
    const editForm = document.getElementById('employee-edit-form');
    const editMsg = document.getElementById('employee-edit-message');

    let editing = null;
    let employees = [];

    let searchTerm = '';
    let profileFilter = '';
    let statusFilter = '';

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
            panel.classList.toggle(
                'cs-tab-off',
                panel.dataset.panel !== name
            );
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
    // PERMISSÃO DE ADMINISTRADOR
    // ==========================================

    try {

        const me = await apiRequest('/api/v1/auth/me');

        if (String(me.perfil || '').toUpperCase() !== 'ADMIN') {

            list.textContent =
                'Apenas administradores podem gerenciar funcionários.';

            form.hidden = true;

            tabButtons.forEach(button => {
                button.disabled = true;
            });

            return;
        }

    } catch (error) {

        list.textContent = error.message;
        form.hidden = true;
        return;
    }

    // ==========================================
    // UTILITÁRIOS
    // ==========================================

    function cell(tr, value) {
        const td = document.createElement('td');

        td.textContent = String(value ?? '—');

        tr.appendChild(td);

        return td;
    }

    function getStatus(employee) {
        return employee.status ? 'Ativo' : 'Inativo';
    }

    // ==========================================
    // FILTROS
    // ==========================================

    function createFilters() {

        const oldFilters = document.getElementById('employee-filters');

        if (oldFilters) oldFilters.remove();

        const filters = document.createElement('div');

        filters.id = 'employee-filters';
        filters.className = 'sales-filters';

        filters.innerHTML = `
            <div>
                <label for="employee-search">Pesquisar funcionário</label>
                <input
                    id="employee-search"
                    type="search"
                    placeholder="Nome, e-mail ou ID..."
                >
            </div>

            <div>
                <label for="employee-profile-filter">Perfil</label>
                <select id="employee-profile-filter">
                    <option value="">Todos os perfis</option>
                </select>
            </div>

            <div>
                <label for="employee-status-filter">Status</label>
                <select id="employee-status-filter">
                    <option value="">Todos os status</option>
                    <option value="true">Ativos</option>
                    <option value="false">Inativos</option>
                </select>
            </div>

            <button
                type="button"
                class="btn secondary"
                id="clear-employee-filters"
            >
                Limpar filtros
            </button>
        `;

        list.parentNode.insertBefore(filters, list);

        const search = filters.querySelector('#employee-search');
        const profile = filters.querySelector('#employee-profile-filter');
        const status = filters.querySelector('#employee-status-filter');

        const profiles = [
            ...new Set(
                employees.map(employee =>
                    employee.perfil || 'funcionario'
                )
            )
        ].sort((a, b) =>
            String(a).localeCompare(String(b), 'pt-BR')
        );

        profiles.forEach(value => {

            const option = document.createElement('option');

            option.value = value;
            option.textContent =
                value.charAt(0).toUpperCase() + value.slice(1);

            profile.appendChild(option);
        });

        search.value = searchTerm;
        profile.value = profileFilter;
        status.value = statusFilter;

        search.addEventListener('input', () => {
            searchTerm = search.value;
            renderTable();
        });

        profile.addEventListener('change', () => {
            profileFilter = profile.value;
            renderTable();
        });

        status.addEventListener('change', () => {
            statusFilter = status.value;
            renderTable();
        });

        filters.querySelector('#clear-employee-filters')
            .addEventListener('click', () => {

                searchTerm = '';
                profileFilter = '';
                statusFilter = '';

                search.value = '';
                profile.value = '';
                status.value = '';

                renderTable();
            });
    }

    // ==========================================
    // EDIÇÃO
    // ==========================================

    function openEdit(employee) {

        editing = employee.id_funcionario;

        editForm.elements.nome.value = employee.nome || '';
        editForm.elements.email.value = employee.email || '';

        editForm.elements.status.value =
            String(Boolean(employee.status));

        editPanel.hidden = false;

        setMessage(editMsg, '');

        showTab('consultar');

        editPanel.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    // ==========================================
    // EXCLUSÃO
    // ==========================================

    async function deleteEmployee(employee) {

        if (!confirm('Excluir funcionário ' + employee.nome + '?')) {
            return;
        }

        try {

            await apiRequest(
                '/api/v1/funcionarios/' + employee.id_funcionario,
                { method: 'DELETE' }
            );

            setMessage(msg, 'Funcionário excluído.', 'success');

            await load();

        } catch (error) {

            setMessage(msg, error.message, 'error');
        }
    }

    // ==========================================
    // TABELA
    // ==========================================

    function renderTable() {

        const term = searchTerm.toLowerCase();

        const filtered = employees.filter(employee => {

            const matchesSearch =
                !term ||
                String(employee.id_funcionario || '').includes(term) ||
                String(employee.nome || '').toLowerCase().includes(term) ||
                String(employee.email || '').toLowerCase().includes(term);

            const profile = employee.perfil || 'funcionario';

            const matchesProfile =
                !profileFilter || profile === profileFilter;

            const matchesStatus =
                !statusFilter ||
                String(Boolean(employee.status)) === statusFilter;

            return matchesSearch && matchesProfile && matchesStatus;
        });

        if (!employees.length) {
            list.textContent = 'Nenhum funcionário cadastrado.';
            return;
        }

        const table = document.createElement('table');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
        `;

        const tbody = document.createElement('tbody');

        filtered.forEach(employee => {

            const tr = document.createElement('tr');

            cell(tr, employee.id_funcionario);
            cell(tr, employee.nome);
            cell(tr, employee.email);
            cell(tr, employee.perfil || 'funcionario');
            cell(tr, getStatus(employee));

            const actions = document.createElement('td');

            const edit = document.createElement('button');

            edit.type = 'button';
            edit.className = 'btn secondary';
            edit.textContent = 'Editar';

            edit.addEventListener('click', () => {
                openEdit(employee);
            });

            const del = document.createElement('button');

            del.type = 'button';
            del.className = 'btn danger-btn';
            del.textContent = 'Excluir';

            del.disabled =
                String(employee.perfil || '').toLowerCase() === 'admin';

            del.title = del.disabled
                ? 'Não é permitido excluir administrador'
                : '';

            del.addEventListener('click', () => {
                deleteEmployee(employee);
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

            td.colSpan = 6;
            td.textContent =
                'Nenhum funcionário encontrado com esses filtros.';

            tr.appendChild(td);
            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        list.replaceChildren(table);
    }

    // ==========================================
    // CARREGAR FUNCIONÁRIOS
    // ==========================================

    async function load() {

        list.textContent = 'Carregando funcionários...';

        try {

            const rows = await apiRequest('/api/v1/funcionarios');

            employees = Array.isArray(rows) ? rows : [];

            createFilters();
            renderTable();

        } catch (error) {

            list.textContent = error.message;
        }
    }

    // ==========================================
    // CADASTRAR
    // ==========================================

    form.addEventListener('submit', async event => {

        event.preventDefault();

        const btn = form.querySelector('[type=submit]');

        btn.disabled = true;

        try {

            await apiRequest('/api/v1/funcionarios', {
                method: 'POST',

                body: JSON.stringify({
                    nome: form.elements.nome.value.trim(),
                    email: form.elements.email.value.trim(),
                    senha: form.elements.senha.value,
                    status: form.elements.status.value === 'true'
                })
            });

            setMessage(msg, 'Funcionário cadastrado!', 'success');

            form.reset();

            await load();

        } catch (error) {

            setMessage(msg, error.message, 'error');

        } finally {

            btn.disabled = false;
        }
    });

    // ==========================================
    // SALVAR EDIÇÃO
    // ==========================================

    editForm.addEventListener('submit', async event => {

        event.preventDefault();

        if (editing === null) return;

        const btn = editForm.querySelector('[type=submit]');

        btn.disabled = true;

        try {

            await apiRequest(
                '/api/v1/funcionarios/' + editing,
                {
                    method: 'PUT',

                    body: JSON.stringify({
                        nome: editForm.elements.nome.value.trim(),
                        email: editForm.elements.email.value.trim(),
                        status: editForm.elements.status.value === 'true'
                    })
                }
            );

            setMessage(msg, 'Funcionário atualizado!', 'success');

            editPanel.hidden = true;
            editing = null;

            await load();

        } catch (error) {

            setMessage(editMsg, error.message, 'error');

        } finally {

            btn.disabled = false;
        }
    });

    // ==========================================
    // CANCELAR E ATUALIZAR
    // ==========================================

    document.getElementById('employee-cancel')
        .addEventListener('click', () => {

            editing = null;
            editPanel.hidden = true;

            editForm.reset();

            setMessage(editMsg, '');
        });

    document.getElementById('refresh-employees')
        .addEventListener('click', load);

    await load();

});
