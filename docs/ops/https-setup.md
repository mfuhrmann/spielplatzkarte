# HTTPS setup (nginx + Let's Encrypt)

The spieli Docker stack listens on port 8080 over plain HTTP. To serve it publicly over HTTPS, use the `deploy/nginx` stack — a self-contained Docker Compose setup that runs **nginx** and **certbot**, terminating TLS and reverse-proxying to port 8080.

Because it is a separate Compose stack it works on any distro without installing anything on the host beyond Docker.

## Prerequisites

- A VM with a public IP address
- Docker Engine 20.10+ and Docker Compose v2 (`docker compose version`)
- A DNS A record pointing your domain to the server IP (e.g. `spieli.example.com → 1.2.3.4`)
- Ports 80 and 443 open in the firewall (see [Firewall](#firewall))

The spieli app stack does not need to be running first — you can set up TLS before or after.

## 1. Download and run the installer

```bash
curl -fsSL https://raw.githubusercontent.com/mfuhrmann/spieli/main/deploy/nginx/install-nginx.sh -o install-nginx.sh
bash install-nginx.sh
```

The installer prompts for your domain, email address, and app port (default 8080), then:

1. Downloads the Compose file and nginx config template
2. Starts nginx with an HTTP-only config to serve the ACME challenge
3. Runs certbot to issue a Let's Encrypt certificate via HTTP-01 challenge
4. Reloads nginx with the full HTTPS config
5. Starts the certbot container in renewal-loop mode

## 2. Install spieli

If you haven't installed the spieli app stack yet, do it now:

```bash
curl -fsSL https://raw.githubusercontent.com/mfuhrmann/spieli/main/install.sh -o install.sh
bash install.sh
```

When the installer asks for the public URL, enter `https://yourdomain.example.com`.

## Renewal

The certbot container checks for renewal every 12 hours and renews automatically when the certificate has less than 30 days remaining. The nginx container reloads its config every 6 hours to pick up renewed certificates without a restart.

No cron jobs or systemd timers needed — both loops run inside their containers and restart automatically with `restart: unless-stopped`.

To trigger a manual renewal check:

```bash
cd spieli-nginx
docker compose exec certbot certbot renew
docker compose exec nginx nginx -s reload
```

## Stopping and starting

```bash
cd spieli-nginx
docker compose down   # stop
docker compose up -d  # start (certs already exist — no need to re-run the installer)
```

## Firewall

Open ports 80 (ACME challenge) and 443 (HTTPS). Block 8080 from public access — traffic should only reach it through the nginx proxy.

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 8080/tcp
```

## Uninstall

To completely remove the nginx+certbot stack:

```bash
cd spieli-nginx

# Stop containers and delete certificate volumes
docker compose down -v

# Remove the directory and downloaded scripts
cd ..
rm -rf spieli-nginx/ install-nginx.sh
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `502 Bad Gateway` | spieli stack not running on port 8080 — run `docker compose ps` from the spieli directory |
| `host.docker.internal` not resolved | Docker Engine < 20.10 — upgrade Docker or replace with the host IP in `conf.d/app.conf` |
| Certificate challenge fails | Port 80 blocked, or DNS not yet pointing to this server |
| Mixed-content warnings | `SITE_URL` not set to `https://` — re-run the spieli installer or edit `.env` |
| Cert not renewed | Check `docker compose logs certbot` from the `spieli-nginx/` directory |
