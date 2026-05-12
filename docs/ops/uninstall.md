# Uninstall

Steps to completely remove a spieli deployment from a server.

## 1. Remove the nginx+certbot stack

If you set up the nginx+certbot reverse proxy:

```bash
cd spieli-nginx

# Stop containers and delete certificate volumes
docker compose down -v

cd ..
rm -rf spieli-nginx/ install-nginx.sh
```

## 2. Remove the spieli stack

```bash
cd spieli

# Stop all containers (all profiles) and delete all volumes (database, PBF cache)
docker compose down -v

cd ..
rm -rf spieli/ install.sh
```

No `--profile` flag needed — `down` stops all running containers in the project regardless of which profile started them (including watchtower if auto-update was enabled).

## 3. Remove Docker images (optional)

```bash
docker image prune -a
```

!!! warning "This removes all unused images"
    `docker image prune -a` removes every image not referenced by a running container — not just spieli images. Skip this step if other Docker workloads are running on the same host.
