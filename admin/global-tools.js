(() => {
  const DATASETS = [
    { type: 'Lead', url: '../data/leads.json', page: 'leads.html', keys: ['leads','items','data'] },
    { type: 'Job', url: '../data/jobs.json', page: 'jobs.html', keys: ['jobs','items','data'] },
    { type: 'Customer', url: '../data/customers.json', page: 'customers.html', keys: ['customers','items','data'] }
  ];

  const tools = document.createElement('div');
  tools.className = 'os-global-tools';
  tools.innerHTML = `
    <button class="os-tool-btn" id="osSearchBtn" type="button">⌕ Search</button>
    <button class="os-tool-btn primary" id="osQuickBtn" type="button">＋ Quick Add</button>`;
  document.body.appendChild(tools);

  const searchPanel = document.createElement('div');
  searchPanel.className = 'os-search-panel';
  searchPanel.innerHTML = `
    <section class="os-modal" role="dialog" aria-modal="true" aria-label="Global search">
      <div class="os-modal-head">
        <input id="osSearchInput" type="search" placeholder="Search leads, jobs or customers…" autocomplete="off">
        <button class="os-close" type="button">Close</button>
      </div>
      <p class="os-helper">Search by name, company, phone, email, product, job number or lead number.</p>
      <div class="os-results" id="osResults"><div class="os-helper">Start typing to search.</div></div>
    </section>`;
  document.body.appendChild(searchPanel);

  const quickPanel = document.createElement('div');
  quickPanel.className = 'os-quick-panel';
  quickPanel.innerHTML = `
    <section class="os-modal" role="dialog" aria-modal="true" aria-label="Quick actions">
      <div class="os-modal-head">
        <div style="flex:1"><small style="color:#ffc28e;font-weight:850;letter-spacing:.12em;text-transform:uppercase">Quick Actions</small>
        <h2 style="margin:4px 0 0">Create or update content</h2></div>
        <button class="os-close" type="button">Close</button>
      </div>
      <div class="os-quick-grid">
        <a class="os-quick" href="https://app.pagescms.org" target="_blank" rel="noopener">📥 New Lead<br><small>Open Content Manager</small></a>
        <a class="os-quick" href="https://app.pagescms.org" target="_blank" rel="noopener">📋 New Job<br><small>Open Content Manager</small></a>
        <a class="os-quick" href="https://app.pagescms.org" target="_blank" rel="noopener">👥 New Customer<br><small>Open Content Manager</small></a>
        <a class="os-quick" href="https://app.pagescms.org" target="_blank" rel="noopener">📸 New Portfolio Project<br><small>Open Content Manager</small></a>
        <a class="os-quick" href="https://app.pagescms.org" target="_blank" rel="noopener">⭐ Add Testimonial<br><small>Open Content Manager</small></a>
        <a class="os-quick" href="https://app.pagescms.org" target="_blank" rel="noopener">⚙ Business Settings<br><small>Open Content Manager</small></a>
      </div>
    </section>`;
  document.body.appendChild(quickPanel);

  const input = document.getElementById('osSearchInput');
  const results = document.getElementById('osResults');

  const closePanel = panel => panel.classList.remove('open');
  searchPanel.querySelector('.os-close').onclick = () => closePanel(searchPanel);
  quickPanel.querySelector('.os-close').onclick = () => closePanel(quickPanel);
  searchPanel.addEventListener('click', e => { if (e.target === searchPanel) closePanel(searchPanel); });
  quickPanel.addEventListener('click', e => { if (e.target === quickPanel) closePanel(quickPanel); });

  document.getElementById('osSearchBtn').onclick = () => {
    searchPanel.classList.add('open');
    setTimeout(() => input.focus(), 30);
  };
  document.getElementById('osQuickBtn').onclick = () => quickPanel.classList.add('open');

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePanel(searchPanel); closePanel(quickPanel); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchPanel.classList.add('open');
      setTimeout(() => input.focus(), 30);
    }
  });

  let index = [];
  const getArray = (obj, keys) => {
    if (Array.isArray(obj)) return obj;
    for (const key of keys) if (Array.isArray(obj?.[key])) return obj[key];
    for (const value of Object.values(obj || {})) if (Array.isArray(value)) return value;
    return [];
  };
  const textOf = obj => Object.entries(obj || {})
    .filter(([,v]) => ['string','number','boolean'].includes(typeof v))
    .map(([k,v]) => `${k}: ${v}`).join(' | ');

  Promise.all(DATASETS.map(async ds => {
    try {
      const res = await fetch(`${ds.url}?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      return getArray(data, ds.keys).map(item => ({
        type: ds.type, page: ds.page, item, haystack: textOf(item).toLowerCase()
      }));
    } catch { return []; }
  })).then(parts => { index = parts.flat(); });

  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const titleFor = r => r.item.name || r.item.customer || r.item.client || r.item.company ||
    r.item.job_number || r.item.lead_number || `${r.type} record`;
  const detailFor = r => r.item.product || r.item.service || r.item.email || r.item.phone ||
    r.item.status || 'Open module';

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '<div class="os-helper">Start typing to search.</div>';
      return;
    }
    const found = index.filter(r => r.haystack.includes(q)).slice(0, 20);
    results.innerHTML = found.length ? found.map(r => `
      <a class="os-result" href="${r.page}">
        <small>${r.type}</small>
        <strong>${esc(titleFor(r))}</strong>
        <span>${esc(String(detailFor(r)))}</span>
      </a>`).join('') :
      '<div class="os-helper">No matching records found.</div>';
  });
})();
