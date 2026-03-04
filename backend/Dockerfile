FROM ruby:3.3-slim

RUN apt-get update -qq && apt-get install -y \
  build-essential \
  default-libmysqlclient-dev \
  libyaml-dev \
  git \
  curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

EXPOSE 3000
