module Api
  class OrdersController < BaseController
    def index
      per_page = [params.fetch(:per_page, 20).to_i, 100].min
      render json: FederalRegisterService.orders(per_page: per_page)
    end
  end
end
