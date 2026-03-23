Rails.application.routes.draw do
  namespace :api do
    # Members by state code (e.g. GET /api/members?state=NH)
    get "members",            to: "members#index"

    # Voting record for a member (e.g. GET /api/votes/H001090?limit=20)
    get "votes/:bioguide_id", to: "votes#index"

    # Campaign finance for a member (e.g. GET /api/finance?name=Hassan&state=NH)
    get "finance",            to: "finance#index"

    # Executive orders (e.g. GET /api/orders?per_page=20)
    get "orders",             to: "orders#index"

    # Health check
    get "ping",               to: "health#ping"
  end
end
