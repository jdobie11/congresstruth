class SupremeCourtService < ApiService
  OYEZ_BASE = "https://api.oyez.org"

  # Returns the 9 current justices from the Oyez API.
  # Oyez returns all historical justices; we filter to those whose most recent
  # Supreme Court role has no end_date (i.e. they are still serving).
  def self.justices
    cached("court:justices", ttl: 24.hours) do
      all = get(OYEZ_BASE, "/justices", {})
      (all || []).select do |j|
        last_role = j["roles"]&.select { |r|
          r["institution_name"]&.include?("Supreme Court")
        }&.last
        last_role && last_role["end_date"].nil?
      end
    end
  end

  # Returns recent SCOTUS cases for a given term from the Oyez API.
  # Defaults to the most recent completed term; results are cached 6 hours.
  def self.cases(term: "2024", per_page: 20)
    cached("court:cases:#{term}", ttl: 6.hours) do
      get(OYEZ_BASE, "/cases", { filter: "term:#{term}", per_page: per_page })
    end
  end
end
