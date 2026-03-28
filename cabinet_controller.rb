module Api
  class CabinetController < BaseController
    def index
      congress = params.fetch(:congress, 119).to_i
      render json: CabinetService.nominations(congress: congress)
    end
  end
end
