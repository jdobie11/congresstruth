class FecService < ApiService
  BASE    = "https://api.open.fec.gov/v1"
  API_KEY = ENV.fetch("FEC_API_KEY", "DEMO_KEY")

  def self.candidate(name:, state:)
    cached("fec:candidate:#{state}:#{name.downcase.gsub(/\s+/, '_')}") do
      last_name = name.split(",").first.strip
      data = get(BASE, "/candidates/search/", {
        api_key: API_KEY, q: last_name, state: state,
        office: ["H", "S"], sort: "-receipts", per_page: 1
      })
      data.dig("results", 0)
    end
  end

  def self.totals(candidate_id:)
    cached("fec:totals:#{candidate_id}", ttl: 1.hour) do
      data = get(BASE, "/candidate/#{candidate_id}/totals/", {
        api_key: API_KEY, per_page: 1
      })
      data.dig("results", 0)
    end
  end

  def self.by_size(candidate_id:)
    cached("fec:bysize:#{candidate_id}", ttl: 1.hour) do
      data = get(BASE, "/schedules/schedule_a/by_size/candidate/", {
        api_key: API_KEY, candidate_id: candidate_id, per_page: 10
      })
      data["results"] || []
    end
  end
end
