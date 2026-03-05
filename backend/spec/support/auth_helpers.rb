module AuthHelpers
  # devise_token_auth の create_new_auth_token でリクエストヘッダーを生成する
  def auth_headers(user)
    user.create_new_auth_token.merge("Origin" => "http://localhost:3001")
  end

  def json_headers
    { "Content-Type" => "application/json", "Origin" => "http://localhost:3001" }
  end
end
