require "net/http"
require "json"
require "uri"

# Converts verbose congressional bill titles into plain-English YES/NO ballot questions.
# Results are cached permanently per bill ID — bill text never changes after enactment.
#
# Example:
#   input:  "An Act to amend title 10, United States Code, to authorize appropriations for
#            fiscal year 2025 for military activities of the Department of Defense..."
#   output: "Should Congress authorize $895B for the 2025 military budget?"
class SummarizeService
  ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

  SYSTEM_PROMPT = <<~P.freeze
    You convert US congressional bill titles into plain-English ballot questions.

    Rules:
    - Output ONLY the question — no preamble, no explanation, no punctuation after the "?"
    - Start with "Should Congress"
    - Be specific: include dollar amounts, percentages, or concrete policy changes from the title
    - Stay under 20 words
    - Zero political jargon or acronyms
    - Never signal whether the bill is good or bad
    - If the title contains no meaningful policy information, output: "Should Congress pass this bill?"
  P

  def self.summarize(title:, bill_id:)
    return "Should Congress pass this bill?" if title.nil? || title.strip.empty?

    cache_key = "summary:v1:#{bill_id.to_s.downcase.gsub(/\s+/, '')}"
    cached(cache_key) do
      uri  = URI(ANTHROPIC_URL)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl      = true
      http.read_timeout = 15
      http.open_timeout = 5

      req = Net::HTTP::Post.new(uri)
      req["Content-Type"]      = "application/json"
      req["x-api-key"]         = ENV.fetch("ANTHROPIC_API_KEY")
      req["anthropic-version"] = "2023-06-01"

      req.body = {
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 60,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: "user", content: title }]
      }.to_json

      res  = http.request(req)
      data = JSON.parse(res.body)

      if res.code == "200"
        data.dig("content", 0, "text")&.strip || "Should Congress pass this bill?"
      else
        # Fallback: truncate the raw title if Claude is unavailable
        short = title.length > 80 ? "#{title[0, 80]}…" : title
        short
      end
    end
  end

  # Reuse the Rails cache that ApiService uses (via Rails.cache).
  # Bills never change, so TTL is effectively permanent (100 years).
  def self.cached(key, &block)
    Rails.cache.fetch(key, expires_in: 100.years, &block)
  end
end
