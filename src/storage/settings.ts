import type { ExtensionSettings } from "../types";

const STORAGE_KEY = "tagAssistantPowerToolsSettings";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  filter: {
    query: "",
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

  if (!stored) {
    return structuredClone(DEFAULT_SETTINGS);
  }

  return {
    filter: {
      ...DEFAULT_SETTINGS.filter,
      ...stored.filter
    },
    colorRules: Array.isArray(stored.colorRules)
      ? stored.colorRules
      : DEFAULT_SETTINGS.colorRules
  };
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
    callback(changes[STORAGE_KEY].newValue as ExtensionSettings);
  };

  chrome.storage.onChanged.addListener(listener);

  return () => chrome.storage.onChanged.removeListener(listener);
}
