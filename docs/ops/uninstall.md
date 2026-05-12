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

# Stop containers and delete all volumes (database, PBF cache)
docker compose --profile data-node-ui down -v

cd ..
rm -rf spieli/ install.sh
```

Replace `data-node-ui` with the profile you chose at install time (`data-node` or `ui`). Check your `.env` for `DEPLOY_MODE` if unsure.

## 3. Remove Docker images (optional)

```bash
docker image prune -a
```

!!! warning "This removes all unused images"
    `docker image prune -a` removes every image not referenced by a running container — not just spieli images. Skip this step if other Docker workloads are running on the same host.
