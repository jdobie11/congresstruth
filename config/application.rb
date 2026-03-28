require_relative "boot"
require "rails"
require "action_controller/railtie"

Bundler.require(*Rails.groups)

module Congresstruth
  class Application < Rails::Application
    config.load_defaults 7.1
    config.api_only = true
    config.cache_store = :memory_store, { size: 64.megabytes }
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins ENV.fetch("ALLOWED_ORIGINS", "*")
        resource "*", headers: :any, methods: [:get, :post, :options]
      end
    end
  end
end
