import crypto from "node:crypto";

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
      )
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const rawBody = await readRawBody(req);
    const signatureKey = String(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "");
    const notificationUrl = String(process.env.SQUARE_WEBHOOK_URL || "");

    // Bootstrap mode: reachable, but no event is processed until
    // the Square signature key and exact notification URL are configured.
    if (!signatureKey || !notificationUrl) {
      console.log("Square webhook bootstrap request received; no event processed.");
      return json(res, 200, {
        ok: true,
        configured: false,
        processed: false
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
    const payment = event?.data?.object?.payment || null;

    console.log("Verified Square webhook", {
      event_id: event?.event_id || "",
      type: event?.type || "",
      payment_id: payment?.id || "",
      payment_status: payment?.status || "",
      payment_note: payment?.note || ""
    });

    // 7.3-D2A verifies delivery/authenticity only.
    // 7.3-D2B will update Job Tracker payment data automatically.
    return json(res, 200, {
      ok: true,
      configured: true,
      verified: true,
      processed: false,
      type: event?.type || ""
    });
  } catch (error) {
    console.error("Square webhook error:", error);
    return json(res, 500, {
      ok: false,
      error: "Could not process Square webhook."
    });
  }
}
