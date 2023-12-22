---
title: Laravel subdomains in Docker
pubDate: 2022-06-07
description: Learn how to set up subdomain support for your Laravel app using Docker. Configure Nginx, Redis, MySQL, and Traefik for seamless subdomain management.
image: laravel-subdomains-in-docker.png
---

There are many ways you can add Docker to your Laravel application, but how do you add docker to your Laravel application when you need sub domain support? In this article I will walk through how I have done it in the past, this isn't the only way to achieve this - but it is a way that I found works well for me.

It all starts with a docker-compose file, like most docker builds - I prefer to use docker-compose as it allows me to be pretty specific on behaviour and environment variables etc. Create a `docker-compose.yaml` in the root of your Laravel application. We are going to want to add 5 services to this: *nginx*, *app*, *redis*, *mysql* and *traefik*.

You do not need to keep redis if you do not wish to use it, however it is something I include in every laravel build as it provides great support for both Cache and Queue workers. Let's walk through the compose file now:

## Our Nginx Service

```yaml
nginx:
    container_name: "${PROJECT_NAME}_nginx"
    build:
        context: ./docker/nginx
        dockerfile: Dockerfile
    depends_on:
        - app
    volumes:
        - ./:/var/www/vhost/crm:cached
        - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
        - ./docker/nginx/conf.d:/etc/nginx/conf.d
        - ./docker/nginx/ssl:/etc/nginx/ssl
    working_dir: /var/www/vhost/
    ports:
        - '443:443'
        - '9008:9008'
    networks:
        - crm
    labels:
        - 'traefik.http.routers.${PROJECT_NAME}_nginx.rule=HostRegexp(`${APP_DOMAIN}`, `{subdomain:[a-z]+.${APP_DOMAIN}}`)'
        - 'traefik.http.routers.${PROJECT_NAME}_nginx.priority=1'
        - 'traefik.docker.network=proxy'
```

In my `.env` file I add a new variable called `PROJECT_NAME` which could be different to my app name, something that is more system friendly and identifiable. Your docker-compose file can pick up this environment variable, and use it as part of it's build process. We want the name of our nginx container to be specific for our project, so we use the env variable and add `_nginx` on the end. We then want to specify the build portion of our service, we want to pull in a specific `Dockerfile` for nginx to allow us to configure the container in our own way. This container will depend on the `app` service being available, otherwise we will not be able to serve anything useful. We also want to mount a few volumes:

- Our application itself, which we will cache between builds
- Our nginx configuration
- Our SSL certificates.

We then set our working directory, ports, and which network we want to run on. Finally we get to the labels part of our service, we want nginx to handle the routing - but we will have a layer around that which handles the trafic ingress and sends it to the container it is needed at. The important label is the first one `'traefik.http.routers.${PROJECT_NAME}_nginx.rule=HostRegexp(`${APP_DOMAIN}`, `{subdomain:[a-z]+.${APP_DOMAIN}}`)'` what this does is tell our trefik service that we want a router for this project and the nginx rule should match a specific regular expression. As you can see we have another `.env` variable called `APP_DOMAIN` which is what we want our container to respond as, I usually set this as `project-name.localhost` - it is important to use `.localhost` so that traefik will work correctly here. But all the regex does is match any subdomain with the app domain part and route it to nginx to pass to your Laravel application. Our docker network is set to proxy, so that requests proxy through traefik to our nginx service, and we want the priority to be 1.

Let's also have a look at the other parts we need aside from the docker-compose definition.

The nginx Dockerfile should be created under: `docker/nginx/Dockerfile` and contain the following:

```docker
# Offical Docker Image for Nginx
# https://hub.docker.com/_/nginx
FROM nginx:alpine

# Set Current Directory
WORKDIR /var/www/vhost/
```

The nginx configuration should be created under: `docker/nginx/nginx.conf` and contain the following:

```nginx
pid /run/nginx.pid;
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    multi_accept on;
    worker_connections 65535;
}

http {
    charset utf-8;
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    server_tokens off;
    log_not_found off;
    types_hash_max_size 2048;
    client_max_body_size 16M;

    # MIME
    include mime.types;
    default_type application/octet-stream;

    # logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    # SSL
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Diffie-Hellman parameter for DHE ciphersuites
    #ssl_dhparam /etc/nginx/dhparam.pem;

    # OWASP B (Broad Compatibility) configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256;
    ssl_prefer_server_ciphers on;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4 208.67.222.222 208.67.220.220 valid=60s;
    resolver_timeout 2s;

    # load configs
    include /etc/nginx/conf.d/*.conf;
}
```

Our sites configuration should be be: `docker/nginx/conf.g/site.conf` and contain the following:

```nginx
server {

   #listen 80;
   listen [::]:80;

   # For https
   listen 443 ssl;
   listen [::]:443 ssl ipv6only=on;
   ssl_certificate /etc/nginx/ssl/app-cert.pem;
   ssl_certificate_key /etc/nginx/ssl/app-key.pem;

   root /var/www/vhost/crm/public;
   index index.php index.html index.htm;

   location / {
        try_files $uri $uri/ /index.php$is_args$args;
   }

   location ~ \.php$ {
       try_files $uri /index.php =404;
       # We are using our app service container name instead of 127.0.0.1 as our connection
       fastcgi_pass app:9000;
       fastcgi_index index.php;
       fastcgi_buffers 16 16k;
       fastcgi_buffer_size 32k;
       fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
       #fixes timeouts
       fastcgi_read_timeout 600;
       include fastcgi_params;
   }

   location ~ /\.ht {
       deny all;
   }

   location /.well-known/acme-challenge/ {
       root /var/www/letsencrypt/;
       log_not_found off;
   }

   error_log /var/log/nginx/laravel_error.log;
   access_log /var/log/nginx/laravel_access.log;
}
```

Finally we will need to have our SSL configuration created under: `docker/nginx/ssl/openssl.cnf` and contain the following:

```bash
[req]
default_bits           = 2048
default_md             = sha256
encrypt_key            = no
prompt                 = no
distinguished_name     = subject
req_extensions         = req_ext
x509_extensions        = x509_ext

[ subject ]
C                      = Country
ST                     = State
L                      = Location
O                      = Organisation
OU                     = Team
emailAddress           = email@example.com
CN                     = localhost

[ req_ext ]
subjectKeyIdentifier   = hash
basicConstraints       = CA:FALSE
keyUsage               = digitalSignature, keyEncipherment
extendedKeyUsage       = serverAuth, clientAuth
subjectAltName         = @alternate_names
nsComment              = "OpenSSL Generated Certificate"

[ x509_ext ]
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid,issuer
basicConstraints       = CA:FALSE
keyUsage               = digitalSignature, keyEncipherment
extendedKeyUsage       = serverAuth, clientAuth
subjectAltName         = @alternate_names
nsComment              = "OpenSSL Generated Certificate"

[ alternate_names ]
DNS.1                  = localhost
IP.1                   = 127.0.0.1
```

Finally we want to be able to create SSL certificates for our application, so run the following command inside `docker/nginx/ssl`:

```bash
mkcert "*.crm.localhost" "crm.localhost"
```

Make sure you swap `crm.localhost` above to whatever your app domain is set to!

We then want to rename `_wildcard.crm.localhost+1.pem` to `app-cert.pem`, and `_wildcard.crm.localhost_1-key.pem` to `app-key.pem` so that our application responds over SSL. Again your file names may differ.


## Our App Service

Our App Service is a little more typical and has no requirements for it on traefik as nginx handles loading this:

```yaml
app:
    container_name: "${PROJECT_NAME}_php"
    build:
        context: ./docker/php
        dockerfile: Dockerfile
    environment:
        PHP_MEMORY_LIMIT: '512M'
        COMPOSER_MEMORY_LIMIT: '-1'
    user: 501:501
    volumes:
        - ./:/var/www/vhost/crm:cached
    working_dir: /var/www/vhost/crm
    ports:
        - '9003:9003'
    networks:
        - crm
```

Again, like our nginx service, we use the Project Name env variable to set the containers name, ensuring it is easy to spot and manage. We then load in a Dockerfile so we can be specific on our build, and set some environment variables. We can control the PHP memory limit here easily, and we set the composer memory limit to `-1` - which as of composer 2.* is not as important. This is something I used to use when composer would run out of memory sometimes in fetching dependencies in large projects, I keep this in still more as a safety net than anything else. We set our user to our current user, on a mac if you open your terminal and run `id` you will get an output - find the ID that correlates to your user account and replace this in the service.

We have a few additional configuration files to add to our app service, so inside `docker/php` we will need to create a `Dockerfile` and add the following to it:

```docker
# Offical Docker Image for PHP
# https://hub.docker.com/_/php
FROM php:8.1-fpm

# Set Current Directory
WORKDIR /var/www/vhost/

# Install dependencies
RUN apt-get clean && apt-get update && apt-get upgrade -y && apt-get install -y \
    git \
    libcurl4-openssl-dev \
    libonig-dev \
    libpng-dev \
    libssl-dev \
    libicu-dev \
    libxml2-dev \
    libzip-dev \
    unzip \
    wget \
    zip \
    tzdata

RUN docker-php-ext-configure intl
# PHP Extensions
RUN docker-php-ext-install \
    bcmath \
    exif \
    gd \
    mysqli \
    opcache \
    pdo_mysql \
    pcntl \
    xml \
    zip \
    intl

# Install Composer from Official Docker Image
# https://hub.docker.com/_/composer
COPY --from=composer:2.2 /usr/bin/composer /usr/bin/composer
```

This dockerfile took me awhile to figure out when I first created it, as PHP 8.1 comes with some extensions pre-built now so cannot find certain extensions to install as they now belong in core. If you are converting your own Dockerfile for PHP here from pre 8.1 please bear that in mind.

Then we have an `opcache` and `redis` ini file within `docker/php/config`:

```ini
[opcache]
opcache.enable=1
; 0 means it will check on every request
; 0 is irrelevant if opcache.validate_timestamps=0 which is desirable in production
opcache.revalidate_freq=0
opcache.validate_timestamps=1
opcache.max_accelerated_files=10000
opcache.memory_consumption=192
opcache.max_wasted_percentage=10
opcache.interned_strings_buffer=16
opcache.fast_shutdown=1
```

```ini
[redis]
```

You can configure the PHP extensions how works best for you within these now.

## The Redis Service

Much like other services, we use the project name env variable to prefix the container name, followed by the name of the service. We then want to set the ports volumes and network:

```yaml
redis:
    image: redis:latest
    container_name: "${PROJECT_NAME}_redis"
    ports:
      - '6379:6379'
    volumes:
      - 'crm_redis:/data'
    networks:
      - crm
```

As you can see, this is a super simple docker service with very little customisation needed.

## The MySQL Service

Again, we prefix the MySQL service with the project name env variable, and then we set some environment variables for the container so that we can create the database with credentials etc:

```yaml
mysql:
    image: mariadb:latest
    container_name: "${PROJECT_NAME}_mysql"
    environment:
      MYSQL_ROOT_PASSWORD: '${DB_PASSWORD}'
      MYSQL_DATABASE: '${DB_DATABASE}'
      MYSQL_USER: '${DB_USERNAME}'
      MYSQL_PASSWORD: '${DB_PASSWORD}'
      MYSQL_ROOT_HOST: '%'
      MYSQL_ALLOW_EMPTY_PASSWORD: 'yes'
      command: mysqld --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    restart: always
    volumes:
      - 'crm_mysql:/data'
    ports:
      - '${FORWARD_DB_PORT:-4406}:3306'
    networks:
      - crm
```

These env variables will be pulled from your `.env` file, so make sure you adjust these as required before running any docker commands.

## Our Traefik Service

This is one of our most important services for our sub-domain set up, traefik basically acts as an ingress service for all traffic coming in on docker setup, and then proxies the request to one of its "routers" which we defined on our nginx service as a label. It is not an overly complex set up, but can be hard to get right (which is why I am writing this article).

```yaml
traefik:
    image: traefik:v2.0
    container_name: "${PROJECT_NAME}_traefik"
    restart: always
    command:
      - --entrypoints.web.address=:80
      - --providers.docker=true
      - --api.insecure=true
      - --log.level=debug
    volumes:
      - '/var/run/docker.sock:/var/run/docker.sock'
    ports:
      - '80:80'
      - '8080:8080'
    networks:
      - crm
```

We have a few options for our command, where we want to specify the web address to see entrypoints to port 80 (we aren't using port 80 for nginx so this is fine). We then want to set the provider to be docker and the api to be insecure. I am not 100% sure on what all of these commands do, as I do not pretend to be an expert with docker. Finally we want to mount the docker socket we have to the one in the container to allow it to all connect and allow us to smile. This may be different for yourself, so if you have issues make sure you check this volume if you do encounter issues.

## The full docker compose setup

```yaml
version: '3'

services:
  nginx:
    container_name: "${PROJECT_NAME}_nginx"
    build:
      context: ./docker/nginx
      dockerfile: Dockerfile
    depends_on:
      - app
    volumes:
      - ./:/var/www/vhost/crm:cached
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/conf.d:/etc/nginx/conf.d
      - ./docker/nginx/ssl:/etc/nginx/ssl
    working_dir: /var/www/vhost/
    ports:
      - '443:443'
      - '9008:9008'
    networks:
      - crm
    labels:
      - 'traefik.http.routers.${PROJECT_NAME}_nginx.rule=HostRegexp(`${APP_DOMAIN}`, `{subdomain:[a-z]+.${APP_DOMAIN}}`)'
      - 'traefik.http.routers.${PROJECT_NAME}_nginx.priority=1'
      - 'traefik.docker.network=proxy'

  app:
    container_name: "${PROJECT_NAME}_php"
    build:
      context: ./docker/php
      dockerfile: Dockerfile
    environment:
      PHP_MEMORY_LIMIT: '512M'
      COMPOSER_MEMORY_LIMIT: '-1'
    user: 501:501
    volumes:
      - ./:/var/www/vhost/crm:cached
    working_dir: /var/www/vhost/crm
    ports:
      - '9003:9003'
    networks:
      - crm

  redis:
    image: redis:latest
    container_name: "${PROJECT_NAME}_redis"
    ports:
      - '6379:6379'
    volumes:
      - 'crm_redis:/data'
    networks:
      - crm

  mysql:
    image: mariadb:latest
    container_name: "${PROJECT_NAME}_mysql"
    environment:
      MYSQL_ROOT_PASSWORD: '${DB_PASSWORD}'
      MYSQL_DATABASE: '${DB_DATABASE}'
      MYSQL_USER: '${DB_USERNAME}'
      MYSQL_PASSWORD: '${DB_PASSWORD}'
      MYSQL_ROOT_HOST: '%'
      MYSQL_ALLOW_EMPTY_PASSWORD: 'yes'
      command: mysqld --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    restart: always
    volumes:
      - 'crm_mysql:/data'
    ports:
      - '${FORWARD_DB_PORT:-4406}:3306'
    networks:
      - crm

  traefik:
    image: traefik:v2.0
    container_name: "${PROJECT_NAME}_traefik"
    restart: always
    command:
      - --entrypoints.web.address=:80
      - --providers.docker=true
      - --api.insecure=true
      - --log.level=debug
    volumes:
      - '/var/run/docker.sock:/var/run/docker.sock'
    ports:
      - '80:80'
      - '8080:8080'
    networks:
      - crm

networks:
  crm:
    driver: bridge

volumes:
  crm_mysql:
    driver: local

  crm_redis:
    driver: local
```

Finally what I like to do with every docker project, is create a makefile - it allows me to have easier and more convienient commands to access what I need when I need it, you do not need to do this yourself but I will include the file here:

```make
.RECIPEPREFIX +=
.DEFAULT_GOAL := help
PROJECT_NAME=jump
include .env

help:
	@echo "Welcome to $(PROJECT_NAME) IT Support, have you tried turning it off and on again?"

install:
	@composer install

test:
	@docker exec $(PROJECT_NAME)_php ./vendor/bin/pest --parallel

coverage:
	@docker exec $(PROJECT_NAME)_php ./vendor/bin/pest --coverage

migrate:
	@docker exec $(PROJECT_NAME)_php php artisan migrate

seed:
	@docker exec $(PROJECT_NAME)_php php artisan db:seed

fresh:
	@docker exec crm_php php artisan migrate:fresh

analyse:
	./vendor/bin/phpstan analyse --memory-limit=256m

generate:
	@docker exec $(PROJECT_NAME)_php php artisan ide-helper:models --write

nginx:
	@docker exec -it $(PROJECT_NAME)_nginx /bin/sh

php:
	@docker exec -it $(PROJECT_NAME)_php /bin/sh

mysql:
	@docker exec -it $(PROJECT_NAME)_mysql /bin/sh

redis:
	@docker exec -it $(PROJECT_NAME)_redis /bin/sh
```

This just contains some command that I find useful while working with docker - your mileage may vary!

If you have any questions, or think this could be simplified in anyway please feel free to reach out on twitter and let me know your thoughts.

If you want to see me walking through this set up, I have a video on youtube where I add this to a project myself:

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/5o33NtI4DyM" title="Building a Laravel CRM API - Episode 1 | JustSteveKing YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>