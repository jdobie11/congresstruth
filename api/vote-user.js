// Records user votes and returns aggregate community counts.
// Requires Upstash Redis: set KV_REST_API_URL + KV_REST_API_TOKEN in Vercel env vars.
// Setup: https://console.upstash.com → create Redis DB → copy REST URL & token

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const URL   = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;

  // If no Redis configured, return zeros gracefully
  if (!URL || !TOKEN) {
    return res.json({ yea: 0, nay: 0, total: 0, configured: false });
  }

  const kv = async (...args) => {
    const r = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const d = await r.json();
    return d.result;
  };

  try {
    const body = req.body || {};
    const voteId = body.voteId || req.query.voteId;
    const vote   = body.vote;   // "yea" | "nay" | null

    if (!voteId) return res.status(400).json({ error: "voteId required" });

    // Record vote if provided
    if (req.method === "POST" && vote) {
      await kv("HINCRBY", `votes:${voteId}`, vote, 1);
    }

    // Return current counts
    const raw = await kv("HGETALL", `votes:${voteId}`);
    const counts = {};
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i += 2) counts[raw[i]] = parseInt(raw[i + 1] || "0");
    }

    const yea = counts.yea || 0;
    const nay = counts.nay || 0;
    res.json({ yea, nay, total: yea + nay, configured: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
