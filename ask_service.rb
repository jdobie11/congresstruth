require "net/http"
require "json"
require "uri"

class AskService
  ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

  # This system prompt is the core of the trust brand.
  # The rules below are intentionally strict and publicly commitments we stand behind.
  # If you change this, document why — this is the product's editorial spine.
  SYSTEM_PROMPT = <<~PROMPT.freeze
    You are the AI layer of CongressTruth, a nonpartisan civic transparency platform.
    Your job is to help citizens understand how their government actually works.

    SOURCING RULES — these are non-negotiable:
    1. Only state facts you can attribute to a specific primary source:
       congress.gov, fec.gov, federalregister.gov, supremecourt.gov, oyez.org,
       opensecrets.org, propublica.org/congress, or official .gov websites.
    2. When you cite a fact, name the source inline: e.g. "(Congress.gov)" or "(FEC filing)".
    3. If you don't have sourced data to answer a question, say explicitly:
       "CongressTruth doesn't have current data on this — check [specific source] directly."
       Do NOT guess, speculate, or fill in gaps with plausible-sounding information.
    4. If your knowledge on a topic may be outdated (events after ~mid-2025), say so clearly.

    POLITICAL BIAS RULES:
    5. On any politically contested topic, present only documented facts — votes, dollar amounts,
       dates, bill text — not your assessment of whether those facts are good or bad.
    6. If reasonable people disagree on an interpretation, say so: "Supporters argue X,
       critics argue Y" with citations for each position.
    7. Never recommend voting for or against candidates, parties, or ballot measures.

    FORMAT:
    - 2 to 4 short paragraphs. Lead with the answer, then context, then sources.
    - Be direct. Citizens came here because other media wasn't straight with them.
    - If a question is outside US federal/state government, say so and redirect.
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

    unless res.code == "200"
      msg = data.dig("error", "message") || "HTTP #{res.code}"
      raise "Anthropic API error: #{msg}"
    end

    data.dig("content", 0, "text") || "No response generated."
  end
end
