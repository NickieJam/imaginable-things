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

  async function callSquare(jobNumber, type, pin, extra = {}) {
    const r = await fetch("/api/create-square-payment-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Imaginable-Admin-Pin": pin
      },
      body: JSON.stringify({
        job_number: jobNumber,
        payment_type: type,
        ...extra
      })
    });

    const data = await r.json();
    if (!r.ok || !data.ok) {
      throw new Error(data.error || "Could not create payment link.");
    }
    return data;
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
    button.textContent = "Checking...";

    try {
      const preview = await callSquare(jobNumber, type, pin, {
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
          if (msg) {
            msg.textContent = "LIVE payment link creation cancelled.";
            msg.className = "v73-msg";
          }
          return;
        }
      }

      button.textContent = "Creating...";

      const data = await callSquare(jobNumber, type, pin, {
        live_confirmed: preview.environment === "production"
      });

      sessionStorage.setItem("imaginable_admin_pin", pin);

      let box = document.querySelector("#v73SquareResult");
      if (!box) {
        box = document.createElement("div");
        box.id = "v73SquareResult";
        box.style.cssText =
          "margin-top:12px;padding:12px;border:1px solid #2a2e3c;border-radius:12px;background:rgba(255,255,255,.035)";
        document.querySelector(".v73-summary")?.after(box);
      }

      const live = data.environment === "production";

      box.innerHTML = `
        <div style="${live ? "padding:9px 10px;margin-bottom:10px;border-radius:10px;background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.45);color:#ff9a9a;font-weight:900;" : ""}">
          ${live ? "LIVE MODE - REAL MONEY" : "SANDBOX TEST MODE"}
        </div>
        <div style="font-weight:850;margin-bottom:5px">
          ${live ? "Square LIVE Payment Link" : "Square Sandbox Payment Link"}
        </div>
        <div style="font-size:.85rem;opacity:.8;margin-bottom:9px">
          ${type === "deposit" ? "Deposit" : "Balance"} · ${money(data.amount)}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a href="${data.url}" target="_blank" rel="noopener"
             style="display:inline-block;padding:9px 12px;border-radius:10px;text-decoration:none;font-weight:850;background:linear-gradient(120deg,#ff7a18,#ff3d81);color:white">
            ${live ? "Open LIVE Checkout" : "Open Test Checkout"}
          </a>
          <button id="v73CopySquareLink" type="button"
             style="padding:9px 12px;border-radius:10px;border:1px solid #2a2e3c;background:transparent;color:white;font-weight:800;cursor:pointer">
            Copy Customer Link
          </button>
          <button id="v73ShareSquareLink" type="button"
             style="padding:9px 12px;border-radius:10px;border:1px solid #2a2e3c;background:transparent;color:white;font-weight:800;cursor:pointer">
            Share
          </button>
        </div>
      `;

      box.querySelector("#v73CopySquareLink")?.addEventListener("click", async e => {
        await navigator.clipboard.writeText(data.url);
        e.currentTarget.textContent = "Copied";
        setTimeout(() => (e.currentTarget.textContent = "Copy Customer Link"), 1200);
      });

      box.querySelector("#v73ShareSquareLink")?.addEventListener("click", async () => {
        const shareText =
          `Imaginable Things payment link for ${jobNumber} - ` +
          `${type === "deposit" ? "Deposit" : "Balance"} ${money(data.amount)}`;

        if (navigator.share) {
          await navigator.share({
            title: "Imaginable Things Payment",
            text: shareText,
            url: data.url
          });
        } else {
          await navigator.clipboard.writeText(`${shareText}\n${data.url}`);
          if (msg) {
            msg.textContent = "Payment message and link copied.";
            msg.className = "v73-msg ok";
          }
        }
      });

      if (msg) {
        msg.textContent = live
          ? "Square LIVE payment link created. Verify the amount before sending it to the customer."
          : "Square test payment link created.";
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
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();
