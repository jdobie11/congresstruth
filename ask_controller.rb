module Api
  class AskController < BaseController
    def create
      question = params.require(:question).to_s.strip
      raise ArgumentError, "Question cannot be empty"           if question.empty?
      raise ArgumentError, "Question too long (max 2 000 chars)" if question.length > 2_000

      answer = AskService.ask(question: question)
      render json: { answer: answer }
    end
  end
end
