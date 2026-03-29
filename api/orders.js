module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  const url = "https://www.federalregister.gov/api/v1/documents"
    + "?conditions[type][]=PRESDOCU"
    + "&conditions[presidential_document_type][]=executive_order"
    + "&per_page=20&order=newest"
    + "&fields=document_number,publication_date,title,abstract,html_url";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) return res.json({ results: [], error: `Federal Register returned ${r.status}` });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    const msg = e.name === "AbortError" ? "Federal Register timed out" : e.message;
    // Return 200 with empty results so the frontend shows a soft error instead of crashing
    res.json({ results: [], error: msg });
  }
};
