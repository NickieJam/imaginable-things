import crypto from "node:crypto";

const OWNER = "NickieJam";
const REPO = "imaginable-things";
const BRANCH = "main";
const JOBS_PATH = "data/jobs.json";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function normalize(value) {
  return String(value ?? "").trim();
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw new Error("Invalid JSON body."); }
}

function ghHeaders() {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  if (!token) throw new Error("GITHUB_CONTENT_TOKEN is not configured.");
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Imaginable-OS"
  };
}

async function readJobs() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${JOBS_PATH}?ref=${encodeURIComponent(BRANCH)}`;
  const response = await fetch(url, { headers: ghHeaders(), cache:"no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Could not read jobs from GitHub.");
  const text = Buffer.from(String(data.content || "").replace(/\n/g, ""), "base64").toString("utf8");
  const json = JSON.parse(text);
  if (!Array.isArray(json.jobs)) throw new Error("jobs.json does not contain a jobs array.");
  return { json, sha:data.sha };
}

async function writeJobs(json, sha, message) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${JOBS_PATH}`;
  const content = Buffer.from(JSON.stringify(json, null, 2) + "\n", "utf8").toString("base64");
  const response = await fetch(url, {
    method:"PUT",
    headers:{ ...ghHeaders(), "Content-Type":"application/json" },
    body:JSON.stringify({ message, content, sha, branch:BRANCH })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Could not update jobs in GitHub.");
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

function tokenHash(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function secureEqualHex(a, b) {
  try {
    const aa = Buffer.from(String(a), "hex");
    const bb = Buffer.from(String(b), "hex");
    return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function parseApprovalToken(token) {
  const raw = normalize(token);
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const recordId = raw.slice(0, dot);
  const secret = raw.slice(dot + 1);
  if (!recordId || !secret) return null;
  return { recordId, secret };
}

function approvalProofHash({
  job_number, recipient_name, proof_version, proof_url, proof_pathname,
  proof_filename, proof_content_type, proof_etag, summary, policy_version
}) {
  // Preserve the exact 7.4-B fingerprint for legacy URL-based approvals.
  if (!normalize(proof_pathname)) {
    const legacy = [
      normalize(job_number),
      normalize(recipient_name),
      normalize(proof_version),
      normalize(proof_url),
      normalize(summary),
      normalize(policy_version)
    ].join("\n---\n");
    return crypto.createHash("sha256").update(legacy).digest("hex");
  }

  const canonical = [
    "IMAGINABLE_APPROVAL_PROOF_V2",
    normalize(job_number),
    normalize(recipient_name),
    normalize(proof_version),
    normalize(proof_pathname),
    normalize(proof_filename),
    normalize(proof_content_type),
    normalize(proof_etag),
    normalize(summary),
    normalize(policy_version)
  ].join("\n---\n");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function approvalHashForJob(job) {
  const a = job?.approval || {};
  return approvalProofHash({
    job_number:normalize(job?.job_number),
    recipient_name:a.recipient_name,
    proof_version:a.proof_version,
    proof_url:a.proof_url,
    proof_pathname:a.proof_pathname,
    proof_filename:a.proof_filename,
    proof_content_type:a.proof_content_type,
    proof_etag:a.proof_etag,
    summary:a.summary,
    policy_version:a.policy_version
  });
}

function requestOrigin(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "www.imaginablethingsllc.com").split(",")[0].trim();
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error:"Method not allowed." });

  try {
    const body = await readBody(req);
    const adminPin = String(process.env.IMAGINABLE_ADMIN_PIN || "");
    if (!adminPin) return send(res, 500, { error:"IMAGINABLE_ADMIN_PIN is not configured." });
    if (String(body.pin || "") !== adminPin) return send(res, 401, { error:"Invalid Admin PIN." });

    const jobNumber = normalize(body.job_number);
    if (!jobNumber) return send(res, 400, { error:"Job number is required." });

    const { json, sha } = await readJobs();
    const job = json.jobs.find((item) => normalize(item.job_number) === jobNumber);
    if (!job) return send(res, 404, { error:`Job ${jobNumber} was not found.` });

    const approval = job.approval;
    const approved =
      approval &&
      approval.status === "approved" &&
      approval.record_id &&
      approval.approved_at &&
      secureEqualHex(approvalHashForJob(job), approval.approved_proof_hash || approval.proof_hash);

    if (!approved) {
      return send(res, 409, {
        error:"Production is blocked. The customer must approve the current final proof first."
      });
    }

    const now = new Date().toISOString();
    job.status = "production";
    job.production_started_at = now;
    job.production_started_from_approval = approval.record_id;
    job.production_clearance = {
      status:"cleared",
      reason:"customer-proof-approved",
      approval_record_id:approval.record_id,
      proof_version:approval.proof_version,
      cleared_at:job.production_clearance?.cleared_at || approval.approved_at,
      production_started_at:now,
      updated_at:now
    };

    await writeJobs(json, sha, `content: start production ${jobNumber}`);

    return send(res, 200, {
      ok:true,
      job_number:jobNumber,
      status:"production",
      approval_record_id:approval.record_id,
      production_started_at:now
    });
  } catch (error) {
    console.error("start-production", error);
    return send(res, error.statusCode === 409 ? 409 : 500, {
      error:error?.message || "Could not start production."
    });
  }
}
