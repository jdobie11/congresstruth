Rails.application.configure do
  config.cache_classes = false
  config.eager_load = false
  config.consider_all_requests_local = true
  config.action_controller.perform_caching = true
  config.cache_store = :memory_store
  config.server_timing = true
end
