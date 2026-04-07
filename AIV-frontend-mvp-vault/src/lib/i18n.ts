import { en } from "./i18n/en";

type NestedRecord = { [key: string]: string | NestedRecord };

/**
 * Resolve a dot-separated key from a nested object.
 * Returns the key itself as fallback if not found.
 */
function resolve(obj: NestedRecord, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

/**
 * Translate a key to its localized string.
 * Uses dot-notation: t("auth.signin.title") → "Sign In"
 * Falls back to the key itself if not found.
 */
export function t(key: string): string {
  return resolve(en as unknown as NestedRecord, key);
}

/**
 * React hook that returns the translation function.
 * Designed for future locale-switching support.
 */
export function useTranslation() {
  return { t };
}
