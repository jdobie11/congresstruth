class CabinetService < ApiService
  BASE = "https://api.congress.gov/v3"

  # Rough list of role keywords that identify cabinet-level positions.
  # Used to filter the nominations list down to principal officers.
  CABINET_KEYWORDS = %w[
    Secretary Attorney\ General Director Ambassador Administrator
    Surgeon\ General Trade\ Representative
  ].freeze

  # Returns Senate-confirmed nominations for the given Congress from Congress.gov.
  # congress=119 is the 119th Congress (started Jan 2025, Trump's second term).
  # Cached for 2 hours since confirmations happen infrequently.
  def self.nominations(congress: 119, limit: 50)
    cached("cabinet:nominations:#{congress}", ttl: 2.hours) do
      data = get(BASE, "/nomination", {
        api_key:          ENV.fetch("CONGRESS_API_KEY"),
        congress:         congress,
        nominationState:  "Confirmed",
        sort:             "receivedDate+desc",
        limit:            limit,
        format:           "json"
      })

      # Filter to nominations that look like cabinet-level positions.
      nominations = data&.dig("nominations") || []
      cabinet = nominations.select do |n|
        desc = (n["description"] || "").upcase
        CABINET_KEYWORDS.any? { |kw| desc.include?(kw.upcase) }
      end

      { "nominations" => cabinet, "congress" => congress }
    end
  end
end
