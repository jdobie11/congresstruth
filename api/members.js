export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { state = "NH", limit = 10 } = req.query;
  const url = `https://api.congress.gov/v3/member/${state.toUpperCase()}?api_key=${process.env.CONGRESS_API_KEY}&currentMember=true&limit=${limit}&format=json`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Congress API error" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
