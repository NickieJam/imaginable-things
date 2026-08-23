(() => {
  let leads = [];
  let current = null;

  const modal = document.createElement("div");
  modal.className = "v72c-modal";
  modal.innerHTML = `
    <section class="v72c-card" role="dialog" aria-modal="true" aria-label="Manage lead">
      <h2>Manage Lead</h2>
      <p id="v72cLeadLabel">Update status and next follow-up.</p>
      <div class="v72c-field">
        <label for="v72cStatus">Lead status</label>
        <select id="v72cStatus">
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="waiting">Waiting</option>
          <option value="quoted">Quote sent</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>
      <div class="v72c-field">
        <label for="v72cFollow">Next follow-up</label>
        <input id="v72cFollow" type="date">
      </div>
      <div class="v72c-field">
        <label for="v72cPin">Admin PIN</label>
        <input id="v72cPin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Enter your admin PIN">
      </div>
      <p class="v72c-message" id="v72cMessage"></p>
      <div class="v72c-actions">
        <button type="button" id="v72cCancel">Cancel</button>
        <button type="button" class="save" id="v72cSave">Save Changes</button>
      </div>
    </section>`;
  document.body.appendChild(modal);

  const statusEl = modal.querySelector("#v72cStatus");
  const followEl = modal.querySelector("#v72cFollow");
  const pinEl = modal.querySelector("#v72cPin");
  const msgEl = modal.querySelector("#v72cMessage");
  const saveBtn = modal.querySelector("#v72cSave");

  function close() {
    modal.classList.remove("open");
    msgEl.textContent = "";
    msgEl.className = "v72c-message";
  }

  modal.querySelector("#v72cCancel").onclick = close;
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  async function loadLeads() {
    const r = await fetch(`../data/leads.json?v=${Date.now()}`, { cache: "no-store" });
    const data = await r.json();
    leads = Array.isArray(data.leads) ? data.leads : [];
  }

  async function openFor(index) {
    if (!leads.length) await loadLeads();
    current = leads[index];
    if (!current) return;
    modal.querySelector("#v72cLeadLabel").textContent =
      `${current.name || "Lead"} · ${current.lead_number || ""}`;
    statusEl.value = current.status || "new";
    followEl.value = current.next_follow_up || "";
    pinEl.value = sessionStorage.getItem("imaginable_admin_pin") || "";
    modal.classList.add("open");
    setTimeout(() => statusEl.focus(), 40);
  }

  async function save() {
    if (!current) return;
    const pin = pinEl.value.trim();
    if (!pin) {
      msgEl.textContent = "Enter the admin PIN.";
      msgEl.className = "v72c-message error";
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    msgEl.textContent = "Saving securely to GitHub…";
    msgEl.className = "v72c-message";

    try {
      const r = await fetch("/api/update-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Imaginable-Admin-Pin": pin
        },
        body: JSON.stringify({
          lead_number: current.lead_number,
          status: statusEl.value,
          next_follow_up: followEl.value
        })
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Save failed.");

      sessionStorage.setItem("imaginable_admin_pin", pin);
      msgEl.textContent = "Saved. Vercel will refresh after the GitHub update.";
      msgEl.className = "v72c-message ok";
      current.status = statusEl.value;
      current.next_follow_up = followEl.value;
      setTimeout(() => location.reload(), 1400);
    } catch (err) {
      msgEl.textContent = err.message || "Could not save.";
      msgEl.className = "v72c-message error";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  }

  saveBtn.onclick = save;

  // Replace existing Pages CMS "Manage lead" links with in-app management buttons.
  const wire = async () => {
    try { await loadLeads(); } catch {}
    const cards = [...document.querySelectorAll("#leads .card")];
    cards.forEach((card, visibleIndex) => {
      const leadNumber = card.querySelector(".leadno")?.textContent?.trim();
      const index = leads.findIndex(x => String(x.lead_number || "") === leadNumber);
      const old = [...card.querySelectorAll("a.button.secondary")]
        .find(a => /manage lead/i.test(a.textContent || ""));
      if (old && index >= 0) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = old.className;
        btn.textContent = "Manage Lead";
        btn.addEventListener("click", () => openFor(index));
        old.replaceWith(btn);
      }
    });
  };

  new MutationObserver(wire).observe(document.getElementById("leads"), { childList: true });
  wire();
})();
