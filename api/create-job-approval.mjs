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

function approvalProofHash({ job_number, recipient_name, proof_version, proof_url, summary, policy_version }) {
  const canonical = [
    normalize(job_number),
    normalize(recipient_name),
    normalize(proof_version),
    normalize(proof_url),
    normalize(summary),
    normalize(policy_version)
  ].join("\n---\n");
  return crypto.createHash("sha256").update(canonical).digest("hex");
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
    const recipientName = normalize(body.recipient_name);
    const proofVersion = normalize(body.proof_version);
    const proofUrl = normalize(body.proof_url);
    const summary = normalize(body.summary);

    if (!jobNumber || !recipientName || !proofVersion || !proofUrl || !summary) {
      return send(res, 400, { error:"Job, recipient, proof version, proof URL and notes are required." });
    }
    if (!/^https?:\/\//i.test(proofUrl) && !proofUrl.startsWith("/")) {
      return send(res, 400, { error:"Proof URL must begin with https:// or /." });
    }

    const { json, sha } = await readJobs();
    const job = json.jobs.find((item) => normalize(item.job_number) === jobNumber);
    if (!job) return send(res, 404, { error:`Job ${jobNumber} was not found.` });

    if (job.approval && !body.replace_current) {
      return send(res, 409, { error:"This job already has an approval request. Confirm replacement to create a new one." });
    }

    if (job.approval) {
      const history = Array.isArray(job.approval_history) ? job.approval_history : [];
      history.push({ ...job.approval, archived_at:new Date().toISOString() });
      job.approval_history = history.slice(-20);
    }

    const recordId = `APR-${crypto.randomUUID()}`;
    const secret = crypto.randomBytes(32).toString("base64url");
    const policyVersion = "2026-09-26";
    const createdAt = new Date().toISOString();

    job.approval = {
      record_id:recordId,
      status:"pending",
      recipient_name:recipientName,
      proof_version:proofVersion,
      proof_url:proofUrl,
      summary,
      policy_version:policyVersion,
      policy_url:"/custom-order-policy.html",
      proof_hash:approvalProofHash({
        job_number:jobNumber,
        recipient_name:recipientName,
        proof_version:proofVersion,
        proof_url:proofUrl,
        summary,
        policy_version:policyVersion
      }),
      token_hash:tokenHash(secret),
      created_at:createdAt,
      approved_at:null,
      approval_method:null,
      approval_name_hash:null,
      approval_name_salt:null,
      affirmation_version:null
    };

    await writeJobs(json, sha, `content: create proof approval ${jobNumber}`);

    const token = `${recordId}.${secret}`;
    const approvalUrl = `${requestOrigin(req)}/approval.html?token=${encodeURIComponent(token)}`;
    return send(res, 200, {
      ok:true,
      job_number:jobNumber,
      record_id:recordId,
      approval_url:approvalUrl,
      status:"pending"
    });
  } catch (error) {
    console.error("create-job-approval", error);
    return send(res, error.statusCode === 409 ? 409 : 500, { error:error.message || "Approval link could not be created." });
  }
}
