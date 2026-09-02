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

function githubHeaders() {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  if (!token) throw new Error("Missing GITHUB_CONTENT_TOKEN.");
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

async function getJobsFile() {
  const encoded = JOBS_FILE.split("/").map(encodeURIComponent).join("/");
  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encoded}?ref=${encodeURIComponent(BRANCH)}`,
    { headers: githubHeaders() }
  );
  if (!r.ok) throw new Error(`GitHub read ${r.status}`);
  const file = await r.json();
  const data = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  return { file, data, encoded };
}

function findJob(data, jobNumber) {
  return (data.jobs || []).find(
    j => String(j.job_number || "").trim() === String(jobNumber || "").trim()
  );
}

async function saveJobsFile(encoded, sha, data, message) {
  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encoded}`,
    {
      method: "PUT",
      headers: githubHeaders(),
      body: JSON.stringify({
        message,
        content: Buffer.from(JSON.stringify(data, null, 2) + "\n").toString("base64"),
        sha,
        branch: BRANCH
      })
    }
  );
  if (r.status === 409) return { conflict: true };
  if (!r.ok) throw new Error(`GitHub write ${r.status}`);
  return { conflict: false };
}

async function markDeactivated(jobNumber, paymentLinkId) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { file, data, encoded } = await getJobsFile();
    const job = findJob(data, jobNumber);
    if (!job) throw new Error("Job not found while updating payment link.");

    if (String(job.square_payment_link_id || "") !== String(paymentLinkId)) {
      throw new Error("Saved payment link changed before deactivation.");
    }

    job.square_payment_link_status = "deactivated";
    job.square_payment_link_deactivated_at = new Date().toISOString();

    const result = await saveJobsFile(
      encoded,
      file.sha,
      data,
      `content: deactivate Square payment link ${jobNumber}`
    );
    if (!result.conflict) return;
  }
  throw new Error("Could not update payment link after GitHub retries.");
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

    if (!jobNumber) {
      return send(res, 400, { ok: false, error: "Missing job number." });
    }

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const environment = String(
      process.env.SQUARE_ENVIRONMENT || "sandbox"
    ).toLowerCase();

    if (!accessToken) {
      return send(res, 500, {
        ok: false,
        error: "Square environment variables are not configured."
      });
    }

    const { data } = await getJobsFile();
    const job = findJob(data, jobNumber);
    if (!job) {
      return send(res, 404, { ok: false, error: "Job not found." });
    }

    const paymentLinkId = String(job.square_payment_link_id || "");
    const status = String(job.square_payment_link_status || "");

    if (!paymentLinkId) {
      return send(res, 400, {
        ok: false,
        error: "This job does not have a saved Square payment link."
      });
    }

    if (status === "deactivated") {
      return send(res, 200, {
        ok: true,
        already_deactivated: true,
        job_number: jobNumber,
        payment_link_id: paymentLinkId
      });
    }

    if (
      job.square_payment_link_environment &&
      String(job.square_payment_link_environment) !== environment
    ) {
      return send(res, 409, {
        ok: false,
        error: "Saved payment link belongs to a different Square environment."
      });
    }

    const base =
      environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    const squareResponse = await fetch(
      `${base}/v2/online-checkout/payment-links/${encodeURIComponent(paymentLinkId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": SQUARE_VERSION
        }
      }
    );

    const squareData = await squareResponse.json().catch(() => ({}));

    if (!squareResponse.ok) {
      console.error("Square DeletePaymentLink error:", squareData);
      const detail =
        squareData?.errors?.[0]?.detail ||
        squareData?.errors?.[0]?.code ||
        "Square could not deactivate the payment link.";
      return send(res, squareResponse.status || 500, {
        ok: false,
        error: detail
      });
    }

    await markDeactivated(jobNumber, paymentLinkId);

    return send(res, 200, {
      ok: true,
      job_number: jobNumber,
      payment_link_id: paymentLinkId,
      cancelled_order_id: squareData.cancelled_order_id || ""
    });
  } catch (error) {
    console.error(error);
    return send(res, 500, {
      ok: false,
      error: "Could not deactivate the Square payment link."
    });
  }
}
