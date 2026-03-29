module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { state, zip, all, limit = 100, offset = 0 } = req.query;
  const KEY = process.env.CONGRESS_API_KEY;
  let url;
  if (zip && /^\d{5}$/.test(zip.trim())) {
    url = `https://api.congress.gov/v3/member/zipCode/${zip.trim()}?api_key=${KEY}&currentMember=true&limit=10&format=json`;
  } else if (all === "true" || (!state && !zip)) {
    url = `https://api.congress.gov/v3/member?api_key=${KEY}&currentMember=true&limit=${limit}&offset=${offset}&format=json`;
  } else if (state) {
    url = `https://api.congress.gov/v3/member/${state.toUpperCase()}?api_key=${KEY}&currentMember=true&limit=10&format=json`;
  } else {
    return res.status(400).json({ error: "state, zip, or all=true required" });
  }
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Congress API error" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
