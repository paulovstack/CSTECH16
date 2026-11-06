/* CSTECH16 painel: abas, filtros/ordenação de tabelas, contadores e selos de status */
(function () {
'use strict';
var D = document, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(s, r) { return (r || D).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }

/* ---- abas do dashboard ---- */
var tabs = $('.cs-tabs');
if (tabs) {
  var btns = $$('.cs-tab', tabs), sales = $('#admin-sales-section');
  var atual = function () { var b = btns.filter(function (x) { return x.classList.contains('is-on'); })[0]; return b ? b.dataset.tab : 'principal'; };
  var show = function (name, push) {
    var ok = btns.some(function (x) { return x.dataset.tab === name && !x.hidden; });
    if (!ok) name = 'principal';
    btns.forEach(function (x) { var on = x.dataset.tab === name; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); });
    $$('[data-panel]').forEach(function (p) {
      var on = p.dataset.panel === name;
      p.classList.toggle('cs-tab-off', !on);
      if (on && !reduce) { p.classList.remove('cs-tab-in'); void p.offsetWidth; p.classList.add('cs-tab-in'); }
    });
    var ind = $('.cs-tab-ind', tabs), cur = btns.filter(function (x) { return x.classList.contains('is-on'); })[0];
    if (ind && cur) { ind.style.width = cur.offsetWidth + 'px'; ind.style.transform = 'translateX(' + cur.offsetLeft + 'px)'; }
    if (push) history.replaceState(null, '', '#' + name);
  };
  btns.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.tab, true); }); });
  var sync = function () {
    btns.forEach(function (b) { if (b.hasAttribute('data-admin')) b.hidden = !sales || sales.hidden; });
    show((location.hash || '#principal').slice(1));
  };
  if (sales) new MutationObserver(sync).observe(sales, { attributes: true, attributeFilter: ['hidden'] });
  addEventListener('resize', function () { show(atual()); });
  addEventListener('load', function () { show(atual()); });
  sync();
}

/* ---- filtros, ordenação e selos nas tabelas ---- */
var PILL = { 'concluída': 'ok', 'concluida': 'ok', 'ativo': 'ok', 'pendente': 'warn', 'cancelada': 'bad', 'inativo': 'bad', 'bloqueado': 'bad' };
var HINT = { 'sales-ranking-body': 'Buscar produto…', 'sales-history-body': 'Buscar cliente, produto ou compra…' };
function num(t) {
  var m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return +(m[3] + m[2] + m[1]);
  if (!/^(R\$\s*)?#?[\d.,\s-]+$/.test(t)) return NaN;
  return parseFloat(t.replace(/[^\d,-]/g, '').replace(',', '.'));
}
function initTable(table) {
  var head = $$('thead th', table), tb = $('tbody', table);
  if (!head.length || !tb || table.dataset.csTf) return;
  table.dataset.csTf = '1';
  var wrap = table.closest('.table-wrap') || table;
  var bar = D.createElement('div');
  bar.className = 'cs-tf';
  bar.innerHTML = '<label class="cs-tf-s"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" aria-label="Filtrar tabela"></label><span class="cs-tf-sel"></span><span class="cs-tf-n"></span><button type="button" class="cs-tf-x" hidden>Limpar filtros</button>';
  wrap.parentNode.insertBefore(bar, wrap);
  var inp = $('input', bar), selBox = $('.cs-tf-sel', bar), cnt = $('.cs-tf-n', bar), clr = $('.cs-tf-x', bar);
  inp.placeholder = HINT[tb.id] || 'Filtrar nesta tabela…';
  var cols = [], busy = false, sortI = -1, sortD = 1;
  var free = function () { setTimeout(function () { busy = false; }, 0); };
  head.forEach(function (th, i) {
    if (/categoria|status|perfil|marca|tipo/i.test(th.textContent)) {
      var s = D.createElement('select');
      s.setAttribute('aria-label', 'Filtrar por ' + th.textContent.trim().toLowerCase());
      selBox.appendChild(s);
      cols.push({ i: i, s: s, l: th.textContent.trim() });
      s.addEventListener('change', apply);
    }
  });
  function rows() { return $$('tr', tb).filter(function (r) { return !r.classList.contains('cs-empty') && r.cells.length > 1; }); }
  function fill() {
    cols.forEach(function (c) {
      var cur = c.s.value, set = {};
      rows().forEach(function (r) { var t = r.cells[c.i] && r.cells[c.i].textContent.trim(); if (t) set[t] = 1; });
      c.s.textContent = '';
      var o0 = D.createElement('option'); o0.value = ''; o0.textContent = c.l + ': todos'; c.s.appendChild(o0);
      Object.keys(set).sort().forEach(function (v) { var o = D.createElement('option'); o.textContent = v; c.s.appendChild(o); });
      if (set[cur]) c.s.value = cur;
    });
  }
  function pills(all) {
    all.forEach(function (r) {
      for (var k = 0; k < r.cells.length; k++) {
        var c = r.cells[k];
        if (c.children.length) continue;
        var t = c.textContent.trim(), cl = PILL[t.toLowerCase()];
        if (cl) { var sp = D.createElement('span'); sp.className = 'cs-pill ' + cl; sp.textContent = t; c.textContent = ''; c.appendChild(sp); }
      }
    });
  }
  function apply() {
    busy = true;
    var q = inp.value.trim().toLowerCase(), all = rows(), vis = 0;
    all.forEach(function (r) {
      var ok = !q || r.textContent.toLowerCase().indexOf(q) > -1;
      cols.forEach(function (c) { if (ok && c.s.value && r.cells[c.i].textContent.trim() !== c.s.value) ok = false; });
      r.classList.toggle('cs-tf-off', !ok);
      if (ok) vis++;
    });
    var emp = $('.cs-empty', tb); if (emp) emp.remove();
    if (all.length && !vis) {
      var tr = D.createElement('tr'), td = D.createElement('td');
      tr.className = 'cs-empty'; td.colSpan = head.length; td.textContent = 'Nenhum resultado para este filtro.';
      tr.appendChild(td); tb.appendChild(tr);
    }
    cnt.textContent = all.length ? vis + ' de ' + all.length : '';
    clr.hidden = !(q || cols.some(function (c) { return c.s.value; }));
    pills(all);
    free();
  }
  inp.addEventListener('input', apply);
  clr.addEventListener('click', function () { inp.value = ''; cols.forEach(function (c) { c.s.value = ''; }); apply(); });
  head.forEach(function (th, i) {
    if (!th.textContent.trim() || /a[cç][õo]es/i.test(th.textContent)) return;
    th.classList.add('cs-sortable');
    th.addEventListener('click', function () {
      sortD = sortI === i ? -sortD : 1; sortI = i;
      head.forEach(function (h) { h.classList.remove('asc', 'desc'); });
      th.classList.add(sortD > 0 ? 'asc' : 'desc');
      busy = true;
      var all = rows();
      all.sort(function (a, b) {
        var x = a.cells[i].textContent.trim(), y = b.cells[i].textContent.trim(), nx = num(x), ny = num(y);
        return ((!isNaN(nx) && !isNaN(ny)) ? nx - ny : x.localeCompare(y, 'pt-BR')) * sortD;
      });
      all.forEach(function (r) { tb.appendChild(r); });
      var e = $('.cs-empty', tb); if (e) tb.appendChild(e);
      free();
    });
  });
  new MutationObserver(function () { if (busy) return; fill(); apply(); }).observe(tb, { childList: true });
  fill(); apply();
}
$$('.main-content table').forEach(initTable);

/* ---- contadores animados nos indicadores ---- */
function countUp(el) {
  if (reduce) return;
  var t = el.textContent.trim(), m = t.match(/^(R\$\s*)?(-?[\d.]+)(,(\d+))?$/);
  if (!m || el.dataset.csDone === t) return;
  var dec = m[4] ? m[4].length : 0, tgt = parseFloat(m[2].replace(/\./g, '') + (m[4] ? '.' + m[4] : ''));
  if (!isFinite(tgt) || tgt === 0) return;
  el.dataset.csDone = t; el.dataset.csBusy = '1';
  var t0 = performance.now();
  (function step(now) {
    var p = Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - p, 3);
    el.textContent = p < 1 ? (m[1] || '') + (tgt * e).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : t;
    if (p < 1) requestAnimationFrame(step); else delete el.dataset.csBusy;
  })(t0);
}
var mo = new MutationObserver(function (ms) {
  ms.forEach(function (m) {
    var n = m.target.nodeType === 1 ? m.target : m.target.parentNode, s = n && n.closest && n.closest('strong');
    if (s && !s.dataset.csBusy) countUp(s);
  });
});
$$('.premium-metrics,.sales-chart-summary').forEach(function (b) { mo.observe(b, { childList: true, characterData: true, subtree: true }); });
})();
