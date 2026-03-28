module Api
  class BaseController < ApplicationController
    rescue_from StandardError do |e|
     rescue_from StandardError do |e|
       Rails.logger.error("Unhandled error: #{e.class} - #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
       render json: { error: "An unexpected error occurred" }, status: :unprocessable_entity
     end
    end

    rescue_from ArgumentError do |e|
      render json: { error: e.message }, status: :bad_request
    end
  end
end
