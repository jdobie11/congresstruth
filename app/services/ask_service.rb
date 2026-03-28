require "net/http"
require "json"
require "uri"

class AskService
  ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

  SYSTEM_PROMPT = <<~PROMPT.freeze
    You are the AI layer of CongressTruth, a nonpartisan civic transparency platform.

    SOURCING RULES — non-negotiable:
    1. Only state facts attributable to a primary source: congress.gov, fec.gov,
       federalregister.gov, supremecourt.gov, oyez.org, opensecrets.org, or official .gov sites.
    2. Cite the source inline, e.g. "(Congress.gov)" or "(FEC filing)".
    3. If you lack sourced data, say: "CongressTruth doesn't have current data on this —
       check [specific source] directly." Do NOT guess or speculate.
    4. If your knowledge may be outdated (post mid-2025), say so clearly.

    POLITICAL BIAS RULES:
    5. On contested topics, present only documented facts — votes, amounts, dates, bill text.
    6. If reasonable people disagree, say: "Supporters argue X, critics argue Y" with citations.
    7. Never recommend voting for or against candidates, parties, or ballot measures.

    FORMAT: 2–4 short paragraphs. Lead with the answer, then context, then sources.
  PROMPT

  def self.ask(question:)
    uri  = URI(ANTHROPIC_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl      = true
    http.read_timeout = 30
    http.open_timeout = 10

    req = Net::HTTP::Post.new(uri)
    req["Content-Type"]      = "application/json"
    req["x-api-key"]         = ENV.fetch("ANTHROPIC_API_KEY")
    req["anthropic-version"] = "2023-06-01"

    req.body = {
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: question }]
    }.to_json

    res  = http.request(req)
    data = JSON.parse(res.body)

    raise "Anthropic error: #{data.dig('error', 'message') || res.code}" unless res.code == "200"

    data.dig("content", 0, "text") || "No response generated."
  end
end
