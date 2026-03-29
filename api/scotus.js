module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { type, term } = req.query;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const url = type === "justices"
      ? "https://api.oyez.org/justices"
      : `https://api.oyez.org/cases?filter=term:${term || "2024"}&per_page=20`;

    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!r.ok) return res.status(r.status).json({ error: `Oyez error ${r.status}` });
    const data = await r.json();

    if (type === "justices") {
      const current = (Array.isArray(data) ? data : []).filter(j => {
        const role = (j.roles || []).filter(r => r.institution_name?.includes("Supreme Court")).at(-1);
        // active justices have end_date of null or 0
        return role && (role.end_date === null || role.end_date === 0);
      });
      return res.json(current);
    }

    res.json(Array.isArray(data) ? data : []);
  } catch (e) {
    clearTimeout(timeout);
    const msg = e.name === "AbortError" ? "Oyez API timed out" : e.message;
    res.status(500).json({ error: msg });
  }
};
