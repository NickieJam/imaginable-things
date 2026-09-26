(() => {
  const $ = (id) => document.getElementById(id);
  const token = new URLSearchParams(location.search).get("token") || "";
  let approvalData = null;

  $("year").textContent = new Date().getFullYear();

  const setView = (name) => {
    ["approval-loading","approval-error","approval-complete","approval-content"].forEach((id) => {
      $(id).hidden = id !== name;
    });
  };

  const showError = (message) => {
    $("approval-error-message").textContent = message || "The link may be invalid, expired, or replaced by a newer proof.";
    setView("approval-error");
  };

  const formatDate = (value) => {
    if (!value) return "Not set";
    const d = new Date(value.includes("T") ? value : `${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-US", { dateStyle:"medium", timeStyle:"short" });
  };

  const renderProof = (url) => {
    const root = $("proof-media");
    root.replaceChildren();
    $("open-proof").href = url || "#";
    $("open-proof").hidden = !url;

    if (!url) {
      const p = document.createElement("p");
      p.className = "proof-placeholder";
      p.textContent = "No proof file was attached to this approval request.";
      root.appendChild(p);
      return;
    }

    const clean = String(url).split("?")[0].toLowerCase();
    if (clean.endsWith(".pdf")) {
      const frame = document.createElement("iframe");
      frame.src = url;
      frame.title = "Final design proof";
      frame.loading = "lazy";
      root.appendChild(frame);
      return;
    }

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Final design proof";
    img.loading = "eager";
    img.addEventListener("error", () => {
      root.replaceChildren();
      const wrap = document.createElement("div");
      wrap.className = "proof-placeholder";
      wrap.innerHTML = "<p>The proof cannot be previewed here.</p>";
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Open the proof in a new tab";
      wrap.appendChild(a);
      root.appendChild(wrap);
    }, { once:true });
    root.appendChild(img);
  };

  const renderComplete = (data) => {
    $("approval-complete-message").textContent =
      `Approval for ${data.job_number} has been recorded and the order is authorized for production.`;
    $("approval-receipt").innerHTML = `
      <div class="receipt-row"><span>Order</span><strong>${escapeHtml(data.job_number)}</strong></div>
      <div class="receipt-row"><span>Proof version</span><strong>${escapeHtml(data.proof_version || "—")}</strong></div>
      <div class="receipt-row"><span>Approved</span><strong>${escapeHtml(formatDateTime(data.approved_at))}</strong></div>
      <div class="receipt-row"><span>Record</span><strong>${escapeHtml(data.record_id || "—")}</strong></div>
    `;
    setView("approval-complete");
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[c]));

  const load = async () => {
    if (!token) {
      showError("This approval link is missing its secure token.");
      return;
    }

    try {
      const response = await fetch(`/api/get-job-approval?token=${encodeURIComponent(token)}`, { cache:"no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load approval request.");

      approvalData = data;

      if (data.status === "approved") {
        renderComplete(data);
        return;
      }

      $("job-number").textContent = data.job_number || "—";
      $("recipient-name").textContent = data.recipient_name || "—";
      $("product").textContent = data.product || "—";
      $("quantity").textContent = data.quantity ?? "—";
      $("technique").textContent = data.technique || "—";
      $("proof-version").textContent = data.proof_version || "—";
      $("due-date").textContent = formatDate(data.due_date);
      $("proof-summary").textContent = data.summary || "Please review the proof shown above and confirm that all custom details are correct.";
      renderProof(data.proof_url);
      setView("approval-content");
    } catch (error) {
      showError(error.message);
    }
  };

  $("approve-button").addEventListener("click", async () => {
    const name = $("approval-name").value.trim();
    const accepted = $("approval-checkbox").checked;
    const errorBox = $("approval-form-error");
    errorBox.hidden = true;

    if (!name) {
      errorBox.textContent = "Please type your name before approving.";
      errorBox.hidden = false;
      return;
    }
    if (!accepted) {
      errorBox.textContent = "Please check the approval box before continuing.";
      errorBox.hidden = false;
      return;
    }

    const expected = String(approvalData?.recipient_name || "").trim();
    if (expected && name.localeCompare(expected, undefined, { sensitivity:"accent", usage:"search" }) !== 0) {
      errorBox.textContent = `Please type the approval name exactly as shown: ${expected}`;
      errorBox.hidden = false;
      return;
    }

    const button = $("approve-button");
    button.disabled = true;
    button.textContent = "Recording approval…";

    try {
      const response = await fetch("/api/submit-job-approval", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ token, name, accepted:true })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Approval could not be recorded.");
      renderComplete(data);
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      button.disabled = false;
      button.textContent = "Approve for Production";
    }
  });

  load();
})();
