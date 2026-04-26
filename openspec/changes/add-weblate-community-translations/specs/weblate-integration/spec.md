## ADDED Requirements

### Requirement: Weblate component discovery file

The repository SHALL contain a `.weblate.yml` file in the root that configures Weblate component auto-discovery with the following settings: file format `json-i18n`, file mask `locales/*.json`, template `locales/en.json`, source language `en`, push branch `weblate-translations`.

#### Scenario: Weblate reads component config on connect

- **WHEN** hosted.weblate.org connects to the GitHub repository
- **THEN** it discovers the translation component automatically from `.weblate.yml` without manual UI configuration of file paths or format

### Requirement: Translation updates arrive as PRs, never direct pushes

The Weblate component SHALL be configured to push translation commits to a branch named `weblate-translations` rather than directly to `main`. A pull request from `weblate-translations` to `main` SHALL be opened for maintainer review before any translation strings reach production.

#### Scenario: Translator completes strings in Weblate UI

- **WHEN** a translator saves one or more translated strings in the Weblate web UI
- **THEN** Weblate eventually pushes a commit to the `weblate-translations` branch
- **AND** a pull request from `weblate-translations` to `main` is opened (manually or via Weblate's GitHub PR integration)
- **AND** no translation change reaches `main` without maintainer review

#### Scenario: Maintainer merges translation PR

- **WHEN** the maintainer merges a PR from `weblate-translations` into `main`
- **THEN** the updated `locales/*.json` files are bundled into the next Docker build
- **AND** the changes become visible in the live app after `make docker-build`

### Requirement: Existing locale files preserved as starting points

All existing locale files in `locales/` (cs, es, fr, it, ja, nl, pl, pt, sv, uk) SHALL be retained in the repository and SHALL be imported by Weblate as partially-translated starting points. They SHALL NOT be deleted or replaced with empty files.

#### Scenario: Community translator opens an existing language

- **WHEN** a translator opens e.g. the French component in Weblate
- **THEN** they see partially pre-filled translations (from the existing auto-generated `fr.json`)
- **AND** they can review, correct, and complete the strings rather than starting from blank

### Requirement: ICU plural forms presented correctly in Weblate UI

The `json-i18n` format MUST be used (not `json-nested`) so that Weblate presents ICU plural strings as separate form fields per plural rule, not as a single opaque string.

#### Scenario: Translator handles a plural string

- **WHEN** a translator opens a key containing `{count, plural, one {...} other {...}}`
- **THEN** Weblate presents separate input fields for each plural form defined by the target language's plural rules
- **AND** the translator does not need to write raw ICU syntax manually
