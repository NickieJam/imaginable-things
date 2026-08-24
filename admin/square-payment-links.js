(() => {
  function money(n) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(n || 0));
  }

  function getJobNumber() {
    const text = document.querySelector("#v73Label")?.textContent || "";
    const match = text.match(/[A-Z]+-\d{4}-\d+/i);
    return match ? match[0] : "";
  }

  async function createLink(type, button) {
    const jobNumber = getJobNumber();
    const pin = document.querySelector("#v73Pin")?.value?.trim() || "";
    const msg = document.querySelector("#v73Msg");

    if (!jobNumber) {
      if (msg) {
        msg.textContent = "Could not identify the job number.";
        msg.className = "v73-msg error";
      }
      return;
    }

    if (!pin) {
      if (msg) {
        msg.textContent = "Enter the admin PIN first.";
        msg.className = "v73-msg error";
      }
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Creating…";

    try {
      const r = await fetch("/api/create-square-payment-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Imaginable-Admin-Pin": pin
        },
        body: JSON.stringify({
          job_number: jobNumber,
          payment_type: type
        })
      });

      const data = await r.json();
      if (!r.ok || !data.ok) {
        throw new Error(data.error || "Could not create payment link.");
      }

      sessionStorage.setItem("imaginable_admin_pin", pin);

      let box = document.querySelector("#v73SquareResult");
      if (!box) {
        box = document.createElement("div");
        box.id = "v73SquareResult";
        box.style.cssText =
          "margin-top:12px;padding:12px;border:1px solid #2a2e3c;border-radius:12px;background:rgba(255,255,255,.035)";
        document.querySelector(".v73-summary")?.after(box);
      }

      box.innerHTML = `
        <div style="font-weight:850;margin-bottom:5px">Square Sandbox Payment Link</div>
        <div style="font-size:.85rem;opacity:.8;margin-bottom:9px">
          ${type === "deposit" ? "Deposit" : "Balance"} · ${money(data.amount)}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a href="${data.url}" target="_blank" rel="noopener"
             style="display:inline-block;padding:9px 12px;border-radius:10px;text-decoration:none;font-weight:850;background:linear-gradient(120deg,#ff7a18,#ff3d81);color:white">
            Open Test Checkout
          </a>
          <button id="v73CopySquareLink" type="button"
             style="padding:9px 12px;border-radius:10px;border:1px solid #2a2e3c;background:transparent;color:white;font-weight:800;cursor:pointer">
            Copy Link
          </button>
        </div>
      `;

      box.querySelector("#v73CopySquareLink")?.addEventListener("click", async e => {
        await navigator.clipboard.writeText(data.url);
        e.currentTarget.textContent = "Copied";
        setTimeout(() => (e.currentTarget.textContent = "Copy Link"), 1200);
      });

      if (msg) {
        msg.textContent = "Square test payment link created.";
        msg.className = "v73-msg ok";
      }
    } catch (e) {
      if (msg) {
        msg.textContent = e.message;
        msg.className = "v73-msg error";
      }
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function install() {
    const actions = document.querySelector(".v73-actions");
    if (!actions || document.querySelector("#v73SquareActions")) return false;

    const row = document.createElement("div");
    row.id = "v73SquareActions";
    row.style.cssText =
      "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px";

    const deposit = document.createElement("button");
    deposit.type = "button";
    deposit.textContent = "Create Deposit Link";
    deposit.style.cssText =
      "padding:10px;border-radius:10px;border:1px solid #2a2e3c;background:transparent;color:white;font-weight:800;cursor:pointer";

    const balance = document.createElement("button");
    balance.type = "button";
    balance.textContent = "Create Balance Link";
    balance.style.cssText = deposit.style.cssText;

    deposit.addEventListener("click", () => createLink("deposit", deposit));
    balance.addEventListener("click", () => createLink("balance", balance));

    row.append(deposit, balance);
    actions.before(row);
    return true;
  }

  if (!install()) {
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
