// Fetches real-time roll call votes from:
//   Senate: senate.gov XML feed (public, no key)
//   House:  Congress.gov /v3/vote endpoint (requires API key)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const KEY = process.env.CONGRESS_API_KEY;

  const getField = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
    return m ? m[1].trim() : null;
  };

  const [senateResult, houseResult] = await Promise.allSettled([
    // ── Senate.gov XML (public, no key needed) ──────────────────────────────
    (async () => {
      // Try session 2 first (2026), fall back to session 1 (2025)
      for (const session of [2, 1]) {
        const url = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_${session}.xml`;
        const r = await fetch(url, { headers: { "User-Agent": "CongressTruth/1.0" } });
        if (!r.ok) continue;
        const xml = await r.text();
        const voteRe = /<vote>([\s\S]*?)<\/vote>/gi;
        const votes = [];
        let m;
        while ((m = voteRe.exec(xml)) !== null) {
          const b = m[1];
          votes.push({
            source: "Senate",
            chamber: "Senate",
            roll: getField(b, "vote_number"),
            date: getField(b, "vote_date"),
            bill: getField(b, "issue"),
            question: getField(b, "question"),
            result: getField(b, "result"),
            title: getField(b, "title"),
            yea: parseInt(getField(b, "yeas") || "0"),
            nay: parseInt(getField(b, "nays") || "0"),
            notVoting: parseInt(getField(b, "absent") || "0"),
          });
        }
        if (votes.length > 0) return votes;
      }
      return [];
    })(),

    // ── Congress.gov House votes ─────────────────────────────────────────────
    (async () => {
      if (!KEY) return [];
      // Try session 2 (2026) then session 1 (2025)
      for (const session of [2, 1]) {
        const url = `https://api.congress.gov/v3/vote/house/119/${session}?api_key=${KEY}&sort=rollNumber&direction=desc&limit=25&format=json`;
        const r = await fetch(url);
        if (!r.ok) continue;
        const data = await r.json();
        const list = data.votes || data.rollCallVotes || [];
        if (list.length === 0) continue;
        return list.map(v => ({
          source: "House",
          chamber: "House",
          roll: String(v.rollNumber || v.roll_number || ""),
          date: v.date || v.voteDate || "",
          bill: v.bill?.number ? `${(v.bill.type || "").toUpperCase()} ${v.bill.number}` : (v.legisNum || ""),
          question: v.question || v.voteQuestion || "",
          result: v.result || v.voteResult || "",
          title: v.bill?.title || v.description || "",
          yea: v.totalYes || v.totals?.yea || 0,
          nay: v.totalNo || v.totals?.nay || 0,
          notVoting: v.totalNotVoting || v.totals?.notVoting || 0,
        }));
      }
      return [];
    })(),
  ]);

  const senate = senateResult.status === "fulfilled" ? senateResult.value : [];
  const house  = houseResult.status  === "fulfilled" ? houseResult.value  : [];

  // Interleave: most recent from each chamber first, up to 30 total
  const merged = [];
  const maxLen = Math.max(senate.length, house.length);
  for (let i = 0; i < maxLen && merged.length < 30; i++) {
    if (i < senate.length) merged.push(senate[i]);
    if (i < house.length)  merged.push(house[i]);
  }

  res.json({ votes: merged, senateCount: senate.length, houseCount: house.length });
};
