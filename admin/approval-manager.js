(() => {
  const STORAGE_PREFIX = "imaginable_approval_link_";
  const ALLOWED_TYPES = new Set(["image/png","image/jpeg","image/webp","application/pdf"]);
  const MAX_BYTES = 25 * 1024 * 1024;

  let jobs = [];
  let activeJob = null;
  let observerTimer = null;

  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[c]));
  const norm = (v) => String(v ?? "").trim();

  function ensureModal() {
    if (document.getElementById("approvalManagerModal")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div class="approval-modal" id="approvalManagerModal" hidden>
        <div class="approval-modal-backdrop" data-approval-close></div>
        <section class="approval-modal-card" role="dialog" aria-modal="true" aria-labelledby="approvalManagerTitle">
          <div class="approval-modal-head">
            <div><p>CUSTOMER APPROVAL</p><h2 id="approvalManagerTitle">Final Proof Approval</h2></div>
            <button class="approval-close" type="button" data-approval-close aria-label="Close">×</button>
          </div>

          <div class="approval-manager-status" id="approvalManagerStatus"></div>

          <div class="approval-fields">
            <label>
              <span>Approval recipient *</span>
              <input id="approvalRecipient" type="text">
            </label>
            <label>
              <span>Proof version *</span>
              <input id="approvalVersion" type="text" placeholder="Example: 1 or 3">
            </label>
          </div>

          <label class="approval-full-field">
            <span>Final proof file *</span>
            <input id="approvalProofFile" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf">
            <p class="approval-help" id="approvalProofHelp">
              Choose the final PNG, JPG, WebP or PDF. Maximum 25 MB.
            </p>
          </label>

          <label class="approval-full-field">
            <span>Customer-facing proof / order notes *</span>
            <textarea id="approvalSummary" placeholder="Example: 12 black polos, left chest embroidery, white thread, approved logo placement..."></textarea>
          </label>

          <label class="approval-full-field">
            <span>Admin PIN *</span>
            <input id="approvalPin" type="password" inputmode="numeric" autocomplete="off">
          </label>

          <div id="approvalManagerError" class="approval-manager-error" hidden></div>

          <div id="approvalLinkBox" class="approval-link-box" hidden>
            <strong>Secure customer link</strong>
            <code id="approvalLinkText"></code>
          </div>

          <div class="approval-actions">
            <button class="button" id="approvalCreate" type="button">Create Approval Link</button>
            <button class="button secondary" id="approvalCopy" type="button" hidden>Copy Link</button>
            <button class="button secondary" id="approvalOpen" type="button" hidden>Open Page</button>
          </div>
        </section>
      </div>
    `);

    document.querySelectorAll("[data-approval-close]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });
    document.getElementById("approvalCreate").addEventListener("click", createLink);
    document.getElementById("approvalCopy").addEventListener("click", copyCurrentLink);
    document.getElementById("approvalOpen").addEventListener("click", openCurrentLink);
  }

  function closeModal() {
    const modal = document.getElementById("approvalManagerModal");
    if (modal) modal.hidden = true;
    activeJob = null;
  }

  function approvalFor(job) {
    return job && job.approval && typeof job.approval === "object" ? job.approval : null;
  }

  function localLinkFor(job) {
    const approval = approvalFor(job);
    if (!approval?.record_id) return "";
    try { return localStorage.getItem(STORAGE_PREFIX + approval.record_id) || ""; }
    catch { return ""; }
  }

  function storeLink(recordId, link) {
    try { localStorage.setItem(STORAGE_PREFIX + recordId, link); } catch {}
  }

  function statusText(job) {
    const a = approvalFor(job);
    if (!a) return "No customer proof approval has been created for this job.";
    if (a.status === "approved") {
      const when = a.approved_at ? new Date(a.approved_at).toLocaleString() : "Recorded";
      return `<strong>✓ CUSTOMER APPROVED</strong><br>Proof v${esc(a.proof_version || "—")} · ${esc(when)} · Record ${esc(a.record_id || "—")}`;
    }
    return `<strong>AWAITING CUSTOMER APPROVAL</strong><br>Proof v${esc(a.proof_version || "—")} · Request created ${esc(a.created_at ? new Date(a.created_at).toLocaleString() : "—")}`;
  }

  function showLink(link) {
    const box = document.getElementById("approvalLinkBox");
    const text = document.getElementById("approvalLinkText");
    const copy = document.getElementById("approvalCopy");
    const open = document.getElementById("approvalOpen");

    if (link) {
      box.hidden = false;
      text.textContent = link;
      copy.hidden = false;
      open.hidden = false;
    } else {
      box.hidden = true;
      text.textContent = "";
      copy.hidden = true;
      open.hidden = true;
    }
  }

  function existingProofLabel(a) {
    if (!a) return "Choose the final PNG, JPG, WebP or PDF. Maximum 25 MB.";
    if (a.proof_filename) {
      return `Current proof: ${a.proof_filename}. Choose a new file only if you want to replace/revise the proof.`;
    }
    if (a.proof_url) {
      return "This older approval uses a URL-based proof. Choose a file to move it into secure proof storage.";
    }
    return "Choose the final PNG, JPG, WebP or PDF. Maximum 25 MB.";
  }

  function openModal(jobNumber) {
    activeJob = jobs.find((j) => norm(j.job_number) === norm(jobNumber));
    if (!activeJob) return;
    ensureModal();

    const a = approvalFor(activeJob);
    document.getElementById("approvalManagerTitle").textContent = `Final Proof Approval · ${norm(activeJob.job_number)}`;
    document.getElementById("approvalManagerStatus").innerHTML = statusText(activeJob);
    document.getElementById("approvalRecipient").value = a?.recipient_name || activeJob.client || "";
    document.getElementById("approvalVersion").value = a?.proof_version || "1";
    document.getElementById("approvalProofFile").value = "";
    document.getElementById("approvalProofHelp").textContent = existingProofLabel(a);
    document.getElementById("approvalSummary").value = a?.summary || [
      activeJob.product ? `Product: ${activeJob.product}` : "",
      activeJob.quantity ? `Quantity: ${activeJob.quantity}` : "",
      activeJob.technique ? `Technique: ${activeJob.technique}` : "",
      activeJob.notes ? `Notes: ${activeJob.notes}` : ""
    ].filter(Boolean).join("\n");
    document.getElementById("approvalPin").value = "";
    document.getElementById("approvalManagerError").hidden = true;

    const button = document.getElementById("approvalCreate");
    button.textContent = a
      ? (a.status === "approved" ? "Create Revised Proof Link" : "Replace Approval Link")
      : "Create Approval Link";

    showLink(a?.status === "pending" ? localLinkFor(activeJob) : "");
    document.getElementById("approvalManagerModal").hidden = false;
  }

  function contentTypeFor(file) {
    if (file.type) return file.type.toLowerCase();
    const ext = String(file.name || "").split(".").pop().toLowerCase();
    return ({
      png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", webp:"image/webp", pdf:"application/pdf"
    })[ext] || "";
  }

  async function uploadProof(file, pin, jobNumber, button) {
    const contentType = contentTypeFor(file);

    if (!ALLOWED_TYPES.has(contentType)) {
      throw new Error("Use PNG, JPG/JPEG, WebP or PDF for the final proof.");
    }
    if (file.size > MAX_BYTES) {
      throw new Error("Proof files must be 25 MB or smaller.");
    }

    button.textContent = "Preparing secure upload…";

    const prepare = await fetch("/api/create-proof-upload", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        pin,
        job_number:jobNumber,
        filename:file.name,
        content_type:contentType,
        size:file.size
      })
    });

    const prepared = await prepare.json().catch(() => ({}));
    if (!prepare.ok) throw new Error(prepared.error || "Could not prepare proof upload.");

    button.textContent = "Uploading proof…";

    const upload = await fetch(prepared.upload_url, {
      method:"PUT",
      headers:{ "Content-Type":contentType },
      body:file
    });

    if (!upload.ok) {
      const detail = await upload.text().catch(() => "");
      throw new Error(detail || "The proof file could not be uploaded.");
    }

    return {
      proof_pathname:prepared.pathname,
      proof_filename:file.name,
      proof_content_type:contentType
    };
  }

  async function createLink() {
    if (!activeJob) return;

    const errorBox = document.getElementById("approvalManagerError");
    errorBox.hidden = true;

    const recipient_name = document.getElementById("approvalRecipient").value.trim();
    const proof_version = document.getElementById("approvalVersion").value.trim();
    const summary = document.getElementById("approvalSummary").value.trim();
    const pin = document.getElementById("approvalPin").value.trim();
    const file = document.getElementById("approvalProofFile").files?.[0] || null;

    if (!recipient_name || !proof_version || !summary || !pin) {
      errorBox.textContent = "Recipient, proof version, notes and Admin PIN are required.";
      errorBox.hidden = false;
      return;
    }

    const existing = approvalFor(activeJob);
    const hasReusableProof = Boolean(existing?.proof_pathname || existing?.proof_url);

    if (!file && !hasReusableProof) {
      errorBox.textContent = "Choose the final proof file before creating the approval link.";
      errorBox.hidden = false;
      return;
    }

    const warning = existing
      ? (existing.status === "approved"
          ? "This job already has a customer-approved proof. Creating a revised proof request will preserve the previous approval in history and BLOCK production until the new proof is approved. Continue?"
          : "This will replace the current pending approval link. The old customer link will stop working. Continue?")
      : "";

    if (warning && !window.confirm(warning)) return;

    const button = document.getElementById("approvalCreate");
    button.disabled = true;

    try {
      let proofPayload = {};

      if (file) {
        proofPayload = await uploadProof(file, pin, norm(activeJob.job_number), button);
      } else if (existing?.proof_pathname) {
        proofPayload = {
          proof_pathname:existing.proof_pathname,
          proof_filename:existing.proof_filename || "proof",
          proof_content_type:existing.proof_content_type || ""
        };
      } else {
        proofPayload = { proof_url:existing?.proof_url || "" };
      }

      button.textContent = "Creating approval…";

      const response = await fetch("/api/create-job-approval", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          pin,
          job_number:norm(activeJob.job_number),
          recipient_name,
          proof_version,
          summary,
          replace_current:Boolean(existing),
          ...proofPayload
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Approval link could not be created.");

      storeLink(data.record_id, data.approval_url);
      showLink(data.approval_url);

      await loadJobs();
      activeJob = jobs.find((j) => norm(j.job_number) === norm(data.job_number));
      document.getElementById("approvalManagerStatus").innerHTML = statusText(activeJob);
      document.getElementById("approvalProofFile").value = "";
      document.getElementById("approvalProofHelp").textContent = existingProofLabel(approvalFor(activeJob));
      document.getElementById("approvalPin").value = "";
      button.textContent = "Replace Approval Link";
      enhanceCards();
      window.dispatchEvent(new CustomEvent("imaginable:jobs-changed"));
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    } finally {
      button.disabled = false;
      if (button.textContent.includes("…")) {
        button.textContent = existing ? "Replace Approval Link" : "Create Approval Link";
      }
    }
  }

  async function copyCurrentLink() {
    const link = document.getElementById("approvalLinkText").textContent.trim();
    if (!link) return;
    const button = document.getElementById("approvalCopy");

    try {
      await navigator.clipboard.writeText(link);
      const old = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => button.textContent = old, 1400);
    } catch {
      window.prompt("Copy this approval link:", link);
    }
  }

  function openCurrentLink() {
    const link = document.getElementById("approvalLinkText").textContent.trim();
    if (link) window.open(link, "_blank", "noopener");
  }

  function chipFor(job) {
    const a = approvalFor(job);
    if (!a) return '<span class="approval-chip none">○ NO APPROVAL</span>';
    if (a.status === "approved") return '<span class="approval-chip approved">✓ CUSTOMER APPROVED</span>';
    return '<span class="approval-chip pending">● APPROVAL PENDING</span>';
  }

  function enhanceCards() {
    document.querySelectorAll("#jobs .card").forEach((card) => {
      const jobNo = norm(card.querySelector(".jobno")?.textContent);
      if (!jobNo) return;

      const job = jobs.find((j) => norm(j.job_number) === jobNo);
      if (!job) return;

      card.querySelector(".approval-chip")?.remove();

      const headLeft = card.querySelector(".card-head > div");
      if (headLeft) headLeft.insertAdjacentHTML("beforeend", chipFor(job));

      const actions = card.querySelector(".actions");
      if (actions && !actions.querySelector("[data-approval-job]")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button secondary";
        button.dataset.approvalJob = jobNo;
        button.textContent = "Proof Approval";
        button.addEventListener("click", () => openModal(jobNo));
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
      console.error("Approval Manager:", error);
      jobs = [];
    }
  }

  async function init() {
    ensureModal();
    await loadJobs();
    enhanceCards();

    window.addEventListener("imaginable:jobs-changed", async () => {
      await loadJobs();
      enhanceCards();
    });

    const jobsRoot = document.getElementById("jobs");
    if (jobsRoot) {
      const observer = new MutationObserver(() => {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(enhanceCards, 40);
      });
      observer.observe(jobsRoot, { childList:true, subtree:true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
