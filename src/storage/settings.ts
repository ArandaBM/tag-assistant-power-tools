import type { ExtensionSettings } from "../types";

const STORAGE_KEY = "tagAssistantPowerToolsSettings";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  exclusions: [],
  filter: {
    query: "",
    eventNames: [],
    action: "include",
    mode: "contains",
    hideUnmatched: true,
    caseSensitive: false
  },
  colorRules: [
    {
      id: "default-purchase",
      pattern: "purchase",
      mode: "exact",
      color: "#22C55E",
      enabled: true,
      caseSensitive: false
    },
    {
      id: "default-error",
      pattern: "error",
      mode: "contains",
      color: "#EF4444",
      enabled: true,
      caseSensitive: false
    }
  ]
};

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<ExtensionSettings> | undefined;

  const settings = normalizeSettings(stored);
  if (stored?.filter?.action === "exclude") await saveSettings(settings);
  return settings;
}

function normalizeSettings(stored?: Partial<ExtensionSettings>): ExtensionSettings {
  const settings: ExtensionSettings = {
    filter: {
      ...DEFAULT_SETTINGS.filter,
      ...stored?.filter,
      eventNames: Array.isArray(stored?.filter?.eventNames)
        ? [...new Set(stored.filter.eventNames.filter((name) => typeof name === "string" && name.trim()))]
        : []
    },
    colorRules: Array.isArray(stored?.colorRules)
      ? stored.colorRules
      : structuredClone(DEFAULT_SETTINGS.colorRules),
    exclusions: Array.isArray(stored?.exclusions) ? structuredClone(stored.exclusions) : []
  };
  // Preserve old negative filters as a saved exclusion, including the
  // intersection of exact selected names with a manually entered pattern.
  if (settings.filter.action === "exclude") {
    const { query, mode, caseSensitive, eventNames } = settings.filter;
    if (query.trim() || eventNames.length) {
      settings.exclusions.push({ id: crypto.randomUUID(), pattern: query,
        mode, caseSensitive, eventNames: [...eventNames], enabled: true });
    }
    settings.filter = { ...settings.filter, action: "include", query: "", eventNames: [] };
  }
  return settings;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

export function subscribeToSettings(
  callback: (settings: ExtensionSettings) => void
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== "sync" || !changes[STORAGE_KEY]) return;
    callback(normalizeSettings(changes[STORAGE_KEY].newValue as Partial<ExtensionSettings> | undefined));
  };

  chrome.storage.onChanged.addListener(listener);

  return () => chrome.storage.onChanged.removeListener(listener);
}
