export type MatchMode = "contains" | "exact" | "regex";

export interface FilterConfig {
  query: string;
  eventNames: string[];
  action: "include" | "exclude";
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
  exclusions: ExclusionRule[];
}

export interface ExclusionRule {
  id: string;
  pattern: string;
  mode: MatchMode;
  enabled: boolean;
  caseSensitive?: boolean;
  eventNames?: string[];
}

export interface EventCounts {
  visible: number;
  hidden: number;
  dimmed: number;
}

export interface TagAssistantEvent {
  name: string;
  element: HTMLElement;
}
