class CongressService < ApiService
  BASE = "https://api.congress.gov/v3"

  def self.members(state:, limit: 10)
    cached("members:#{state.upcase}") do
      get(BASE, "/member/#{state.upcase}", {
        api_key: ENV.fetch("CONGRESS_API_KEY"),
        currentMember: "true",
        limit: limit,
        format: "json"
      })
    end
  end

  def self.votes(bioguide_id:, limit: 20, offset: 0)
    cached("votes:#{bioguide_id}:#{offset}", ttl: 15.minutes) do
      get(BASE, "/member/#{bioguide_id}/votes", {
        api_key: ENV.fetch("CONGRESS_API_KEY"),
        limit: limit,
        offset: offset,
        format: "json"
      })
    end
  end
end
