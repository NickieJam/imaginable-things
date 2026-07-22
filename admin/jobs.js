(() => {
  const labels = {
    all: "All active", quote: "Quote", approved: "Approved",
    "waiting-materials": "Waiting materials", production: "In production",
    "quality-check": "Quality check", ready: "Ready", delivered: "Delivered", cancelled: "Cancelled"
  };
  let jobs = [];
  const money = (value) => value === undefined || value === null || value === "" ? "—" : new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(Number(value));
  const date = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "Not set";
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  function render(filter="all") {
    document.querySelectorAll(".filter").forEach((b) => b.classList.toggle("active", b.dataset.filter === filter));
    const active = jobs.filter((j) => j.visible !== false && !["delivered","cancelled"].includes(j.status));
    const list = filter === "all" ? active : active.filter((j) => j.status === filter);
    const root = document.getElementById("jobs");
    if (!list.length) { root.innerHTML = '<div class="empty">No jobs in this stage.</div>'; return; }
    root.innerHTML = list.sort((a,b) => String(a.due_date||"9999").localeCompare(String(b.due_date||"9999"))).map((j) => `
      <article class="card">
        <div class="card-head"><div><span class="jobno">${esc(j.job_number || "Job")}</span><h3>${esc(j.client)}</h3><span class="company">${esc(j.company || j.product || "")}</span></div><span class="badge">${esc(labels[j.status] || j.status || "New")}</span></div>
        <div class="meta"><div><span>Product</span><strong>${esc(j.product || "—")}</strong></div><div><span>Quantity</span><strong>${esc(j.quantity || "—")}</strong></div><div><span>Technique</span><strong>${esc(j.technique || "—")}</strong></div><div><span>Due date</span><strong>${date(j.due_date)}</strong></div><div><span>Priority</span><strong>${esc(j.priority || "normal")}</strong></div><div><span>Balance due</span><strong>${money(j.balance_due)}</strong></div></div>
        ${j.notes ? `<p class="notes">${esc(j.notes)}</p>` : ""}
        <div class="actions"><a class="button" href="https://app.pagescms.org" rel="noopener">Manage job</a></div>
      </article>`).join("");
  }
  async function load() {
    try {
      const response = await fetch("../data/jobs.json", { cache:"no-store" });
      if (!response.ok) throw new Error("Could not load jobs");
      jobs = (await response.json()).jobs || [];
      const statuses = ["all", ...new Set(jobs.filter((j)=>j.visible!==false && !["delivered","cancelled"].includes(j.status)).map((j)=>j.status).filter(Boolean))];
      document.getElementById("filters").innerHTML = statuses.map((status) => `<button class="filter${status === "all" ? " active" : ""}" data-filter="${esc(status)}">${esc(labels[status] || status)}</button>`).join("");
      document.getElementById("filters").addEventListener("click", (event) => { const button=event.target.closest("button[data-filter]"); if(button) render(button.dataset.filter); });
      render();
    } catch (error) { document.getElementById("jobs").innerHTML = '<div class="empty">Could not load Job Tracker data.</div>'; console.error(error); }
  }
  load();
})();
