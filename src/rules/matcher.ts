import type { ColorRule, FilterConfig, MatchMode } from "../types";

export function matchesPattern(
  value: string,
  pattern: string,
  mode: MatchMode,
  caseSensitive = false
): boolean {
  const cleanPattern = pattern.trim();
  if (!cleanPattern) return true;

  if (mode === "regex") {
    try {
      return new RegExp(cleanPattern, caseSensitive ? "" : "i").test(value);
    } catch {
      return false;
    }
  }

  const source = caseSensitive ? value : value.toLowerCase();
  const target = caseSensitive ? cleanPattern : cleanPattern.toLowerCase();

  if (mode === "exact") return source === target;
  return source.includes(target);
}

export function eventMatchesFilter(
  eventName: string,
  filter: FilterConfig
): boolean {
  if (!filter.query.trim()) return true;

  return matchesPattern(
    eventName,
    filter.query,
    filter.mode,
    filter.caseSensitive
  );
}

export function findColorRule(
  eventName: string,
  rules: ColorRule[]
): ColorRule | undefined {
  return rules.find(
    (rule) =>
      rule.enabled &&
      matchesPattern(eventName, rule.pattern, rule.mode, rule.caseSensitive)
  );
}
