class FederalRegisterService < ApiService
  BASE = "https://www.federalregister.gov/api/v1"

  def self.orders(per_page: 20)
    cached("fedregister:orders", ttl: 30.minutes) do
      get(BASE, "/documents", {
        "conditions[type][]":                       "PRESDOCU",
        "conditions[presidential_document_type][]": "executive_order",
        per_page:                                   per_page,
        order:                                      "newest",
        fields:                                     "document_number,publication_date,title,abstract,html_url"
      })
    end
  end
end
