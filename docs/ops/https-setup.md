# HTTPS setup (nginx + Let's Encrypt)

The spieli Docker stack listens on port 8080 over plain HTTP. To serve it publicly over HTTPS, use the `deploy/nginx` stack — a self-contained Docker Compose setup that runs **nginx** and **certbot** alongside the app, terminating TLS and reverse-proxying to port 8080.

Because it is a separate Compose stack it works on any distro without installing anything on the host beyond Docker.

## Prerequisites

- A VM with a public IP address
- Docker Engine 20.10+ and Docker Compose v2 (`docker compose version`)
- A DNS A record pointing your domain to the server IP (e.g. `spieli.example.com → 1.2.3.4`)
- The spieli app stack running on port 8080 (`make up` from the repo root)
- Ports 80 and 443 open in the firewall (see [Firewall](#firewall))

## 1. Run the init script

```bash
cd deploy/nginx
chmod +x init.sh
./init.sh spieli.example.com admin@example.com
```

The script:

1. Generates `conf.d/app.conf` from the template with your domain substituted
2. Creates a temporary self-signed certificate so nginx can start
3. Starts the nginx container
4. Runs certbot to issue a real Let's Encrypt certificate via the ACME HTTP-01 challenge
5. Reloads nginx with the real certificate
6. Starts the certbot container in renewal-loop mode

## 2. Set SITE_URL in .env

Tell the app its public URL so Impressum / Datenschutz links are correct:

```bash
# .env (repo root)
SITE_URL=https://spieli.example.com
```

Rebuild the app container to pick up the change:

```bash
make docker-build
```

## Renewal

The certbot container checks for renewal every 12 hours and renews automatically when the certificate has less than 30 days remaining. The nginx container reloads its config every 6 hours to pick up renewed certificates without a restart.

No cron jobs or systemd timers needed — both loops run inside their containers and restart automatically with `restart: unless-stopped`.

To trigger a manual renewal check:

```bash
cd deploy/nginx
docker compose exec certbot certbot renew
docker compose exec nginx nginx -s reload
```

## Stopping and starting

```bash
cd deploy/nginx
docker compose down   # stop
docker compose up -d  # start (certs already exist — no need to re-run init.sh)
```

## Firewall

Open ports 80 (ACME challenge) and 443 (HTTPS). Block 8080 from public access — traffic should only reach it through the nginx proxy.

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 8080/tcp
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `502 Bad Gateway` | spieli stack not running on port 8080 — run `docker compose ps` from repo root |
| `host.docker.internal` not resolved | Docker Engine < 20.10 — upgrade Docker or replace with the host IP in `conf.d/app.conf` |
| Certificate challenge fails | Port 80 blocked, or DNS not yet pointing to this server |
| Mixed-content warnings | `SITE_URL` not set to `https://` — rebuild with `make docker-build` |
| Cert not renewed | Check `docker compose logs certbot` from `deploy/nginx/` |
