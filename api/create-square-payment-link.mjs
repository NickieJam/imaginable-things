import crypto from "node:crypto";

const OWNER = "NickieJam";
const REPO = "imaginable-things";
const BRANCH = "main";
const JOBS_FILE = "data/jobs.json";
const SQUARE_VERSION = "2026-08-19";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function github(path) {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  if (!token) throw new Error("Missing GITHUB_CONTENT_TOKEN.");

  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  return r.json();
}

async function getJob(jobNumber) {
  const encoded = JOBS_FILE.split("/").map(encodeURIComponent).join("/");
  const file = await github(
    `/repos/${OWNER}/${REPO}/contents/${encoded}?ref=${encodeURIComponent(BRANCH)}`
  );

  const data = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  return (data.jobs || []).find(
    j => String(j.job_number || "").trim() === String(jobNumber || "").trim()
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const pin = String(req.headers["x-imaginable-admin-pin"] || "");
    if (pin !== String(process.env.IMAGINABLE_ADMIN_PIN || "")) {
      return send(res, 401, { ok: false, error: "Incorrect admin PIN." });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const jobNumber = String(body.job_number || "").trim();
    const paymentType = body.payment_type === "balance" ? "balance" : "deposit";

    if (!jobNumber) {
      return send(res, 400, { ok: false, error: "Missing job number." });
    }

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const environment = String(process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase();

    if (!accessToken || !locationId) {
      return send(res, 500, {
        ok: false,
        error: "Square environment variables are not configured."
      });
    }

    const job = await getJob(jobNumber);
    if (!job) {
      return send(res, 404, { ok: false, error: "Job not found." });
    }

    const orderTotal = Math.max(0, Number(job.order_total) || 0);
    const depositRequired = Math.max(0, Number(job.deposit_required) || 0);
    const amountPaid = Math.max(0, Number(job.amount_paid) || 0);
    const balanceDue = Math.max(
      0,
      Number(job.balance_due ?? (orderTotal - amountPaid)) || 0
    );

    const amount =
      paymentType === "deposit"
        ? Math.max(0, Math.min(balanceDue, depositRequired - amountPaid))
        : balanceDue;

    if (amount <= 0) {
      return send(res, 400, {
        ok: false,
        error:
          paymentType === "deposit"
            ? "There is no deposit amount due for this job."
            : "There is no balance due for this job."
      });
    }

    const cents = Math.round(amount * 100);
    const base =
      environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    const label = paymentType === "deposit" ? "Deposit" : "Balance";
    const squareResponse = await fetch(`${base}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        description: `${label} payment for ${jobNumber}`,
        payment_note: `${label} for ${jobNumber} - ${job.client || "Customer"}`,
        quick_pay: {
          name: `Imaginable Things - ${label} ${jobNumber}`,
          price_money: {
            amount: cents,
            currency: "USD"
          },
          location_id: locationId
        }
      })
    });

    const squareData = await squareResponse.json();

    if (!squareResponse.ok || !squareData.payment_link?.url) {
      console.error("Square CreatePaymentLink error:", squareData);
      const detail =
        squareData?.errors?.[0]?.detail ||
        squareData?.errors?.[0]?.code ||
        "Square could not create the payment link.";
      return send(res, squareResponse.status || 500, {
        ok: false,
        error: detail
      });
    }

    return send(res, 200, {
      ok: true,
      environment,
      job_number: jobNumber,
      payment_type: paymentType,
      amount,
      url: squareData.payment_link.url,
      payment_link_id: squareData.payment_link.id,
      order_id: squareData.payment_link.order_id
    });
  } catch (error) {
    console.error(error);
    return send(res, 500, {
      ok: false,
      error: "Could not create the Square payment link."
    });
  }
}
