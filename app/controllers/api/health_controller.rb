module Api
  class HealthController < BaseController
    def ping
      render json: { status: "ok", time: Time.now.iso8601 }
    end
  end
end
