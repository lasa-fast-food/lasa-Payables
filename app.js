// ── LASA AP Control — app.js ──────────────────────────────────────────────

const STORAGE_KEY = 'lasa_ap_transactions';
const CHART_COLORS = ['#d4a843','#3ecf8e','#4a90d9','#f66','#f5a623','#a78bfa','#34d399','#fb923c','#60a5fa','#f472b6'];

let transactions = [];
let editingId = null;
let charts = {};

// ── STORAGE ──────────────────────────────────────────────────────────────

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    transactions = raw ? JSON.parse(raw) : [];
  } catch { transactions = []; }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── NAVIGATION ───────────────────────────────────────────────────────────

document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const view = link.dataset.view;
    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + view).classList.remove('hidden');
    if (view === 'dashboard') renderDashboard();
    if (view === 'history')   renderHistory();
    if (view === 'suppliers') renderSuppliers();
    if (view === 'reports')   renderReports();
  });
});

// ── DASHBOARD ────────────────────────────────────────────────────────────

function renderDashboard() {
  // Date
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const now = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  const total   = transactions.reduce((s, t) => s + t.amount, 0);
  const monthly = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).reduce((s,t) => s + t.amount, 0);
  const unpaid  = transactions.filter(t => t.status !== 'Paid').reduce((s,t) => s + t.amount, 0);

  document.getElementById('stat-total').textContent  = fmt(total);
  document.getElementById('stat-month').textContent  = fmt(monthly);
  document.getElementById('stat-unpaid').textContent = fmt(unpaid);
  document.getElementById('stat-count').textContent  = transactions.length;

  // Recent 5
  const recent = [...transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,5);
  const tbody = document.getElementById('recent-body');
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No transactions yet</td></tr>';
  } else {
    tbody.innerHTML = recent.map(t => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td>${esc(t.item)}</td>
        <td>${esc(t.supplier)}</td>
        <td class="amount-cell">${fmt(t.amount)}</td>
        <td>${statusPill(t.status)}</td>
      </tr>`).join('');
  }

  // Category doughnut
  buildCategoryChart('categoryChart', transactions, 'categoryLegend');

  // Monthly bar
  buildMonthlyChart();
}

function buildCategoryChart(canvasId, data, legendId) {
  const cats = {};
  data.forEach(t => {
    const c = t.category || 'Other';
    cats[c] = (cats[c] || 0) + t.amount;
  });
  const labels = Object.keys(cats);
  const values = Object.values(cats);

  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (charts[canvasId]) charts[canvasId].destroy();

  if (!labels.length) { ctx.style.display = 'none'; return; }
  ctx.style.display = '';

  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: CHART_COLORS.slice(0, labels.length), borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}`
          }
        }
      }
    }
  });

  if (legendId) {
    document.getElementById(legendId).innerHTML = labels.map((l, i) =>
      `<div class="legend-item"><div class="legend-dot" style="background:${CHART_COLORS[i]}"></div>${l}</div>`
    ).join('');
  }
}

function buildMonthlyChart() {
  const months = {};
  transactions.forEach(t => {
    const d = new Date(t.date);
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    months[key] = (months[key] || 0) + t.amount;
  });

  const sorted = Object.keys(months).sort();
  const labels = sorted.map(k => {
    const [y,m] = k.split('-');
    return new Date(+y, +m-1).toLocaleDateString('en-ZA', { month:'short', year:'2-digit' });
  });
  const values = sorted.map(k => months[k]);

  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;
  if (charts['monthlyChart']) charts['monthlyChart'].destroy();

  charts['monthlyChart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Spend (R)',
        data: values,
        backgroundColor: 'rgba(212,168,67,0.35)',
        borderColor: '#d4a843',
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1a1e25' }, ticks: { color: '#555d6e', font: { family: 'DM Mono' } } },
        y: {
          grid: { color: '#1a1e25' },
          ticks: {
            color: '#555d6e', font: { family: 'DM Mono' },
            callback: v => 'R ' + v.toLocaleString()
          }
        }
      }
    }
  });
}

// ── HISTORY ──────────────────────────────────────────────────────────────

function renderHistory() {
  const search   = (document.getElementById('searchInput').value || '').toLowerCase();
  const fStatus  = document.getElementById('filterStatus').value;
  const fCat     = document.getElementById('filterCategory').value;

  // Populate category filter
  const cats = [...new Set(transactions.map(t => t.category).filter(Boolean))];
  const catSel = document.getElementById('filterCategory');
  const current = catSel.value;
  catSel.innerHTML = '<option value="">All Categories</option>' +
    cats.map(c => `<option${current===c?' selected':''}>${c}</option>`).join('');

  let data = [...transactions].sort((a,b) => new Date(b.date)-new Date(a.date));
  if (search)  data = data.filter(t => (t.item+t.supplier).toLowerCase().includes(search));
  if (fStatus) data = data.filter(t => t.status === fStatus);
  if (fCat)    data = data.filter(t => t.category === fCat);

  const tbody = document.getElementById('history-body');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-msg">No transactions found</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(t => `
    <tr>
      <td>${fmtDate(t.date)}</td>
      <td>${esc(t.item)}</td>
      <td>${esc(t.supplier)}</td>
      <td><span style="font-size:11px;color:var(--text3)">${esc(t.category||'')}</span></td>
      <td style="font-family:var(--font-mono);font-size:12px">${t.qty ? t.qty + ' ' + (t.unit||'') : '—'}</td>
      <td class="amount-cell">${fmt(t.amount)}</td>
      <td>${statusPill(t.status)}</td>
      <td><button class="action-btn" onclick="openEdit('${t.id}')">Edit</button></td>
    </tr>`).join('');
}

document.getElementById('searchInput').addEventListener('input', renderHistory);
document.getElementById('filterStatus').addEventListener('change', renderHistory);
document.getElementById('filterCategory').addEventListener('change', renderHistory);

// ── SUPPLIERS ────────────────────────────────────────────────────────────

function renderSuppliers() {
  const map = {};
  transactions.forEach(t => {
    const s = t.supplier || 'Unknown';
    if (!map[s]) map[s] = { total:0, count:0, unpaid:0, last:'' };
    map[s].total  += t.amount;
    map[s].count  += 1;
    if (t.status !== 'Paid') map[s].unpaid += t.amount;
    if (!map[s].last || t.date > map[s].last) map[s].last = t.date;
  });

  const list = Object.entries(map).sort((a,b) => b[1].total - a[1].total);

  const statsEl = document.getElementById('supplier-stats');
  statsEl.innerHTML = `
    <div class="stat-card"><div class="stat-label">Unique Suppliers</div><div class="stat-value">${list.length}</div></div>
    <div class="stat-card"><div class="stat-label">Highest Spend</div><div class="stat-value">${list[0] ? fmt(list[0][1].total) : 'R 0.00'}</div></div>
  `;

  const tbody = document.getElementById('supplier-body');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No suppliers yet</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(([name, d]) => `
    <tr>
      <td style="font-weight:600;color:var(--text)">${esc(name)}</td>
      <td style="font-family:var(--font-mono)">${d.count}</td>
      <td class="amount-cell">${fmt(d.total)}</td>
      <td>${d.last ? fmtDate(d.last) : '—'}</td>
      <td class="${d.unpaid > 0 ? 'amount-cell" style="color:var(--red)' : 'amount-cell'}">${d.unpaid > 0 ? fmt(d.unpaid) : '—'}</td>
    </tr>`).join('');
}

// ── REPORTS ──────────────────────────────────────────────────────────────

function renderReports() {
  const period = document.getElementById('reportPeriod').value;
  const now = new Date();
  let data = [...transactions];

  if (period === 'month') {
    data = data.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  } else if (period === 'year') {
    data = data.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    data = data.filter(t => {
      const d = new Date(t.date);
      return Math.floor(d.getMonth()/3) === q && d.getFullYear() === now.getFullYear();
    });
  }

  const total   = data.reduce((s,t)=>s+t.amount,0);
  const unpaid  = data.filter(t=>t.status!=='Paid').reduce((s,t)=>s+t.amount,0);
  const paid    = data.filter(t=>t.status==='Paid').reduce((s,t)=>s+t.amount,0);

  document.getElementById('report-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Spend</div><div class="stat-value">${fmt(total)}</div></div>
    <div class="stat-card"><div class="stat-label">Paid</div><div class="stat-value accent-green">${fmt(paid)}</div></div>
    <div class="stat-card"><div class="stat-label">Unpaid / Outstanding</div><div class="stat-value accent-red">${fmt(unpaid)}</div></div>
    <div class="stat-card"><div class="stat-label">Transactions</div><div class="stat-value">${data.length}</div></div>
  `;

  // Supplier bar chart
  const supMap = {};
  data.forEach(t => { const s = t.supplier||'Unknown'; supMap[s]=(supMap[s]||0)+t.amount; });
  const supEntries = Object.entries(supMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

  const supCtx = document.getElementById('supplierChart');
  if (charts['supplierChart']) charts['supplierChart'].destroy();
  if (supEntries.length) {
    charts['supplierChart'] = new Chart(supCtx, {
      type: 'bar',
      data: {
        labels: supEntries.map(e=>e[0]),
        datasets: [{ data: supEntries.map(e=>e[1]), backgroundColor: CHART_COLORS, borderWidth: 0, borderRadius: 4 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#1a1e25' }, ticks: { color:'#555d6e', font:{family:'DM Mono'}, callback: v=>'R '+v.toLocaleString() } },
          y: { grid: { display:false }, ticks: { color:'#8b93a5', font:{size:12} } }
        }
      }
    });
  }

  buildCategoryChart('reportCatChart', data, null);

  // Unpaid table
  const unpaidList = data.filter(t => t.status !== 'Paid').sort((a,b)=>new Date(a.date)-new Date(b.date));
  const upBody = document.getElementById('unpaid-body');
  if (!unpaidList.length) {
    upBody.innerHTML = '<tr><td colspan="6" class="empty-msg">No outstanding items — all clear!</td></tr>';
  } else {
    upBody.innerHTML = unpaidList.map(t => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td>${esc(t.item)}</td>
        <td>${esc(t.supplier)}</td>
        <td class="amount-cell">${fmt(t.amount)}</td>
        <td>${t.dueDate ? fmtDate(t.dueDate) : '—'}</td>
        <td>${statusPill(t.status)}</td>
      </tr>`).join('');
  }
}

document.getElementById('reportPeriod').addEventListener('change', renderReports);

// ── ADD PURCHASE ──────────────────────────────────────────────────────────

// Set today's date as default
document.getElementById('f-date').value = todayStr();

// Auto-calculate amount
function calcAmount() {
  const qty   = parseFloat(document.getElementById('f-qty').value) || 0;
  const price = parseFloat(document.getElementById('f-unitprice').value) || 0;
  if (qty && price) {
    const total = qty * price;
    document.getElementById('f-amount').value = total.toFixed(2);
    document.getElementById('amtPreview').textContent = 'R ' + total.toLocaleString('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2});
  } else if (parseFloat(document.getElementById('f-amount').value)) {
    document.getElementById('amtPreview').textContent = 'R ' + parseFloat(document.getElementById('f-amount').value).toLocaleString('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2});
  } else {
    document.getElementById('amtPreview').textContent = '';
  }
}
document.getElementById('f-qty').addEventListener('input', calcAmount);
document.getElementById('f-unitprice').addEventListener('input', calcAmount);
document.getElementById('f-amount').addEventListener('input', calcAmount);

document.getElementById('saveBtn').addEventListener('click', () => {
  const date     = document.getElementById('f-date').value;
  const supplier = document.getElementById('f-supplier').value.trim();
  const item     = document.getElementById('f-item').value.trim();
  const amount   = parseFloat(document.getElementById('f-amount').value);

  if (!date || !supplier || !item || !amount) {
    showToast('Please fill in required fields (Date, Supplier, Item, Amount)', 'error');
    return;
  }

  const tx = {
    id:        genId(),
    date,
    supplier,
    item,
    category:  document.getElementById('f-category').value,
    qty:       parseFloat(document.getElementById('f-qty').value) || 0,
    unit:      document.getElementById('f-unit').value,
    unitPrice: parseFloat(document.getElementById('f-unitprice').value) || 0,
    amount,
    payMethod: document.getElementById('f-paymethod').value,
    status:    document.getElementById('f-status').value,
    invoice:   document.getElementById('f-invoice').value.trim(),
    dueDate:   document.getElementById('f-duedate').value,
    notes:     document.getElementById('f-notes').value.trim(),
    createdAt: new Date().toISOString()
  };

  transactions.push(tx);
  save();
  updateSupplierList();
  resetForm();
  showToast('Purchase saved!', 'success');

  // Navigate to history
  document.querySelector('[data-view="history"]').click();
});

function resetForm() {
  ['f-date','f-supplier','f-item','f-category','f-qty','f-unit','f-unitprice',
   'f-amount','f-paymethod','f-invoice','f-duedate','f-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el.tagName === 'SELECT') el.value = id === 'f-status' ? 'Paid' : '';
    else el.value = id === 'f-date' ? todayStr() : '';
  });
  document.getElementById('f-status').value = 'Paid';
  document.getElementById('amtPreview').textContent = '';
}

function updateSupplierList() {
  const suppliers = [...new Set(transactions.map(t => t.supplier).filter(Boolean))];
  document.getElementById('supplierList').innerHTML =
    suppliers.map(s => `<option value="${esc(s)}">`).join('');
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────

function openEdit(id) {
  const t = transactions.find(tx => tx.id === id);
  if (!t) return;
  editingId = id;

  document.getElementById('e-date').value     = t.date;
  document.getElementById('e-supplier').value = t.supplier;
  document.getElementById('e-item').value     = t.item;
  document.getElementById('e-category').value = t.category || '';
  document.getElementById('e-qty').value      = t.qty || '';
  document.getElementById('e-unit').value     = t.unit || '';
  document.getElementById('e-amount').value   = t.amount;
  document.getElementById('e-paymethod').value= t.payMethod || '';
  document.getElementById('e-status').value   = t.status;
  document.getElementById('e-invoice').value  = t.invoice || '';
  document.getElementById('e-duedate').value  = t.dueDate || '';
  document.getElementById('e-notes').value    = t.notes || '';

  document.getElementById('editModal').classList.remove('hidden');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('editModal').addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeModal();
});
function closeModal() {
  document.getElementById('editModal').classList.add('hidden');
  editingId = null;
}

document.getElementById('updateBtn').addEventListener('click', () => {
  if (!editingId) return;
  const idx = transactions.findIndex(t => t.id === editingId);
  if (idx < 0) return;
  transactions[idx] = {
    ...transactions[idx],
    date:      document.getElementById('e-date').value,
    supplier:  document.getElementById('e-supplier').value.trim(),
    item:      document.getElementById('e-item').value.trim(),
    category:  document.getElementById('e-category').value,
    qty:       parseFloat(document.getElementById('e-qty').value) || 0,
    unit:      document.getElementById('e-unit').value,
    amount:    parseFloat(document.getElementById('e-amount').value) || 0,
    payMethod: document.getElementById('e-paymethod').value,
    status:    document.getElementById('e-status').value,
    invoice:   document.getElementById('e-invoice').value.trim(),
    dueDate:   document.getElementById('e-duedate').value,
    notes:     document.getElementById('e-notes').value.trim(),
    updatedAt: new Date().toISOString()
  };
  save();
  closeModal();
  renderHistory();
  showToast('Transaction updated', 'success');
});

document.getElementById('deleteBtn').addEventListener('click', () => {
  if (!editingId) return;
  if (!confirm('Delete this transaction? This cannot be undone.')) return;
  transactions = transactions.filter(t => t.id !== editingId);
  save();
  closeModal();
  renderHistory();
  showToast('Transaction deleted', 'error');
});

// ── EXPORT CSV ───────────────────────────────────────────────────────────

document.getElementById('exportBtn').addEventListener('click', () => {
  if (!transactions.length) { showToast('No data to export', 'error'); return; }
  const headers = ['Date','Supplier','Item','Category','Qty','Unit','Unit Price','Amount','Payment Method','Status','Invoice No','Due Date','Notes'];
  const rows = transactions.map(t => [
    t.date, t.supplier, t.item, t.category, t.qty, t.unit, t.unitPrice,
    t.amount, t.payMethod, t.status, t.invoice, t.dueDate, t.notes
  ].map(v => `"${String(v||'').replace(/"/g,'""')}"`));

  const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `lasa-ap-${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported!', 'success');
});

// ── UTILS ─────────────────────────────────────────────────────────────────

function fmt(n) {
  return 'R ' + (n||0).toLocaleString('en-ZA', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
}
function todayStr() {
  return new Date().toISOString().slice(0,10);
}
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function statusPill(s) {
  const cls = (s||'').toLowerCase();
  return `<span class="status-pill ${cls}">${s||''}</span>`;
}

let toastTimer;
function showToast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + (type||'');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

// ── INIT ──────────────────────────────────────────────────────────────────

load();
updateSupplierList();
renderDashboard();
