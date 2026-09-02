(() => {
  function money(n) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(n || 0));
  }

  function getJobNumber() {
    const text = document.querySelector("#v73Label")?.textContent || "";
    const match = text.match(/\b[A-Z]{2,}(?:-\d+){2,}\b/i);
    return match ? match[0] : "";
  }

  function getPin() {
    return document.querySelector("#v73Pin")?.value?.trim() || "";
  }

  function setMsg(text, kind = "") {
    const msg = document.querySelector("#v73Msg");
    if (!msg) return;
    msg.textContent = text;
    msg.className = `v73-msg ${kind}`.trim();
  }

  async function callApi(url, body) {
    const pin = getPin();
    if (!pin) throw new Error("Enter the admin PIN first.");

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Imaginable-Admin-Pin": pin
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    if (!r.ok || !data.ok) {
      throw new Error(data.error || "Request failed.");
    }

    sessionStorage.setItem("imaginable_admin_pin", pin);
    return data;
  }

  function renderLink(data) {
    let box = document.querySelector("#v73SquareResult");
    if (!box) {
      box = document.createElement("div");
      box.id = "v73SquareResult";
      box.style.cssText =
        "margin-top:12px;padding:12px;border:1px solid #2a2e3c;border-radius:12px;background:rgba(255,255,255,.035)";
      document.querySelector(".v73-summary")?.after(box);
    }

    const live = data.environment === "production";
    const active = (data.status || "active") === "active";
    const typeLabel = data.payment_type === "deposit" ? "Deposit" : "Balance";

    box.innerHTML = `
      <div style="${live ? "padding:9px 10px;margin-bottom:10px;border-radius:10px;background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.45);color:#ff9a9a;font-weight:900;" : ""}">
        ${live ? "LIVE MODE - REAL MONEY" : "SANDBOX TEST MODE"}
      </div>
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
        <div style="font-weight:850">${active ? "Active Square Payment Link" : "Square Payment Link"}</div>
        <span style="font-size:.72rem;font-weight:850;padding:5px 8px;border-radius:999px;background:${active ? "rgba(86,213,139,.14)" : "rgba(255,255,255,.07)"};color:${active ? "#7ce6a8" : "#aeb3c2"}">
          ${active ? "ACTIVE" : "DEACTIVATED"}
        </span>
      </div>
      <div style="font-size:.85rem;opacity:.8;margin:7px 0 10px">
        ${typeLabel} · ${money(data.amount)}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${active && data.url ? `<a href="${data.url}" target="_blank" rel="noopener"
          style="display:inline-block;padding:9px 12px;border-radius:10px;text-decoration:none;font-weight:850;background:linear-gradient(120deg,#ff7a18,#ff3d81);color:white">
          ${live ? "Open LIVE Checkout" : "Open Test Checkout"}
        </a>` : ""}
        ${active && data.url ? `<button id="v73CopySquareLink" type="button"
          style="padding:9px 12px;border-radius:10px;border:1px solid #2a2e3c;background:transparent;color:white;font-weight:800;cursor:pointer">
          Copy Customer Link
        </button>` : ""}
        ${active && data.url ? `<button id="v73ShareSquareLink" type="button"
          style="padding:9px 12px;border-radius:10px;border:1px solid #2a2e3c;background:transparent;color:white;font-weight:800;cursor:pointer">
          Share
        </button>` : ""}
        ${active ? `<button id="v73DeactivateSquareLink" type="button"
          style="padding:9px 12px;border-radius:10px;border:1px solid rgba(255,80,80,.55);background:rgba(255,80,80,.09);color:#ff9a9a;font-weight:850;cursor:pointer">
          Deactivate Link
        </button>` : ""}
      </div>
    `;

    box.querySelector("#v73CopySquareLink")?.addEventListener("click", async e => {
      await navigator.clipboard.writeText(data.url);
      e.currentTarget.textContent = "Copied";
      setTimeout(() => (e.currentTarget.textContent = "Copy Customer Link"), 1200);
    });

    box.querySelector("#v73ShareSquareLink")?.addEventListener("click", async () => {
      const shareText =
        `Imaginable Things payment link for ${getJobNumber()} - ` +
        `${typeLabel} ${money(data.amount)}`;
      if (navigator.share) {
        await navigator.share({
          title: "Imaginable Things Payment",
          text: shareText,
          url: data.url
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${data.url}`);
        setMsg("Payment message and link copied.", "ok");
      }
    });

    box.querySelector("#v73DeactivateSquareLink")?.addEventListener("click", async e => {
      const jobNumber = getJobNumber();
      const approved = window.confirm(
        `DEACTIVATE SQUARE PAYMENT LINK\n\n` +
        `Job: ${jobNumber}\n` +
        `${typeLabel}: ${money(data.amount)}\n\n` +
        `The checkout link will stop working.\n\n` +
        `Press OK only if you want to deactivate this link.`
      );
      if (!approved) return;

      const button = e.currentTarget;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = "Deactivating...";

      try {
        await callApi("/api/deactivate-square-payment-link", {
          job_number: jobNumber
        });
        setMsg("Square payment link deactivated.", "ok");
        await loadSavedLink();
      } catch (err) {
        setMsg(err.message, "error");
        button.disabled = false;
        button.textContent = original;
      }
    });
  }

  async function loadSavedLink() {
    const jobNumber = getJobNumber();
    const oldBox = document.querySelector("#v73SquareResult");
    if (oldBox) oldBox.remove();
    if (!jobNumber) return;

    try {
      const r = await fetch(`/data/jobs.json?v=${Date.now()}`, {
        cache: "no-store"
      });
      if (!r.ok) return;
      const data = await r.json();
      const job = (data.jobs || []).find(
        j => String(j.job_number || "").trim() === jobNumber
      );
      if (!job?.square_payment_link_id) return;

      renderLink({
        payment_link_id: job.square_payment_link_id,
        url: job.square_payment_link_url || "",
        payment_type: job.square_payment_link_type || "balance",
        amount: Number(job.square_payment_link_amount || 0),
        status: job.square_payment_link_status || "active",
        environment: job.square_payment_link_environment || "production"
      });
    } catch (_) {}
  }

  async function createLink(type, button) {
    const jobNumber = getJobNumber();

    if (!jobNumber) {
      setMsg("Could not identify the job number.", "error");
      return;
    }

    if (!getPin()) {
      setMsg("Enter the admin PIN first.", "error");
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Checking...";

    try {
      const preview = await callApi("/api/create-square-payment-link", {
        job_number: jobNumber,
        payment_type: type,
        preview_only: true
      });

      const label = type === "deposit" ? "DEPOSIT" : "BALANCE";

      if (preview.environment === "production") {
        const approved = window.confirm(
          `LIVE PAYMENT - REAL MONEY\n\n` +
          `Job: ${jobNumber}\n` +
          `${label}: ${money(preview.amount)}\n\n` +
          `This will create a REAL Square payment link that can charge a customer.\n\n` +
          `Press OK only if the job number and amount are correct.`
        );

        if (!approved) {
          setMsg("LIVE payment link creation cancelled.");
          return;
        }
      }

      button.textContent = "Creating...";

      const data = await callApi("/api/create-square-payment-link", {
        job_number: jobNumber,
        payment_type: type,
        live_confirmed: preview.environment === "production"
      });

      renderLink({ ...data, status: "active" });

      if (data.tracking_saved === false) {
        setMsg(
          data.tracking_warning || "Square link created, but tracking was not saved.",
          "error"
        );
      } else {
        setMsg(
          data.environment === "production"
            ? "Square LIVE payment link created and saved to this Job."
            : "Square test payment link created and saved to this Job.",
          "ok"
        );
      }
    } catch (e) {
      setMsg(e.message, "error");
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

    const modal = document.querySelector(".v73-modal");
    if (modal) {
      new MutationObserver(() => {
        if (modal.classList.contains("open")) {
          setTimeout(loadSavedLink, 50);
        }
      }).observe(modal, { attributes: true, attributeFilter: ["class"] });
    }

    return true;
  }

  if (!install()) {
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();
