import type { TagAssistantEvent } from "../types";

const STYLE_ID = "tae-page-styles";

export function injectEventStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-tae-hidden="true"] { display: none !important; }
    [data-tae-dimmed="true"] { opacity: 0.3 !important; }
    [data-tae-colored="true"] {
      box-shadow: inset 4px 0 0 var(--tae-rule-color) !important;
      background-color: var(--tae-rule-background) !important;
      transition: background-color 120ms ease, box-shadow 120ms ease;
    }
  `;
  document.head.appendChild(style);
}

export function resetEventStyle(event: TagAssistantEvent): void {
  const { element } = event;
  element.removeAttribute("data-tae-hidden");
  element.removeAttribute("data-tae-dimmed");
  element.removeAttribute("data-tae-colored");
  element.style.removeProperty("--tae-rule-color");
  element.style.removeProperty("--tae-rule-background");
}

export function hideEvent(event: TagAssistantEvent): void {
  event.element.setAttribute("data-tae-hidden", "true");
}

export function dimEvent(event: TagAssistantEvent): void {
  event.element.setAttribute("data-tae-dimmed", "true");
}

export function colorEvent(event: TagAssistantEvent, color: string): void {
  event.element.setAttribute("data-tae-colored", "true");
  event.element.style.setProperty("--tae-rule-color", color);
  event.element.style.setProperty("--tae-rule-background", hexToRgba(color, 0.12));
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "transparent";

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
