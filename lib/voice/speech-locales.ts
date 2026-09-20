/**
 * Maps the app's routing locales to the BCP-47 tags the Web Speech API wants.
 *
 * `SpeechRecognition.lang` needs a region — bare "th" or "ja" is unreliable
 * across engines — so every locale is spelled out here rather than inferred.
 */
const SPEECH_LANG_BY_LOCALE: Record<string, string> = {
    en: "en-US",
    th: "th-TH",
    lo: "lo-LA",
    my: "my-MM",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    ja: "ja-JP",
    ko: "ko-KR",
    id: "id-ID",
    es: "es-ES",
    "pt-BR": "pt-BR",
}

/**
 * Locales the browser engines do not actually recognize, whatever tag we pass.
 * Chrome's speech service has no Lao or Burmese models, so offering the mic
 * there would just produce silence or nonsense — better to hide it and let
 * those users type. They get voice back once the server-side fallback lands.
 */
const UNSUPPORTED_LOCALES: ReadonlySet<string> = new Set(["lo", "my"])

export function toSpeechLang(locale: string): string | null {
    if (UNSUPPORTED_LOCALES.has(locale)) return null
    return SPEECH_LANG_BY_LOCALE[locale] ?? "en-US"
}
