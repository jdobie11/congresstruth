module Api
  class FinanceController < BaseController
    def index
      name  = params.require(:name)
      state = params.require(:state).upcase
      candidate = FecService.candidate(name: name, state: state)
      raise "No FEC record found for #{name} in #{state}" unless candidate
      render json: {
        candidate: candidate,
        totals:    FecService.totals(candidate_id: candidate["candidate_id"]),
        by_size:   FecService.by_size(candidate_id: candidate["candidate_id"])
      }
    end
  end
end
