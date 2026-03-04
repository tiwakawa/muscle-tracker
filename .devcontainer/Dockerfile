FROM ruby:3.3

# Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && npm install -g npm@latest

# System dependencies for Rails + MySQL
RUN apt-get update -qq && apt-get install -y \
  build-essential \
  default-libmysqlclient-dev \
  libyaml-dev \
  git \
  curl \
  zsh \
  && rm -rf /var/lib/apt/lists/*

# Install starship (ネット依存を postCreateCommand から除去してイメージに焼き込む)
RUN curl -sS https://starship.rs/install.sh | sh -s -- --yes

# デフォルトシェルを zsh に変更（これをしないとターミナルが bash で開く）
RUN chsh -s $(which zsh)

WORKDIR /workspace
