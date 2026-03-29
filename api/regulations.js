module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { type = "all", per_page = 20, page = 1 } = req.query;
  let typeParams = "";
  if (type === "final")    typeParams = "&conditions[type][]=RULE";
  else if (type === "proposed") typeParams = "&conditions[type][]=PRORULE";
  else                     typeParams = "&conditions[type][]=RULE&conditions[type][]=PRORULE";

  const url = "https://www.federalregister.gov/api/v1/documents"
    + typeParams
    + `&per_page=${per_page}&page=${page}&order=newest`
    + "&fields=document_number,publication_date,effective_on,comments_close_on,title,abstract,html_url,type,agency_names,significant,docket_id,regulation_id_numbers";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) return res.json({ results: [], count: 0, error: `Federal Register returned ${r.status}` });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    const msg = e.name === "AbortError" ? "Federal Register timed out" : e.message;
    res.json({ results: [], count: 0, error: msg });
  }
};
