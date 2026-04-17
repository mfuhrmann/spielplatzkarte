# Troubleshooting

## Port 8080 is already in use

**Symptom:** `make up` fails with `address already in use` or `port is already allocated`.

**Fix:** Stop whatever is using port 8080, or change the port in `.env`:

```env
APP_PORT=8081
```

Then run `make up` again.

---

## Import exits immediately or fails with a database error

**Symptom:** The import finishes in seconds (normally takes minutes), or you see a `connection refused` or `role does not exist` error.

**Fix:** The database must be running before you import. Start the stack first and confirm all containers are healthy:

```bash
docker compose ps   # all containers should show "running" or "healthy"
# then run the importer — replace <mode> with your DEPLOY_MODE (data-node or data-node-ui)
docker compose --profile <mode> run --rm importer
```

If you are using the local development setup, `make import` is equivalent. If the database shows as unhealthy, try stopping and restarting the stack.

---

## Map loads but shows no playgrounds

**Symptom:** Map tiles appear (streets and buildings visible) but no playground polygons are drawn, or the detail panel is empty.

**Possible causes:**

1. **Import not run** — Run the importer after starting the stack (`docker compose --profile <mode> run --rm importer`, or `make import` for local dev). Playground data is not loaded automatically.
2. **Wrong relation ID** — Check `OSM_RELATION_ID` in `.env`. An incorrect ID filters out all playgrounds. Verify at [nominatim.openstreetmap.org](https://nominatim.openstreetmap.org).
3. **Docker stack not running** — The app requires a live PostgREST backend. Confirm the stack is running and healthy before starting `make dev`.
4. **Browser cache** — Try a hard reload: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac).

---

## Geolocation button does nothing on mobile

**Symptom:** Tapping the location button on a phone browser has no effect — no movement, no error.

**Cause:** Browsers block the geolocation API on plain HTTP connections (including local IPs like `http://192.168.1.42:8080`). This is a browser security policy and cannot be overridden in the app.

**Fix options:**

- Test geolocation on the **production HTTPS URL**.
- On Android with **Chrome**: go to `chrome://flags`, search for "Insecure origins treated as secure", add your local URL, and relaunch Chrome.
- DuckDuckGo and Brave do not offer this workaround — use Chrome for local geolocation testing.

---

## Dev server starts but changes don't appear

**Symptom:** You edited a JS or CSS file, but the browser still shows the old version.

**Fix:** Vite hot-reload should pick up changes automatically. If it doesn't:

1. Check the terminal running `make dev` — a build error will prevent the browser from updating.
2. Try a hard reload: `Ctrl+Shift+R` / `Cmd+Shift+R`.
3. If you changed `index.html` or a file in `public/`, stop and restart `make dev`.

!!! note
    When testing via `make docker-build` (the Docker stack), you must run `make docker-build` again after every change — there is no hot-reload in that mode.

---

## `make lan-url` prints "Could not detect LAN IP"

**Fix:** Run this command directly and use the output as your LAN IP:

```bash
ip route get 1 | awk '{print $7; exit}'
```

Then open `http://<that-ip>:8080` on your phone.
