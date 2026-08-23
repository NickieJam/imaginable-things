const OWNER = "NickieJam";
const REPO = "imaginable-things";
const BRANCH = "main";
const FILE_PATH = "data/leads.json";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  if (!token) throw new Error("GITHUB_CONTENT_TOKEN is not configured.");

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub ${response.status}: ${text.slice(0, 500)}`);
  }
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const adminPin = String(req.headers["x-imaginable-admin-pin"] || "");
    const expectedPin = String(process.env.IMAGINABLE_ADMIN_PIN || "");

    if (!expectedPin) return json(res, 500, { ok: false, error: "Admin PIN is not configured." });
    if (!adminPin || adminPin !== expectedPin) return json(res, 401, { ok: false, error: "Incorrect admin PIN." });

    const leadNumber = String(body.lead_number || "").trim();
    const status = String(body.status || "").trim().toLowerCase();
    const nextFollowUp = String(body.next_follow_up || "").trim();

    const allowedStatuses = new Set(["new", "contacted", "waiting", "quoted", "won", "lost"]);
    if (!leadNumber) return json(res, 400, { ok: false, error: "Missing lead number." });
    if (!allowedStatuses.has(status)) return json(res, 400, { ok: false, error: "Invalid lead status." });
    if (nextFollowUp && !/^\d{4}-\d{2}-\d{2}$/.test(nextFollowUp)) {
      return json(res, 400, { ok: false, error: "Invalid follow-up date." });
    }

    const encodedPath = FILE_PATH.split("/").map(encodeURIComponent).join("/");
    const file = await githubRequest(`/repos/${OWNER}/${REPO}/contents/${encodedPath}?ref=${encodeURIComponent(BRANCH)}`);
    const raw = Buffer.from(file.content, "base64").toString("utf8");
    const data = JSON.parse(raw);
    const leads = Array.isArray(data.leads) ? data.leads : [];

    const lead = leads.find(item => String(item.lead_number || "") === leadNumber);
    if (!lead) return json(res, 404, { ok: false, error: "Lead not found." });

    lead.status = status;
    lead.next_follow_up = nextFollowUp;

    const updated = JSON.stringify(data, null, 2) + "\n";
    await githubRequest(`/repos/${OWNER}/${REPO}/contents/${encodedPath}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `content: update lead ${leadNumber}`,
        content: Buffer.from(updated, "utf8").toString("base64"),
        sha: file.sha,
        branch: BRANCH
      })
    });

    return json(res, 200, {
      ok: true,
      lead_number: leadNumber,
      status,
      next_follow_up: nextFollowUp
    });
  } catch (error) {
    console.error("Lead update failed:", error);
    return json(res, 500, { ok: false, error: "Could not save the lead update." });
  }
}
