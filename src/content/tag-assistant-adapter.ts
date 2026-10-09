import type { TagAssistantEvent } from "../types";

const SYSTEM_EVENTS = new Set([
  "Initialization",
  "Consent Initialization",
  "Container Loaded",
  "DOM Ready",
  "Window Loaded"
]);

const EXCLUDED_LABELS = new Set([
  "Summary",
  "Tags",
  "Variables",
  "Data Layer",
  "Consent",
  "Errors",
  "Messages",
  "History",
  "Overview"
]);

export class TagAssistantAdapter {
  public findEvents(): TagAssistantEvent[] {
    const candidates = this.findCandidateElements();
    const events: TagAssistantEvent[] = [];
    const processed = new Set<HTMLElement>();

    for (const element of candidates) {
      if (processed.has(element)) continue;
      if (element.closest("[data-tae-extension-root]")) continue;

      const name = this.extractEventName(element);
      if (!name || !this.looksLikeEventName(name)) continue;

      processed.add(element);
      events.push({ name, element });
    }

    return events;
  }

  private findCandidateElements(): HTMLElement[] {
    const selectors = [
      "[data-event-name]",
      "[data-event]",
      '[role="listitem"]',
      '[role="treeitem"]',
      "li",
      "tr"
    ];

    const result = new Set<HTMLElement>();

    for (const selector of selectors) {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        result.add(element);
      });
    }

    return Array.from(result);
  }

  private extractEventName(element: HTMLElement): string | null {
    const explicitEventName = element.dataset.eventName;
    if (explicitEventName) return explicitEventName.trim();

    const eventAttribute = element.getAttribute("data-event");
    if (eventAttribute) return eventAttribute.trim();

    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      const match = ariaLabel.match(/event\s*:?\s*(.+)/i);
      if (match) return match[1].trim();
    }

    return this.extractFromText(element.innerText);
  }

  private extractFromText(text: string): string | null {
    if (!text) return null;

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (/^\d+$/.test(line)) continue;
      if (this.looksLikeEventName(line)) return line;
    }

    return null;
  }

  private looksLikeEventName(value: string): boolean {
    const name = value.trim();

    if (!name || name.length > 80 || EXCLUDED_LABELS.has(name)) return false;
    if (SYSTEM_EVENTS.has(name)) return true;

    // Keep this heuristic isolated here. The live Tag Assistant DOM may change.
    return /^[A-Za-z][A-Za-z0-9_.:-]{1,79}$/.test(name);
  }
}
