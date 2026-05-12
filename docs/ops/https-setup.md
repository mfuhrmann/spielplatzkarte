# HTTPS setup (nginx + Let's Encrypt)

The spieli Docker stack listens on port 8080 over plain HTTP. To serve it publicly over HTTPS you need a TLS-terminating reverse proxy on the host. This guide uses **nginx** and **certbot** (Let's Encrypt).

This setup lives outside the Docker Compose stack intentionally — it is host-level infrastructure that you configure once per VM.

## Prerequisites

- A VM with a public IP address
- A DNS A record pointing your domain to that IP (e.g. `spieli.example.com → 1.2.3.4`)
- The spieli stack running on port 8080 (`make up`)
- Debian/Ubuntu (adapt package names for other distros)

## 1. Install nginx and certbot

```bash
apt update
apt install -y nginx certbot python3-certbot-nginx
```

## 2. Install the sample config

```bash
cp deploy/nginx/spieli.conf /etc/nginx/sites-available/spieli.conf
ln -s /etc/nginx/sites-available/spieli.conf /etc/nginx/sites-enabled/
```

Edit the file and replace every occurrence of `example.com` with your domain:

```bash
sed -i 's/example.com/spieli.example.com/g' /etc/nginx/sites-available/spieli.conf
```

Test and reload:

```bash
nginx -t && systemctl reload nginx
```

## 3. Issue the certificate

```bash
certbot --nginx -d spieli.example.com
```

Certbot will:

1. Complete the ACME HTTP-01 challenge via nginx
2. Write the certificate paths into `/etc/nginx/sites-available/spieli.conf`
3. Add an HTTP → HTTPS redirect block
4. Reload nginx

## 4. Auto-renewal

Certbot installs a systemd timer that renews certificates automatically. Verify it is active:

```bash
systemctl status certbot.timer
```

Certificates are renewed when they have less than 30 days left. You can do a dry run to confirm:

```bash
certbot renew --dry-run
```

## 5. Set SITE_URL in .env

Tell the app its public URL so the Impressum / Datenschutz links are correct:

```bash
# in .env
SITE_URL=https://spieli.example.com
```

Then rebuild the app container to pick up the change:

```bash
make docker-build
```

## Firewall

Open ports 80 (ACME renewal) and 443 (HTTPS). Port 8080 should **not** be exposed publicly — traffic should only reach it from localhost via the nginx proxy.

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 8080/tcp
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `502 Bad Gateway` | spieli stack not running on port 8080 — check `docker compose ps` |
| Certificate not renewing | Port 80 blocked by firewall — ACME challenge needs HTTP |
| Mixed-content warnings | `SITE_URL` not set or set to `http://` — must be `https://` |
