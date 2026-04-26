## Context

spieli currently supports DE and EN via `svelte-i18n` with flat JSON files using ICU message format (`locales/de.json`, `locales/en.json`, ~320 keys each). Ten additional locale files exist in `locales/` from a previous attempt (cs, es, fr, it, ja, nl, pl, pt, sv, uk) but are auto-generated and not registered in `i18n.js`. There is no external translation tooling — strings are edited directly in the repo.

The goal is to invite OSM community translators to contribute new languages. Translators in this context are non-developers who should not need GitHub access or knowledge of ICU syntax.

**Constraint**: Setup should happen after issue #249 (project rename to "spieli") so the Weblate project name is consistent with the final repo and DNS name.

## Goals / Non-Goals

**Goals:**
- Enable community translation contributions via a web UI (no GitHub access required)
- Keep translation PRs in the maintainer's review queue — no direct pushes to `main`
- Support existing `locales/*.json` format with zero changes to file structure
- Provide a clear threshold for when a new language goes live in the app

**Non-Goals:**
- Automated language promotion (adding to `SUPPORTED` stays a manual maintainer decision)
- Self-hosted Weblate infrastructure
- Changing the JSON translation format or ICU syntax

## Decisions

### 1. EN as Weblate source language (not DE)

**Decision**: `locales/en.json` is the Weblate template; translators work from English.

**Rationale**: The vast majority of community translators on hosted.weblate.org work from English. Using DE as source would require translators to know German grammar — a significant barrier, especially for e.g. Japanese or Czech contributors. The German genitive suffix in `{regionName}er spieli` (vs. `{regionName} Playground Map` in EN) illustrates the problem concretely.

**Trade-off**: The maintainer must keep `locales/en.json` and `locales/de.json` in sync manually (as they do today). Weblate treats DE as a translation like any other, but the maintainer edits it directly in the repo rather than via Weblate UI.

**Alternative considered**: DE as source. Rejected — see rationale above.

### 2. hosted.weblate.org, free OSS tier

**Decision**: Use hosted.weblate.org rather than self-hosted Weblate.

**Rationale**: spieli qualifies as a libre open-source project. Zero infrastructure to maintain. Weblate handles GitHub webhook integration, translation memory, machine translation suggestions, and quality checks out of the box.

**Alternative considered**: Self-hosted Weblate (Docker). Rejected — adds operational burden with no benefit for a volunteer-maintained project.

### 3. `json-i18n` file format (not `json-nested`)

**Decision**: Configure the Weblate component with file format `json-i18n`.

**Rationale**: The locale files use ICU message format for plurals (`{count, plural, one {# Spielgerät} other {# Spielgeräte}}`). Weblate's plain `json-nested` format treats these as opaque strings, losing plural form awareness. `json-i18n` understands ICU syntax and presents plural forms as separate translation fields in the UI.

**Risk**: ICU plural syntax in Weblate requires translators to understand the `{count, plural, ...}` pattern for their target language's plural rules (e.g. Slavic languages have 3–4 plural forms). Weblate surfaces this automatically in the UI, so it's manageable.

### 4. Push to dedicated branch, merge via PR

**Decision**: Weblate pushes translation commits to a `weblate-translations` branch. A PR from that branch to `main` is opened for maintainer review.

**Rationale**: Matches the project's `Never push directly to main` policy (CLAUDE.md). Maintainer can review, squash, and merge on their own schedule. Prevents unreviewed strings landing in production.

**Configuration**: In Weblate project settings, set "Push branch" to `weblate-translations`. The Weblate GitHub integration can open PRs automatically, or the maintainer creates them manually.

### 5. 80% completion threshold for language graduation

**Decision**: A language is added to `SUPPORTED` in `i18n.js` (and becomes visible in the app) only when it reaches ≥ 80% translated strings in Weblate.

**Rationale**: A language at 30% completion produces a jarring mixed-language UI. 80% ensures most screens are fully translated before users encounter the language. The threshold is documented in the Weblate project description so translators know the bar.

**Note**: The maintainer adds the language manually: add to `SUPPORTED` array in `i18n.js`, add a `register()` call, and add a `register()` call targeting `locales/<lang>.json`.

### 6. Old locale files kept as starting points

**Decision**: Retain `locales/cs.json`, `es.json`, `fr.json`, `it.json`, `ja.json`, `nl.json`, `pl.json`, `pt.json`, `sv.json`, `uk.json`.

**Rationale**: Even auto-generated translations provide a starting point and populate Weblate's translation memory. Weblate quality checks flag suspicious strings. Community translators benefit from having something to review rather than a blank slate.

## Risks / Trade-offs

- **Stale EN/DE sync**: If a new string is added to `de.json` but not `en.json`, Weblate won't surface it to translators. Mitigation: treat EN as the authoritative source; add new strings to `en.json` first, then `de.json`.
- **ICU plural complexity**: Languages with complex plural rules (Polish, Russian, Arabic) require translators to handle multiple forms. Weblate guides this but can't prevent wrong plural patterns. Mitigation: Weblate's built-in plural validation catches most errors.
- **Weblate PR flood**: Active translation periods may produce frequent PRs. Mitigation: Weblate batches commits; "Squash commits" option in Weblate settings keeps PR history clean.
- **`.weblate.yml` format drift**: Weblate's discovery file format may differ by version. Mitigation: verify exact YAML schema against hosted.weblate.org docs at setup time.

## Migration Plan

1. Wait for issue #249 (rename to "spieli") to land
2. Register on hosted.weblate.org, create project "spieli" linked to the GitHub repo
3. Add `.weblate.yml` to repo root (component discovery config)
4. Configure component: file format `json-i18n`, template `locales/en.json`, push branch `weblate-translations`
5. Weblate imports existing locale files — translators see partially-completed languages
6. Document graduation threshold in Weblate project description
7. As languages reach 80%: open PR to add them to `i18n.js`
