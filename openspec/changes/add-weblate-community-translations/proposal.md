## Why

UI strings in spieli are hardcoded German with only DE and EN supported, making the app inaccessible to non-German-speaking communities who discover it through OSM. Weblate gives community translators a web UI to contribute new languages without needing GitHub access, turning translation into a self-service OSM community activity.

## What Changes

- Add a `.weblate.yml` component-discovery config to the repo root so hosted.weblate.org can auto-detect the translation component
- Register the project on hosted.weblate.org (free OSS tier) as "spieli", linked to the GitHub repo via webhook
- Configure Weblate to use EN as the source language and `locales/en.json` as the template, with `json-i18n` format (ICU plural-aware)
- Keep existing `locales/*.json` files (cs, es, fr, it, ja, nl, pl, pt, sv, uk) as partial starting points for community translators
- Weblate pushes translation updates to a dedicated `weblate-translations` branch; maintainer merges via PR (never direct to `main`)
- Document language graduation threshold: when a language reaches ≥ 80% translated in Weblate, add it to `SUPPORTED` in `i18n.js` and add a `register()` call

## Capabilities

### New Capabilities

- `weblate-integration`: Weblate component config, repo webhook, push-branch PR workflow, and language graduation process

### Modified Capabilities

- `i18n-language-support`: graduation threshold added — new languages go live in the app only once they reach ≥ 80% completion in Weblate

## Impact

- **New file**: `.weblate.yml` in repo root (Weblate component discovery)
- **`app/src/lib/i18n.js`**: updated when new languages graduate (≥ 80% complete)
- **`locales/`**: new language JSON files added over time via Weblate PRs
- **External dependency**: hosted.weblate.org account and project setup (one-time manual step)
- **Sequencing**: should be set up after issue #249 (project rename to "spieli") so the Weblate project name matches the final repo name
- **No changes** to the JSON translation format — the existing nested ICU structure is already compatible with Weblate's `json-i18n` format
