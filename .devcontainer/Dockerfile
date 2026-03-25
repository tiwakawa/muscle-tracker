FROM ruby:3.3

# Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && npm install -g npm@latest

# System dependencies for Rails + PostgreSQL
RUN apt-get update -qq && apt-get install -y \
  build-essential \
  libpq-dev \
  libyaml-dev \
  git \
  curl \
  zsh \
  && rm -rf /var/lib/apt/lists/*

# Install starship (ネット依存を postCreateCommand から除去してイメージに焼き込む)
RUN curl -sS https://starship.rs/install.sh | sh -s -- --yes

# デフォルトシェルを zsh に変更（これをしないとターミナルが bash で開く）
RUN chsh -s $(which zsh)

# dotfiles の zshrc をコンテナ起動直後から読み込む（postCreateCommand のタイミングに依存しない）
RUN echo 'export STARSHIP_CONFIG=/root/dotfiles/starship/starship.toml' >> /etc/zsh/zshrc \
  && echo '[[ -f /root/dotfiles/zsh/.zshrc ]] && source /root/dotfiles/zsh/.zshrc' >> /etc/zsh/zshrc

WORKDIR /workspace
