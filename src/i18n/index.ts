import settings from "../site.config.json" with { type: "json" };
import pl from "./pl.json" with { type: "json" };

export const languages = ["pl"] as const;
export type Language = (typeof languages)[number];
export type TranslationKey = keyof typeof pl;
type Dictionary = Record<TranslationKey, string>;
export const dictionaries = { pl } satisfies Record<Language, Dictionary>;

export const defaultLanguage: Language = "pl";
export const locales = { pl: "pl-PL" } as const;
export const ogLocales = { pl: "pl_PL" } as const;

export const isLanguage = (value: unknown): value is Language =>
  languages.some((language) => language === value);

export function getLanguage(value?: string): Language {
  return isLanguage(value) ? value : defaultLanguage;
}
export function getLanguageFromPath(pathname: string): Language {
  return getLanguage(pathname.split("/")[1]);
}
export function stripLanguage(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  return isLanguage(first) && first !== defaultLanguage
    ? `/${rest.join("/")}`
    : pathname;
}
export function localizePath(lang: Language, path: string): string {
  if (!path.startsWith("/") || lang === defaultLanguage) return path;
  return `/${lang}${path}`;
}

export function translate(
  lang: Language,
  key: TranslationKey,
  values: Record<string, string | number> = {},
): string {
  const dictionary: Dictionary = dictionaries[lang];
  const overrides = settings.text[lang] as Partial<Dictionary>;
  const singularKey = `${key}.one` as TranslationKey;
  const selectedKey =
    typeof values.count === "number" &&
    new Intl.PluralRules(locales[lang]).select(values.count) === "one" &&
    singularKey in dictionary
      ? singularKey
      : key;
  const text = overrides[selectedKey] ?? dictionary[selectedKey];
  if (typeof text !== "string")
    throw new Error(`Unknown translation key: ${selectedKey}`);
  const parameters = {
    site: settings.site.name,
    name: settings.author.name[lang],
    ...values,
  };
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in parameters
      ? String(parameters[name as keyof typeof parameters])
      : placeholder,
  );
}
export const useTranslations =
  (lang: Language) =>
  (key: TranslationKey, values?: Record<string, string | number>) =>
    translate(lang, key, values);

export function formatDate(
  lang: Language,
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  return new Intl.DateTimeFormat(locales[lang], {
    timeZone: "UTC",
    ...options,
  }).format(new Date(value));
}

export const languagePaths = () =>
  languages.map((lang) => ({
    params: { lang: lang === defaultLanguage ? undefined : lang },
  }));
