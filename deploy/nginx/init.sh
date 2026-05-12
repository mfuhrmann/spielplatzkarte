#!/usr/bin/env bash
# First-run script: issue a Let's Encrypt certificate and start the stack.
# Usage: ./init.sh <domain> <email> [data-node-ui|data-node]
# Example: ./init.sh play.example.com admin@example.com data-node-ui
set -euo pipefail

DOMAIN=${1:?usage: ./init.sh <domain> <email> [data-node-ui|data-node]}
EMAIL=${2:?usage: ./init.sh <domain> <email> [data-node-ui|data-node]}
MODE=${3:-data-node-ui}

cd "$(dirname "$0")"

# Select the right config template
case "$MODE" in
    data-node-ui) TEMPLATE="conf.d/app.conf.template" ;;
    data-node)    TEMPLATE="conf.d/data-node.conf.template" ;;
    *) echo "error: MODE must be data-node-ui or data-node" >&2; exit 1 ;;
esac

cd "$(dirname "$0")"

# ── Step 1: start nginx with HTTP-only config for ACME challenge ───────────────

echo "==> Generating HTTP-only nginx config for $DOMAIN"
cat > conf.d/app.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 200 'spieli — TLS setup in progress';
        add_header Content-Type text/plain;
    }
}
EOF

echo "==> Starting nginx"
docker compose up -d nginx

# ── Step 2: issue real certificate ────────────────────────────────────────────

echo "==> Requesting Let's Encrypt certificate for $DOMAIN"
docker compose run --rm --entrypoint="" certbot certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN"

# ── Step 3: switch nginx to full HTTPS config ─────────────────────────────────

echo "==> Switching nginx to HTTPS config"
sed "s/example.com/$DOMAIN/g" "$TEMPLATE" > conf.d/app.conf
docker compose exec nginx nginx -s reload

# ── Step 4: start certbot renewal loop ────────────────────────────────────────

echo "==> Starting certbot renewal loop"
docker compose up -d certbot

echo ""
if [[ "$MODE" == "data-node-ui" ]]; then
    echo "Done. spieli is live at https://$DOMAIN"
    echo "Remember to set SITE_URL=https://$DOMAIN in your .env and run: make docker-build"
else
    echo "Done. API is live at https://$DOMAIN/api/"
fi
