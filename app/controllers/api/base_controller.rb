module Api
  class BaseController < ApplicationController
    rescue_from StandardError do |e|
      render json: { error: e.message }, status: :unprocessable_entity
    end

    rescue_from ArgumentError do |e|
      render json: { error: e.message }, status: :bad_request
    end
  end
end
