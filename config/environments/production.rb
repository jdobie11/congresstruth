Rails.application.configure do
  config.cache_classes = true
  config.eager_load = true
  config.consider_all_requests_local = false
  config.action_controller.perform_caching = true
  config.cache_store = :memory_store, { size: 128.megabytes }
  config.log_level = :info
  config.force_ssl = true
end
