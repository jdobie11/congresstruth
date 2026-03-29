module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  const { congress = "119", type, number } = req.query;
  if (!type || !number) return res.status(400).json({ error: "type and number required" });
  const KEY = process.env.CONGRESS_API_KEY;
  const BASE = "https://api.congress.gov/v3";
  try {
    const [sumRes, votesRes] = await Promise.all([
      fetch(`${BASE}/bill/${congress}/${type}/${number}/summaries?api_key=${KEY}&format=json`),
      fetch(`${BASE}/bill/${congress}/${type}/${number}/votes?api_key=${KEY}&format=json`),
    ]);
    const sumData   = sumRes.ok   ? await sumRes.json()   : {};
    const votesData = votesRes.ok ? await votesRes.json() : {};

    const summaries = sumData.summaries || [];
    const rawSummary = summaries[summaries.length - 1]?.text || null;
    const summary = rawSummary
      ? rawSummary.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : null;

    const votes = votesData.votes || [];
    let voteTotals = null;
    if (votes.length > 0 && votes[0].url) {
      const voteRes = await fetch(`${votes[0].url}?api_key=${KEY}&format=json`);
      if (voteRes.ok) {
        const vd = await voteRes.json();
        const v = vd.vote || {};
        if (v.totalYes !== undefined || v.totalNo !== undefined) {
          voteTotals = {
            yea: v.totalYes || 0,
            nay: v.totalNo || 0,
            notVoting: v.totalNotVoting || 0,
            present: v.totalPresent || 0,
            result: v.result || null,
            voteType: votes[0].voteType || "",
          };
        }
      }
    }
    res.json({ summary, voteTotals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
