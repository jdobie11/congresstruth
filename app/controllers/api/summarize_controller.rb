module Api
  class SummarizeController < BaseController
    def create
      title   = params.require(:title).to_s.strip
      bill_id = params.fetch(:bill_id, "unknown").to_s.strip

      raise ArgumentError, "Title too long" if title.length > 1_000

      summary = SummarizeService.summarize(title: title, bill_id: bill_id)
      render json: { summary: summary, bill_id: bill_id }
    end
  end
end
