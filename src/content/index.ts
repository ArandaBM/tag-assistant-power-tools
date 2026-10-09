import { getEventVisibility, findColorRule } from "../rules/matcher";
import { getSettings, saveSettings, subscribeToSettings } from "../storage/settings";
import type { ExtensionSettings } from "../types";
import { Sidebar } from "../ui/sidebar";
import { colorEvent, dimEvent, hideEvent, injectEventStyles, resetEventStyle } from "./event-styler";
import { TagAssistantAdapter } from "./tag-assistant-adapter";

async function initialize(): Promise<void> {
  console.log("[Tag Assistant Power Tools] Starting");
  injectEventStyles();

  const adapter = new TagAssistantAdapter();
  let settings: ExtensionSettings = await getSettings();
  let scheduled = false;
  let lastEventCount = -1;
  let styledElements = new Set<HTMLElement>();
  let showAll = false;

  const applyRules = () => {
    scheduled = false;

    const events = adapter.findEvents();
    const currentElements = new Set(events.map((event) => event.element));

    // A framework may recycle a row as a heading or another control.
    for (const element of styledElements) {
      if (!currentElements.has(element)) {
        resetEventStyle({ name: "", element });
        element.removeAttribute("data-tae-event-row");
        element.removeAttribute("data-tae-event-name");
      }
    }
    styledElements = currentElements;

    if (events.length !== lastEventCount) {
      console.debug(
        `[Tag Assistant Power Tools] Detected ${events.length} event row(s).`
      );
      lastEventCount = events.length;
    }

    const counts = { visible: 0, hidden: 0, dimmed: 0 };
    for (const event of events) {
      event.element.setAttribute("data-tae-event-row", "true");
      event.element.setAttribute("data-tae-event-name", event.name);
      resetEventStyle(event);

      const visibility = getEventVisibility(event.name, settings, showAll);
      counts[visibility] += 1;
      if (visibility !== "visible") {
        if (visibility === "hidden") hideEvent(event);
        else dimEvent(event);
        continue;
      }

      const colorRule = findColorRule(event.name, settings.colorRules);
      if (colorRule) colorEvent(event, colorRule.color);
    }
    sidebar.updateCounts(counts);
    sidebar.updateEvents(events.map((event) => event.name));
  };

  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyRules);
  };

  const sidebar = new Sidebar(settings, (nextSettings) => {
    settings = nextSettings;
    void saveSettings(settings);
    scheduleApply();
  }, (enabled) => {
    showAll = enabled;
    scheduleApply();
  });

  sidebar.mount();

  subscribeToSettings((nextSettings) => {
    const didActuallyChange =
      JSON.stringify(nextSettings) !== JSON.stringify(settings);

    settings = nextSettings;

    if (didActuallyChange) {
      sidebar.updateSettings(settings);
    }

    scheduleApply();
  });

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    // Observe semantic changes, never the attributes/styles we write.
    attributeFilter: ["title", "role"]
  });

  applyRules();
}

void initialize();
