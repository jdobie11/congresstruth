export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  const { limit = 20, offset = 0 } = req.query;
  try {
    // 119th Congress (2025–2027) — filter to current congress to avoid old bills
    const url = `https://api.congress.gov/v3/bill/119?api_key=${process.env.CONGRESS_API_KEY}&sort=updateDate&direction=desc&limit=${limit}&offset=${offset}&format=json`;
    const r = await fetch(url);
    if (!r.ok) { res.status(r.status).json({ error: `Congress API ${r.status}` }); return; }
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
