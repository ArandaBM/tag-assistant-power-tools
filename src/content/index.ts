import { eventMatchesFilter, findColorRule } from "../rules/matcher";
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

  const applyRules = () => {
    scheduled = false;

    const events = adapter.findEvents();

    if (events.length !== lastEventCount) {
      console.debug(
        `[Tag Assistant Power Tools] Detected ${events.length} event row(s).`,
        events.map((event) => event.name)
      );
      lastEventCount = events.length;
    }

    for (const event of events) {
      resetEventStyle(event);

      const matches = eventMatchesFilter(event.name, settings.filter);
      if (!matches) {
        if (settings.filter.hideUnmatched) hideEvent(event);
        else dimEvent(event);
        continue;
      }

      const colorRule = findColorRule(event.name, settings.colorRules);
      if (colorRule) colorEvent(event, colorRule.color);
    }
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
    characterData: true
  });

  applyRules();
}

void initialize();
