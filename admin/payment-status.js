(() => {
  const money = n => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(Number(n || 0));
  const label = status => ({
    'unpaid':'Unpaid',
    'deposit-due':'Deposit Due',
    'partially-paid':'Partially Paid',
    'paid':'Paid in Full',
    'refunded':'Refunded'
  }[status] || 'Unpaid');

  async function loadJobs() {
    const r = await fetch(`../data/jobs.json?v=${Date.now()}`, {cache:'no-store'});
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data.jobs) ? data.jobs : [];
  }

  function wire(jobs) {
    document.querySelectorAll('#jobs .card').forEach(card => {
      if (card.querySelector('[data-v73b-payment]')) return;
      const jobNo = card.querySelector('.jobno')?.textContent?.trim();
      const job = jobs.find(j => String(j.job_number || '').trim() === jobNo);
      if (!job) return;

      const total = Number(job.order_total ?? job.total ?? 0);
      const paid = Number(job.deposit_paid ?? 0);
      const balance = Number(job.balance_due ?? Math.max(0, total - paid));
      const status = String(job.payment_status || (paid >= total && total > 0 ? 'paid' : 'unpaid'));

      const box = document.createElement('section');
      box.className = 'v73b-payment';
      box.dataset.v73bPayment = '1';
      box.innerHTML = `
        <div class="v73b-top">
          <span class="v73b-title">Payment</span>
          <span class="v73b-badge ${status}">${label(status)}</span>
        </div>
        <div class="v73b-money">
          <div><span>Total</span><strong>${money(total)}</strong></div>
          <div><span>Paid</span><strong>${money(paid)}</strong></div>
          <div><span>Balance</span><strong>${money(balance)}</strong></div>
        </div>`;
      const actions = card.querySelector('.actions');
      if (actions) card.insertBefore(box, actions);
      else card.appendChild(box);
    });
  }

  loadJobs().then(jobs => {
    wire(jobs);
    const host = document.getElementById('jobs');
    if (host) new MutationObserver(() => wire(jobs)).observe(host, {childList:true});
  }).catch(() => {});
})();
