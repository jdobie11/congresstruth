Rails.application.configure do
  config.cache_classes = true
  config.eager_load = false
  config.action_controller.perform_caching = false
  config.cache_store = :null_store
end
