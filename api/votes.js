module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { bioguide_id, limit = 20, offset = 0 } = req.query;
  if (!bioguide_id) return res.status(400).json({ error: "bioguide_id required" });
  const url = `https://api.congress.gov/v3/member/${bioguide_id}/sponsored-legislation?api_key=${process.env.CONGRESS_API_KEY}&limit=${limit}&offset=${offset}&format=json`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.json({ sponsoredLegislation: [], error: data.message || `Congress API ${r.status}` });
    res.json(data);
  } catch (e) {
    res.json({ sponsoredLegislation: [], error: e.message });
  }
};
