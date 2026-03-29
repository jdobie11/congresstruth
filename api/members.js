export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { state, zip, limit = 10 } = req.query;
  const KEY = process.env.CONGRESS_API_KEY;
  let url;
  if (zip && /^\d{5}$/.test(zip)) {
    url = `https://api.congress.gov/v3/member/zipCode/${zip}?api_key=${KEY}&currentMember=true&limit=${limit}&format=json`;
  } else if (state) {
    url = `https://api.congress.gov/v3/member/${state.toUpperCase()}?api_key=${KEY}&currentMember=true&limit=${limit}&format=json`;
  } else {
    return res.status(400).json({ error: "state or zip required" });
  }
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Congress API error" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
