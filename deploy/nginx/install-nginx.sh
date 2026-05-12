#!/usr/bin/env bash
# spieli nginx + Let's Encrypt installer
# Downloads the reverse-proxy Compose stack and issues a TLS certificate.
#
# Usage (download first so stdin stays attached to the terminal):
#   curl -fsSL https://raw.githubusercontent.com/mfuhrmann/spieli/main/deploy/nginx/install-nginx.sh -o install-nginx.sh
#   bash install-nginx.sh

set -euo pipefail

# ── Helpers ────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { printf "${CYAN}==>${RESET} %s\n" "$*"; }
success() { printf "${GREEN}✓${RESET}  %s\n" "$*"; }
warn()    { printf "${YELLOW}!${RESET}  %s\n" "$*"; }
die()     { printf "${RED}error:${RESET} %s\n" "$*" >&2; exit 1; }

ask() {
    local var="$1" prompt="$2" default="${3:-}"
    if [[ -n "$default" ]]; then
        printf "${BOLD}%s${RESET} [%s]: " "$prompt" "$default"
    else
        printf "${BOLD}%s${RESET}: " "$prompt"
    fi
    read -r input
    if [[ -z "$input" && -n "$default" ]]; then
        printf -v "$var" '%s' "$default"
    elif [[ -n "$input" ]]; then
        printf -v "$var" '%s' "$input"
    else
        die "$prompt is required."
    fi
}

fetch() {
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$1" -o "$2"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$2" "$1"
    else
        die "Neither curl nor wget found. Please install one and retry."
    fi
}

choose_mode() {
    while true; do
        printf "\n${BOLD}── Deployment mode ─────────────────────────────────────────────${RESET}\n"
        printf "  ${BOLD}1)${RESET} data-node-ui  — full stack with UI (proxies to app on port 8080)\n"
        printf "  ${BOLD}2)${RESET} data-node     — API only (proxies PostgREST on port 3000, adds CORS)\n\n"
        printf "${BOLD}Select mode${RESET} [1-2]: "
        read -r choice
        case "$choice" in
            1) NGINX_MODE="data-node-ui"; break ;;
            2) NGINX_MODE="data-node";    break ;;
            *) warn "Please enter 1 or 2." ;;
        esac
    done
    success "Mode: ${NGINX_MODE}"
}

# ── Dependency check ───────────────────────────────────────────────────────────

for cmd in docker; do
    command -v "$cmd" >/dev/null 2>&1 || die "'$cmd' is required but not found in PATH."
done
docker compose version >/dev/null 2>&1 || die "Docker Compose plugin is not available."
docker info >/dev/null 2>&1            || die "Docker daemon is not running (or permission denied — try: sudo usermod -aG docker \$USER)."

# ── Header ─────────────────────────────────────────────────────────────────────

printf "\n"
printf "${BOLD}spieli — nginx + Let's Encrypt installer${RESET}\n"
printf "Sets up a TLS-terminating reverse proxy in front of the spieli stack.\n\n"

# ── Configuration ──────────────────────────────────────────────────────────────

ask DEPLOY_DIR "Installation directory" "./spieli-nginx"
ask DOMAIN     "Domain name pointing to this server (e.g. spieli.example.com)"
ask EMAIL      "Email address for Let's Encrypt renewal notices"
choose_mode

# ── Download files ─────────────────────────────────────────────────────────────

BASE_URL="https://raw.githubusercontent.com/mfuhrmann/spieli/main/deploy/nginx"

mkdir -p "$DEPLOY_DIR/conf.d"

info "Downloading Compose file..."
fetch "$BASE_URL/docker-compose.yml" "$DEPLOY_DIR/docker-compose.yml"

if [[ "$NGINX_MODE" == "data-node-ui" ]]; then
    info "Downloading nginx config template (data-node-ui)..."
    fetch "$BASE_URL/conf.d/app.conf.template" "$DEPLOY_DIR/conf.d/app.conf.template"
else
    info "Downloading nginx config template (data-node)..."
    fetch "$BASE_URL/conf.d/data-node.conf.template" "$DEPLOY_DIR/conf.d/app.conf.template"
fi

success "Files downloaded to $DEPLOY_DIR."

# ── Ensure shared proxy network exists ────────────────────────────────────────

if [[ "$NGINX_MODE" == "data-node" ]]; then
    docker network create spieli-proxy 2>/dev/null || true
fi

# ── Step 1: start nginx with HTTP-only config for ACME challenge ───────────────

info "Starting nginx (HTTP only) for certificate issuance..."
cat > "$DEPLOY_DIR/conf.d/app.conf" <<EOF
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

docker compose -f "$DEPLOY_DIR/docker-compose.yml" up -d nginx

# ── Step 2: issue real certificate ────────────────────────────────────────────

info "Requesting Let's Encrypt certificate for $DOMAIN..."
docker compose -f "$DEPLOY_DIR/docker-compose.yml" \
    run --rm --entrypoint="" certbot certbot certonly --webroot \
    --webroot-path /var/www/certbot \
    --email "$EMAIL" --agree-tos --no-eff-email \
    -d "$DOMAIN"

# ── Step 3: switch nginx to full HTTPS config ─────────────────────────────────

info "Switching nginx to HTTPS config..."
sed "s/example.com/$DOMAIN/g" "$DEPLOY_DIR/conf.d/app.conf.template" \
    > "$DEPLOY_DIR/conf.d/app.conf"

docker compose -f "$DEPLOY_DIR/docker-compose.yml" exec nginx nginx -s reload

# ── Step 4: start certbot renewal loop ────────────────────────────────────────

info "Starting certbot renewal loop..."
docker compose -f "$DEPLOY_DIR/docker-compose.yml" up -d certbot

# ── Done ───────────────────────────────────────────────────────────────────────

printf "\n${GREEN}${BOLD}Done!${RESET}\n\n"
printf "  HTTPS: ${CYAN}https://$DOMAIN${RESET}\n"
printf "  Dir:   ${CYAN}$(cd "$DEPLOY_DIR" && pwd)${RESET}\n\n"
printf "Useful commands (run from ${CYAN}$(cd "$DEPLOY_DIR" && pwd)${RESET}):\n"
printf "  docker compose up -d          # start\n"
printf "  docker compose down           # stop\n"
printf "  docker compose logs nginx     # nginx logs\n"
printf "  docker compose logs certbot   # renewal logs\n\n"
if [[ "$NGINX_MODE" == "data-node-ui" ]]; then
    printf "${BOLD}Next step — install spieli:${RESET}\n"
    printf "  curl -fsSL https://raw.githubusercontent.com/mfuhrmann/spieli/main/install.sh -o install.sh\n"
    printf "  bash install.sh\n\n"
    printf "${YELLOW}Tip:${RESET} when the installer asks for the public URL, enter ${BOLD}https://$DOMAIN${RESET}\n"
else
    printf "${BOLD}Next step — install spieli (data-node mode):${RESET}\n"
    printf "  curl -fsSL https://raw.githubusercontent.com/mfuhrmann/spieli/main/install.sh -o install.sh\n"
    printf "  bash install.sh\n\n"
    printf "${YELLOW}Tip:${RESET} choose ${BOLD}data-node${RESET} mode in the installer.\n"
    printf "Your API will be available at ${CYAN}https://$DOMAIN/api/${RESET}\n"
fi
