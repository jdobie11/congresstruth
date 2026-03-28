require "net/http"
require "json"
require "uri"

class ApiService
  def self.get(base_url, path, params = {})
   def self.get(base_url, path, params = {})
     uri = URI("#{base_url}#{path}")
     filtered = params.reject { |_, v| v.nil? }
     uri.query = URI.encode_www_form(filtered) unless filtered.empty?

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.read_timeout = 15
    http.open_timeout = 5

    req = Net::HTTP::Get.new(uri)
    req["User-Agent"] = "CongressTruth/1.0"
    req["Accept"]     = "application/json"

    res  = http.request(req)
    data = JSON.parse(res.body)

    raise "API error #{res.code}: #{data.dig('error', 'message') || res.body[0, 200]}" unless res.is_a?(Net::HTTPSuccess)

    data
  end

  def self.cached(key, ttl: nil, &block)
    opts = ttl ? { expires_in: ttl } : {}
    Rails.cache.fetch(key, **opts, &block)
  end
end
