import type { ColorRule, ExtensionSettings, FilterConfig, MatchMode } from "../types";

export function getEventVisibility(
  eventName: string,
  settings: ExtensionSettings,
  showAll = false
): "visible" | "hidden" | "dimmed" {
  if (showAll) return "visible";
  // Blank rules are drafts, not a request to exclude the entire stream.
  if (settings.exclusions.some((rule) => rule.enabled && (rule.pattern.trim() || rule.eventNames?.length) &&
      (!rule.eventNames?.length || rule.eventNames.includes(eventName)) &&
      matchesPattern(eventName, rule.pattern, rule.mode, rule.caseSensitive))) return "hidden";
  if (eventMatchesFilter(eventName, settings.filter)) return "visible";
  return settings.filter.hideUnmatched ? "hidden" : "dimmed";
}

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
  const names = filter.eventNames ?? [];
  if (!filter.query.trim() && names.length === 0) return true;

  const matches = (names.length === 0 || names.includes(eventName)) && matchesPattern(
    eventName,
    filter.query,
    filter.mode,
    filter.caseSensitive
  );
  return filter.action === "exclude" ? !matches : matches;
}

export function findColorRule(
  eventName: string,
  rules: ColorRule[]
): ColorRule | undefined {
  return rules.find(
    (rule) =>
      rule.enabled &&
      rule.pattern.trim().length > 0 &&
      matchesPattern(eventName, rule.pattern, rule.mode, rule.caseSensitive)
  );
}
