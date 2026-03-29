module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  try {
    const url = "https://www.federalregister.gov/api/v1/documents"
      + "?conditions[type][]=PRESDOCU"
      + "&conditions[presidential_document_type][]=executive_order"
      + "&per_page=20&order=newest"
      + "&fields=document_number,publication_date,title,abstract,html_url";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let r;
    try {
      r = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!r.ok) { res.status(r.status).json({ error: `Federal Register error ${r.status}` }); return; }
    const data = await r.json();
    res.json(data);
  } catch (e) {
    const msg = e.name === "AbortError" ? "Federal Register timed out" : e.message;
    res.status(500).json({ error: msg });
  }
};
