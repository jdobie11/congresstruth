const KEYWORDS = ["SECRETARY", "ATTORNEY GENERAL", "DIRECTOR", "AMBASSADOR", "ADMINISTRATOR", "SURGEON GENERAL", "TRADE REPRESENTATIVE"];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const congress = req.query.congress || 119;
  const url = `https://api.congress.gov/v3/nomination?api_key=${process.env.CONGRESS_API_KEY}&congress=${congress}&nominationState=Confirmed&sort=receivedDate+desc&limit=50&format=json`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: "Congress API error" });
    const nominations = (data.nominations || []).filter(n =>
      KEYWORDS.some(k => (n.description || "").toUpperCase().includes(k))
    );
    res.json({ nominations, congress });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
