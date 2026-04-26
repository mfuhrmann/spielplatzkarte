## 1. Prerequisites

- [ ] 1.1 Confirm issue #249 (project rename to "spieli") is merged before proceeding — Weblate project name must match final repo name
- [ ] 1.2 Register on hosted.weblate.org and create project named "spieli" (libre OSS plan)
- [ ] 1.3 Connect the GitHub repo to Weblate via deploy key and webhook (Weblate guided setup)

## 2. Repository Config

- [ ] 2.1 Add `.weblate.yml` to repo root: file format `json-i18n`, file mask `locales/*.json`, template `locales/en.json`, source language `en`, push branch `weblate-translations`
- [ ] 2.2 Verify Weblate detects the component automatically from `.weblate.yml` after connecting (check Weblate component list)
- [ ] 2.3 Confirm Weblate imports all existing `locales/*.json` files including the partial translations (cs, es, fr, it, ja, nl, pl, pt, sv, uk)

## 3. Weblate Component Configuration

- [ ] 3.1 Set push branch to `weblate-translations` in Weblate component settings
- [ ] 3.2 Enable "Squash commits" in Weblate to keep PR history clean
- [ ] 3.3 Verify ICU plural strings (e.g. `equipment.deviceCount`) appear as separate plural-form fields in the Weblate editor, not as a single raw string
- [ ] 3.4 Add graduation threshold to Weblate project description: "Languages are enabled in the app once they reach ≥ 80% completion"

## 4. PR Workflow Verification

- [ ] 4.1 Make a test translation change in Weblate and confirm it pushes to `weblate-translations` branch (not `main`)
- [ ] 4.2 Confirm a PR from `weblate-translations` → `main` can be opened and merged following the normal review workflow
- [ ] 4.3 After merging a test PR, confirm the updated locale file is present in `main` and `make docker-build` picks it up

## 5. Developer Workflow Documentation

- [ ] 5.1 Add a note to the contributing guide (or docs) explaining: new strings go to `en.json` first, then `de.json` in the same commit
- [ ] 5.2 Document language graduation process: when a language hits 80% in Weblate, open a PR adding it to `SUPPORTED` in `i18n.js` with a `register()` call
