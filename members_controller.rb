module Api
  class MembersController < BaseController
    def index
      state = params.require(:state).upcase
      raise ArgumentError, "State must be a 2-letter code" unless state.match?(/\A[A-Z]{2}\z/)

      data = CongressService.members(state: state, limit: params.fetch(:limit, 10).to_i)
      render json: data
    end
  end
end
