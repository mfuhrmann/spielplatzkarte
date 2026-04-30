# Translating spieli

Thanks for helping translate spieli! This guide explains everything you need to know.

## What is spieli?

spieli is a free, interactive playground map based on OpenStreetMap data.
Your translation makes it accessible to communities in your language.

## How to translate

1. Create a free account on [hosted.weblate.org](https://hosted.weblate.org)
2. Open the **spieli** project and pick your language
3. Click any untranslated string and type your translation
4. Save — that's it. No GitHub account needed.

## What to translate

Most strings are short UI labels like buttons, tooltips, and status messages:

| English | Example translation (DE) |
|---|---|
| `Show my location` | `Meinen Standort anzeigen` |
| `Filter` | `Filter` |
| `Reset all` | `Alle zurücksetzen` |

## Plural forms

Some strings contain a count, like:

```
{count, plural, one {# bench} other {# benches}}
```

Keep the `{count, plural, ...}` wrapper and translate only the text inside:

```
{count, plural, one {# Sitzbank} other {# Sitzbänke}}
```

If your language has more than two plural forms (e.g. Polish, Czech),
Weblate will show you the correct number of fields automatically.

## Things to keep as-is

- Placeholders like `{regionName}`, `{count}`, `{name}` — do not translate these
- The `{count, plural, one {...} other {...}}` structure — only translate the text inside the `{}`

## When does my translation go live?

A language appears in the app once it reaches **80% completion**.
Until then your work is saved and visible to other translators.

## Questions?

Open an issue at [github.com/mfuhrmann/spieli](https://github.com/mfuhrmann/spieli)
or leave a comment directly in Weblate.
