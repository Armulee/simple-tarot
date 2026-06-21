# Internationalization (i18n) — Askingfate

Askingfate uses **next-intl**. This doc covers the supported locales, how the
AI responds in the user's language, and the current translation status.

## Supported locales

Configured in `i18n/routing.ts` and `i18n/request.ts`:

| Code    | Language               | Native name        |
| ------- | ---------------------- | ------------------ |
| `en`    | English                | English            |
| `th`    | Thai                   | ไทย                |
| `lo`    | Lao                    | ລາວ                |
| `zh-CN` | Chinese (Simplified)   | 简体中文           |
| `zh-TW` | Chinese (Traditional)  | 繁體中文           |
| `ja`    | Japanese               | 日本語             |
| `ko`    | Korean                 | 한국어             |
| `id`    | Indonesian             | Bahasa Indonesia   |
| `es`    | Spanish                | Español            |
| `pt-BR` | Portuguese (Brazil)    | Português (Brasil) |
| `my`    | Burmese (Myanmar)      | မြန်မာ             |

`defaultLocale` is `en`; `localePrefix` is `as-needed`. The locale switcher in
`components/navbar/index.tsx` iterates `routing.locales` automatically and shows
each language's native name from the `Languages` namespace in the message files,
so adding a locale to `routing.locales` (plus a `Languages` entry) is all that's
needed to surface it in the UI.

`proxy.ts` (the next-intl middleware) detects the locale from the `NEXT_LOCALE`
cookie or `Accept-Language`, and now matches both region-coded tags (`zh-CN`,
`pt-BR`) and bare language codes.

## Message files

One namespaced JSON file per locale in `messages/<locale>.json`, mirroring the
key structure of `en.json` (the source of truth, ~2,237 leaf keys). Every locale
file carries the complete `en.json` key set — missing keys break next-intl at
runtime, so keep new keys in sync across all locales when editing.

## AI response language (Phase 3)

The AI must reply in the user's chosen language — including the correct Chinese
script (`zh-CN` vs `zh-TW`) and Portuguese variant (`pt-BR`). This is driven by
`lib/i18n/ai-language.ts`:

- `LOCALE_TO_AI_LANGUAGE` maps each locale to an explicit prompt phrase
  (e.g. `zh-CN → "Simplified Chinese"`, `pt-BR → "Brazilian Portuguese"`).
- `resolveResponseLanguage(locale, text)` prefers the UI locale and falls back to
  script detection of the user's text when no locale is supplied.

The active locale flows **frontend → API route → LLM prompt**. The following API
routes consume it (replacing the old per-route `detectQuestionLanguage` copies):
`chat`, `chat/question`, `chat/respond`, `interpret-cards/question`,
`horoscope/question`, `horoscope/timeline`, `horoscope/verdict`.

## Translation status (machine translation — needs native review)

All locale files are **structurally complete** (no missing keys). Approximate
translation coverage of the newly added locales (remaining % are values that are
intentionally identical to English — brand name, social-platform names, URLs,
plan names, format placeholders):

| Locale  | Coverage |
| ------- | -------- |
| `zh-CN` | ~99%     |
| `zh-TW` | ~99%     |
| `ja`    | ~98%     |
| `ko`    | ~98%     |
| `es`    | ~97%     |
| `pt-BR` | ~97%     |
| `my`    | ~97%     |
| `id`    | ~95%     |

**All machine translations should get a native-speaker review**, especially:
- Burmese (`my`) — lower-resource; the long-form BirthChart astrology prose and
  Vedic/Western dignity & aspect terms in particular.
- The condensed/templated `BirthChart.planetInHouse.*` / `planetInSign.*` strings
  in `zh-CN` (and other locales) — accurate but more concise than the English.
- The legal/consent blocks (`StarConsent.modal.liabilityBody`, `religiousBody`)
  in every locale — formal/juridical register.
- Astrology vocabulary (Rahu/Ketu, exalted/debilitated/retrograde, aspect names)
  which varies by community in several languages.

Card-draw microcopy in `components/chat/card-ui.ts` (`CARD_UI_TEXT`) is still only
defined for `en` / `th` / `lo`; other locales fall back to English there. That is a
known follow-up, separate from the next-intl message files.
