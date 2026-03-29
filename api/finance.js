const FEC = "https://api.open.fec.gov/v1";
const KEY = process.env.FEC_API_KEY || "DEMO_KEY";

async function fecGet(path, params = {}) {
  const url = new URL(`${FEC}${path}`);
  url.searchParams.set("api_key", KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`FEC ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { name, state } = req.query;
  if (!name || !state) return res.status(400).json({ error: "name and state required" });
  try {
    // Congress.gov names are "LAST, First Middle" — try last name, then full reversed name
    const parts = name.split(",");
    const lastName = parts[0].trim();
    const firstName = parts[1]?.trim().split(" ")[0] || "";
    const query = firstName ? `${firstName} ${lastName}` : lastName;

    const search = await fecGet("/candidates/search/", {
      q: query,
      state: state.toUpperCase(),
      per_page: 3,
      sort: "-receipts",
    });
    const candidate = search?.results?.[0];
    if (!candidate) return res.status(404).json({ error: `No FEC record found for ${name}` });

    const [totalsRes, sizeRes] = await Promise.all([
      fecGet(`/candidate/${candidate.candidate_id}/totals/`, { per_page: 1 }),
      fecGet("/schedules/schedule_a/by_size/candidate/", { candidate_id: candidate.candidate_id, per_page: 10 }),
    ]);
    res.json({ candidate, totals: totalsRes?.results?.[0], by_size: sizeRes?.results || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
