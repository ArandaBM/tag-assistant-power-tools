import type { TagAssistantEvent } from "../types";

const ROW_SELECTOR = 'button, [role="button"], [role="listitem"], [role="treeitem"], [role="option"]';
const compact = (text: string | null): string => (text ?? "").replace(/\s+/g, " ").trim();

/** Parse the numbered, interactive event rows, without CSS classes or layout guesses. */
export class TagAssistantAdapter {
  public findEvents(): TagAssistantEvent[] {
    const events: TagAssistantEvent[] = [];

    for (const element of document.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
      if (element.closest("[data-tae-extension-root]")) continue;
      const name = this.readEventName(element);
      if (name !== null) events.push({ name, element });
    }

    return events;
  }

  private readEventName(element: HTMLElement): string | null {
    // In the live DOM the sequence and title are separate siblings. Reading
    // textContent keeps rows discoverable even while our filter hides them.
    const [sequence, title, ...extra] = Array.from(element.children);
    if (!sequence || !title) return null;
    if (!/^\d+$/.test(compact(sequence.textContent))) return null;
    if (sequence.matches(ROW_SELECTOR) || sequence.querySelector(ROW_SELECTOR)) return null;
    if (extra.some((child) => compact(child.textContent))) return null;

    // The event label has a title attribute; nested help/popover controls do
    // not belong to the event name (including localized built-in events).
    const labels = [title, ...Array.from(title.querySelectorAll("[title]"))]
      .filter((label) => {
        const name = compact(label.getAttribute("title"));
        return name && name === compact(label.textContent) &&
          !label.matches(ROW_SELECTOR) && !label.querySelector(ROW_SELECTOR) &&
          label.closest(ROW_SELECTOR) === element;
      });
    if (labels.length === 1) return compact(labels[0].getAttribute("title"));

    // Accept a plain label too, but never consume text from nested controls
    // or multiple event rows. No English-only list of event names is needed.
    if (labels.length > 1 || title.matches(ROW_SELECTOR) || title.querySelector(ROW_SELECTOR)) return null;
    if (title.querySelector("[title]")) return null;
    return compact(title.textContent) || null;
  }
}
