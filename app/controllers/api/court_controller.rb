module Api
  class CourtController < BaseController
    def justices
      render json: SupremeCourtService.justices
    end

    def cases
      term = params.fetch(:term, "2024")
      render json: SupremeCourtService.cases(term: term, per_page: 20)
    end
  end
end
