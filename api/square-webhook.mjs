import crypto from "node:crypto";

const OWNER = "NickieJam";
const REPO = "imaginable-things";
const BRANCH = "main";
const JOBS_FILE = "data/jobs.json";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function expectedSignature(rawBody, notificationUrl, signatureKey) {
  return crypto
    .createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody)
    .digest("base64");
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
  const data = JSON.parse(
    Buffer.from(file.content, "base64").toString("utf8")
  );
  return { file, data, encoded };
}

async function saveJobsFile(encoded, sha, data, jobNumber) {
  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encoded}`,
    {
      method: "PUT",
      headers: githubHeaders(),
      body: JSON.stringify({
        message: `content: Square payment sync ${jobNumber}`,
        content: Buffer.from(
          JSON.stringify(data, null, 2) + "\n"
        ).toString("base64"),
        sha,
        branch: BRANCH
      })
    }
  );

  if (r.status === 409) return { conflict: true };
  if (!r.ok) throw new Error(`GitHub write ${r.status}`);
  return { conflict: false };
}

function paymentReference(note) {
  const match = String(note || "").match(
    /\b(Deposit|Balance) for ([A-Z]+-\d{4}-\d+)\b/i
  );
  if (!match) return null;
  return {
    type: match[1].toLowerCase(),
    jobNumber: match[2].toUpperCase()
  };
}

async function syncCompletedPayment(payment) {
  const ref = paymentReference(payment?.note);
  if (!ref) {
    return {
      processed: false,
      reason: "Payment note does not reference an Imaginable Things job."
    };
  }

  const paymentId = String(payment?.id || "");
  const cents = Number(payment?.amount_money?.amount || 0);
  const currency = String(payment?.amount_money?.currency || "");
  const expectedLocation = String(process.env.SQUARE_LOCATION_ID || "");

  if (!paymentId || cents <= 0 || currency !== "USD") {
    return {
      processed: false,
      reason: "Payment amount or currency is not eligible for sync."
    };
  }

  if (
    expectedLocation &&
    payment?.location_id &&
    String(payment.location_id) !== expectedLocation
  ) {
    return {
      processed: false,
      reason: "Payment belongs to a different Square location."
    };
  }

  const paymentAmount = cents / 100;

  // Retry a few times if Pages CMS or another webhook writes jobs.json
  // at the same moment.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { file, data, encoded } = await getJobsFile();
    const job = (data.jobs || []).find(
      j => String(j.job_number || "").trim().toUpperCase() === ref.jobNumber
    );

    if (!job) {
      return {
        processed: false,
        reason: `Job ${ref.jobNumber} was not found.`
      };
    }

    const processedIds = Array.isArray(job.square_payment_ids)
      ? job.square_payment_ids.map(String)
      : [];

    if (processedIds.includes(paymentId)) {
      return {
        processed: false,
        duplicate: true,
        job_number: ref.jobNumber,
        reason: "This Square payment was already synchronized."
      };
    }

    const orderTotal = Math.max(0, Number(job.order_total) || 0);
    const oldPaid = Math.max(0, Number(job.amount_paid) || 0);
    const newPaid = Math.min(
      orderTotal || oldPaid + paymentAmount,
      oldPaid + paymentAmount
    );
    const balance = Math.max(0, orderTotal - newPaid);

    job.amount_paid = Number(newPaid.toFixed(2));
    job.balance_due = Number(balance.toFixed(2));

    if (orderTotal > 0 && balance <= 0) {
      job.payment_status = "paid";
    } else if (newPaid > 0) {
      job.payment_status = "partially-paid";
    } else if (Number(job.deposit_required) > 0) {
      job.payment_status = "deposit-due";
    } else {
      job.payment_status = "unpaid";
    }

    job.square_payment_ids = [...processedIds, paymentId];
    job.last_square_payment_id = paymentId;
    job.last_square_payment_amount = Number(paymentAmount.toFixed(2));
    job.last_square_payment_type = ref.type;
    job.last_square_payment_at =
      String(payment.updated_at || payment.created_at || new Date().toISOString());

    const result = await saveJobsFile(
      encoded,
      file.sha,
      data,
      ref.jobNumber
    );

    if (!result.conflict) {
      return {
        processed: true,
        job_number: ref.jobNumber,
        payment_amount: paymentAmount,
        amount_paid: job.amount_paid,
        balance_due: job.balance_due,
        payment_status: job.payment_status
      };
    }
  }

  throw new Error("Could not save payment after GitHub retries.");
}

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      service: "Imaginable Things Square Webhook",
      configured: Boolean(
        process.env.SQUARE_WEBHOOK_SIGNATURE_KEY &&
        process.env.SQUARE_WEBHOOK_URL
      ),
      automatic_payment_sync: true
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const rawBody = await readRawBody(req);
    const signatureKey = String(
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ""
    );
    const notificationUrl = String(process.env.SQUARE_WEBHOOK_URL || "");

    if (!signatureKey || !notificationUrl) {
      return json(res, 500, {
        ok: false,
        error: "Square webhook is not configured."
      });
    }

    const receivedSignature = String(
      req.headers["x-square-hmacsha256-signature"] || ""
    );
    const calculatedSignature = expectedSignature(
      rawBody,
      notificationUrl,
      signatureKey
    );

    if (!safeEqual(receivedSignature, calculatedSignature)) {
      console.warn("Rejected Square webhook: invalid signature.");
      return json(res, 403, {
        ok: false,
        error: "Invalid Square webhook signature."
      });
    }

    const event = JSON.parse(rawBody);

    if (event?.type !== "payment.updated") {
      return json(res, 200, {
        ok: true,
        verified: true,
        processed: false,
        reason: "Event type ignored."
      });
    }

    const payment = event?.data?.object?.payment || null;

    if (!payment || payment.status !== "COMPLETED") {
      return json(res, 200, {
        ok: true,
        verified: true,
        processed: false,
        reason: "Payment is not completed."
      });
    }

    const result = await syncCompletedPayment(payment);

    console.log("Square payment sync result", {
      event_id: event?.event_id || "",
      payment_id: payment?.id || "",
      ...result
    });

    return json(res, 200, {
      ok: true,
      verified: true,
      ...result
    });
  } catch (error) {
    console.error("Square webhook error:", error);
    return json(res, 500, {
      ok: false,
      error: "Could not process Square webhook."
    });
  }
}
