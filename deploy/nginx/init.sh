#!/usr/bin/env bash
# First-run script: issue a Let's Encrypt certificate and start the stack.
# Usage: ./init.sh <domain> <email>
# Example: ./init.sh play.example.com admin@example.com
set -euo pipefail

DOMAIN=${1:?usage: ./init.sh <domain> <email>}
EMAIL=${2:?usage: ./init.sh <domain> <email>}

cd "$(dirname "$0")"

echo "==> Generating nginx config for $DOMAIN"
sed "s/example.com/$DOMAIN/g" conf.d/app.conf.template > conf.d/app.conf

echo "==> Creating temporary self-signed certificate (so nginx can start)"
docker compose run --rm --entrypoint="" certbot sh -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out  /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost' 2>/dev/null
  echo 'Dummy cert created.'"

echo "==> Starting nginx"
docker compose up -d nginx

echo "==> Requesting Let's Encrypt certificate for $DOMAIN"
docker compose run --rm certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN"

echo "==> Reloading nginx with real certificate"
docker compose exec nginx nginx -s reload

echo "==> Starting certbot renewal loop"
docker compose up -d certbot

echo ""
echo "Done. spieli is live at https://$DOMAIN"
echo "Remember to set SITE_URL=https://$DOMAIN in your .env and run: make docker-build"
