import type { TagAssistantEvent } from "../types";

const SYSTEM_EVENTS = new Set([
  "Initialization",
  "Consent Initialization",
  "Container Loaded",
  "DOM Ready",
  "Window Loaded",
  "History Change",
  "Click",
  "Form Submit",
  "Timer",
  "JavaScript Error",
  "YouTube Video"
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
  "Overview",
  "Output",
  "Inputs",
  "Close",
  "Back",
  "Connect",
  "Disconnect",
  "Continue",
  "Refresh",
  "Search",
  "Filter"
]);

interface ParsedRow {
  name: string;
  sequence?: string;
}

interface RowCandidate extends ParsedRow {
  element: HTMLElement;
  area: number;
}

export class TagAssistantAdapter {
  private loggedEmptyState = false;

  public findEvents(): TagAssistantEvent[] {
    const candidates = [
      ...this.findStructuredRows(),
      ...this.findLeafFallbackRows()
    ];

    const deduped = this.dedupeCandidates(candidates);

    for (const candidate of deduped) {
      candidate.element.setAttribute("data-tae-event-row", "true");
      candidate.element.setAttribute("data-tae-event-name", candidate.name);
    }

    if (deduped.length === 0) {
      this.logDiagnosticsOnce();
    } else {
      this.loggedEmptyState = false;
    }

    return deduped.map(({ name, element }) => ({ name, element }));
  }

  private findStructuredRows(): RowCandidate[] {
    const selectors = [
      '[data-tae-event-row="true"]',
      "[data-event-name]",
      "[data-event]",
      "button",
      '[role="button"]',
      '[role="listitem"]',
      '[role="treeitem"]',
      '[role="option"]',
      "[tabindex]"
    ];

    const elements = new Set<HTMLElement>();

    for (const selector of selectors) {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        elements.add(element);
      });
    }

    const result: RowCandidate[] = [];

    for (const element of elements) {
      if (this.isExtensionElement(element)) continue;

      const parsed = this.parseCandidate(element);
      if (!parsed) continue;
      if (!this.isPlausibleRow(element)) continue;

      result.push({
        ...parsed,
        element,
        area: this.getArea(element)
      });
    }

    return result;
  }

  private findLeafFallbackRows(): RowCandidate[] {
    const result: RowCandidate[] = [];
    const leaves = document.querySelectorAll<HTMLElement>("span, div, p");

    for (const leaf of leaves) {
      if (this.isExtensionElement(leaf)) continue;
      if (leaf.childElementCount > 2) continue;

      const name = this.getCompactText(leaf);
      if (!this.looksLikeStandaloneEventName(name)) continue;

      const row = this.findNearestRow(leaf, name);
      if (!row) continue;

      const parsed = this.parseCandidate(row) ?? { name };

      result.push({
        name: parsed.name,
        sequence: parsed.sequence,
        element: row,
        area: this.getArea(row)
      });
    }

    return result;
  }

  private findNearestRow(start: HTMLElement, expectedName: string): HTMLElement | null {
    let current: HTMLElement | null = start;

    for (let depth = 0; current && depth < 7; depth += 1) {
      if (current === document.body) break;
      if (this.isExtensionElement(current)) return null;

      const storedName = current.getAttribute("data-tae-event-name");
      if (storedName === expectedName) return current;

      const parsed = this.parseStructuredText(current);
      if (
        parsed?.name === expectedName &&
        this.isPlausibleRow(current)
      ) {
        return current;
      }

      if (
        this.isInteractive(current) &&
        this.isPlausibleRow(current) &&
        this.elementContainsName(current, expectedName)
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  private parseCandidate(element: HTMLElement): ParsedRow | null {
    const storedName = element.getAttribute("data-tae-event-name");
    if (storedName && element.hasAttribute("data-tae-event-row")) {
      const structured = this.parseStructuredText(element);
      return structured ?? { name: storedName };
    }

    const explicitEventName = element.dataset.eventName;
    if (explicitEventName) {
      return { name: explicitEventName.trim() };
    }

    const eventAttribute = element.getAttribute("data-event");
    if (eventAttribute) {
      return { name: eventAttribute.trim() };
    }

    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      const ariaMatch = ariaLabel.match(/event\s*:?\s*(.+)/i);
      if (ariaMatch) {
        const name = ariaMatch[1].trim();
        if (this.isAllowedName(name)) return { name };
      }
    }

    return this.parseStructuredText(element);
  }

  private parseStructuredText(element: HTMLElement): ParsedRow | null {
    const lines = this.getTextLines(element);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      const combinedMatch = line.match(/^(\d{1,4})\s+(.+)$/);
      if (combinedMatch) {
        const name = combinedMatch[2].trim();
        if (this.isAllowedName(name)) {
          return {
            sequence: combinedMatch[1],
            name
          };
        }
      }

      if (/^\d{1,4}$/.test(line)) {
        const nextLine = lines[index + 1];
        if (nextLine && this.isAllowedName(nextLine)) {
          return {
            sequence: line,
            name: nextLine
          };
        }
      }
    }

    return null;
  }

  private getTextLines(element: HTMLElement): string[] {
    const visibleText = element.innerText?.trim();
    const source = visibleText || element.textContent || "";

    return source
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  private getCompactText(element: HTMLElement): string {
    return (element.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private elementContainsName(element: HTMLElement, expectedName: string): boolean {
    const text = this.getCompactText(element);
    return text === expectedName || text.includes(expectedName);
  }

  private isAllowedName(value: string): boolean {
    const name = value.replace(/\s+/g, " ").trim();

    if (!name || name.length > 80) return false;
    if (EXCLUDED_LABELS.has(name)) return false;

    return true;
  }

  private looksLikeStandaloneEventName(value: string): boolean {
    const name = value.trim();

    if (!this.isAllowedName(name)) return false;
    if (SYSTEM_EVENTS.has(name)) return true;

    return /^[A-Za-z][A-Za-z0-9_.:-]{1,79}$/.test(name);
  }

  private isInteractive(element: HTMLElement): boolean {
    if (element.matches("button, a, [role='button'], [role='listitem'], [role='treeitem'], [role='option']")) {
      return true;
    }

    return element.hasAttribute("tabindex");
  }

  private isPlausibleRow(element: HTMLElement): boolean {
    if (element.hasAttribute("data-tae-event-row")) return true;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    if (style.visibility === "hidden") return false;
    if (rect.width < 70 || rect.height < 18) return false;
    if (rect.width > Math.min(720, window.innerWidth * 0.58)) return false;
    if (rect.height > 128) return false;
    if (rect.right <= 0) return false;
    if (rect.left >= window.innerWidth * 0.58) return false;

    return true;
  }

  private getArea(element: HTMLElement): number {
    if (element.hasAttribute("data-tae-event-row")) return 0;

    const rect = element.getBoundingClientRect();
    return Math.max(1, rect.width * rect.height);
  }

  private dedupeCandidates(candidates: RowCandidate[]): RowCandidate[] {
    const byKey = new Map<string, RowCandidate>();

    for (const candidate of candidates) {
      const key = candidate.sequence
        ? `${candidate.sequence}:${candidate.name}`
        : `${candidate.name}:${this.getElementPath(candidate.element)}`;

      const current = byKey.get(key);

      if (!current || candidate.area < current.area) {
        byKey.set(key, candidate);
      }
    }

    return Array.from(byKey.values());
  }

  private getElementPath(element: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = element;

    for (let depth = 0; current && depth < 4; depth += 1) {
      const index = current.parentElement
        ? Array.from(current.parentElement.children).indexOf(current)
        : 0;

      parts.push(`${current.tagName.toLowerCase()}:${index}`);
      current = current.parentElement;
    }

    return parts.join("/");
  }

  private isExtensionElement(element: HTMLElement): boolean {
    return Boolean(element.closest("[data-tae-extension-root]"));
  }

  private logDiagnosticsOnce(): void {
    if (this.loggedEmptyState) return;
    this.loggedEmptyState = true;

    const interactiveSamples = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, [role='button'], [role='listitem'], [role='treeitem'], [role='option'], [tabindex]"
      )
    )
      .filter((element) => !this.isExtensionElement(element))
      .map((element) => this.getCompactText(element))
      .filter(Boolean)
      .slice(0, 20);

    const eventLikeSamples = Array.from(
      document.querySelectorAll<HTMLElement>("span, div, p")
    )
      .filter((element) => !this.isExtensionElement(element))
      .map((element) => this.getCompactText(element))
      .filter((text) => this.looksLikeStandaloneEventName(text))
      .slice(0, 30);

    console.warn(
      "[Tag Assistant Power Tools] No event rows detected. Diagnostic samples:",
      { interactiveSamples, eventLikeSamples }
    );
  }
}
