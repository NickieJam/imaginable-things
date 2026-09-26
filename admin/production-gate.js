(() => {
  let jobs = [];
  let timer = null;

  const norm = (v) => String(v ?? "").trim();

  function isApproved(job) {
    const a = job?.approval;
    return Boolean(a && a.status === "approved" && a.record_id && a.approved_at);
  }

  function gateMarkup(job) {
    const approved = isApproved(job);
    const isProduction = job.status === "production";

    if (isProduction && !approved) {
      return `
        <div class="production-gate violation">
          <strong>⚠ PRODUCTION BLOCKED — APPROVAL MISSING</strong>
          <small>This Job is marked In Production but the current final proof is not customer-approved.</small>
        </div>`;
    }

    if (approved) {
      const version = job.approval?.proof_version || "—";
      return `
        <div class="production-gate cleared">
          <strong>✓ CLEARED FOR PRODUCTION</strong>
          <small>Customer-approved proof v${version}. Production may begin.</small>
        </div>`;
    }

    return `
      <div class="production-gate blocked">
        <strong>🔒 NOT CLEARED FOR PRODUCTION</strong>
        <small>Create and receive Final Proof Approval before starting production.</small>
      </div>`;
  }

  async function startProduction(job, button) {
    if (!isApproved(job)) {
      window.alert("Production is blocked until the customer approves the current final proof.");
      return;
    }

    if (!window.confirm(`Start production for ${job.job_number} using the approved proof?`)) return;

    const pin = window.prompt("Enter Admin PIN to start production:");
    if (!pin) return;

    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Starting…";

    try {
      const response = await fetch("/api/start-production", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ pin, job_number:job.job_number })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not start production.");

      await loadJobs();
      enhance();
      window.dispatchEvent(new CustomEvent("imaginable:jobs-changed"));
      window.alert(`${job.job_number} is now In Production.`);
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function enhance() {
    document.querySelectorAll("#jobs .card").forEach((card) => {
      const jobNo = norm(card.querySelector(".jobno")?.textContent);
      if (!jobNo) return;

      const job = jobs.find((item) => norm(item.job_number) === jobNo);
      if (!job) return;

      card.querySelector(".production-gate")?.remove();
      const actions = card.querySelector(".actions");
      if (!actions) return;

      actions.insertAdjacentHTML("beforebegin", gateMarkup(job));

      const old = actions.querySelector("[data-production-job]");
      if (old) old.remove();

      if (job.status !== "production" && !["delivered","cancelled"].includes(job.status)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button production-start";
        button.dataset.productionJob = jobNo;

        if (isApproved(job)) {
          button.textContent = "Start Production";
          button.addEventListener("click", () => startProduction(job, button));
        } else {
          button.textContent = "Approval Required";
          button.disabled = true;
          button.title = "Customer Final Proof Approval is required before production.";
        }

        actions.appendChild(button);
      }
    });
  }

  async function loadJobs() {
    try {
      const response = await fetch("../data/jobs.json", { cache:"no-store" });
      if (!response.ok) throw new Error("Could not load jobs");
      jobs = (await response.json()).jobs || [];
    } catch (error) {
      console.error("Production Gate:", error);
      jobs = [];
    }
  }

  async function init() {
    await loadJobs();
    enhance();

    window.addEventListener("imaginable:jobs-changed", async () => {
      await loadJobs();
      enhance();
    });

    const root = document.getElementById("jobs");
    if (root) {
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(enhance, 50);
      });
      observer.observe(root, { childList:true, subtree:true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
