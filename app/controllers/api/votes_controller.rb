module Api
  class VotesController < BaseController
    def index
      bioguide_id = params.require(:bioguide_id)
      limit  = [params.fetch(:limit, 20).to_i, 250].min
      offset = params.fetch(:offset, 0).to_i
      render json: CongressService.votes(bioguide_id: bioguide_id, limit: limit, offset: offset)
    end
  end
end
