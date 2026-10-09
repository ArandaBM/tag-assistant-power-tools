export type MatchMode = "contains" | "exact" | "regex";

export interface FilterConfig {
  query: string;
  mode: MatchMode;
  hideUnmatched: boolean;
  caseSensitive: boolean;
}

export interface ColorRule {
  id: string;
  pattern: string;
  mode: MatchMode;
  color: string;
  enabled: boolean;
  caseSensitive: boolean;
}

export interface ExtensionSettings {
  filter: FilterConfig;
  colorRules: ColorRule[];
}

export interface TagAssistantEvent {
  name: string;
  element: HTMLElement;
}
