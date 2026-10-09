import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const { outputFiles } = await build({
  stdin: {
    contents: `export { Sidebar } from './src/ui/sidebar';
      export { eventMatchesFilter, getEventVisibility, findColorRule } from './src/rules/matcher';
      export { getMessages } from './src/ui/i18n';
      export { DEFAULT_SETTINGS, getSettings } from './src/storage/settings';`,
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, format: "iife", globalName: "testApi",
});

function setup(t, language) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://tagassistant.google.com/", runScripts: "outside-only",
  });
  t.after(() => dom.window.close());
  dom.window.structuredClone = structuredClone;
  if (language) dom.window.chrome = { i18n: { getUILanguage: () => language } };
  dom.window.eval(outputFiles[0].text);
  const api = dom.window.testApi;
  const changes = [];
  const sidebar = new api.Sidebar(api.DEFAULT_SETTINGS, (settings) => changes.push(settings));
  sidebar.mount();
  const shadow = dom.window.document.querySelector("[data-tae-extension-root]").shadowRoot;
  const find = (selector) => shadow.querySelector(selector);
  const change = (selector, value) => {
    find(selector).value = value;
    find(selector).dispatchEvent(new dom.window.Event("change"));
  };
  const open = () => find("#tae-panel").classList.contains("open");
  return { ...api, dom, sidebar, changes, shadow, find, change, open };
}

test("sidebar stays open after adding/removing rules and settings updates; only Close closes it", (t) => {
  const ui = setup(t);
  assert.equal(ui.open(), false);
  ui.find("#tae-toggle").click();
  ui.find("#tae-add-rule").click();
  assert.equal(ui.shadow.querySelectorAll(".rule").length, 3);
  assert.equal(ui.open(), true);
  ui.find(".delete-rule").click();
  assert.equal(ui.shadow.querySelectorAll(".rule").length, 2);
  assert.equal(ui.open(), true);
  ui.sidebar.updateSettings(ui.changes.at(-1));
  assert.equal(ui.open(), true);
  ui.find("#tae-hide").click();
  ui.find(".rule-enabled").click();
  ui.change("#tae-filter-mode", "exact");
  assert.equal(ui.find("#tae-filter-action"), null);
  assert.equal(ui.changes.at(-1).filter.action, "include");
  assert.equal(ui.open(), true);
  ui.find("#tae-close").click();
  ui.sidebar.updateSettings(ui.changes.at(-1));
  assert.equal(ui.open(), false);
  assert.equal(ui.find("#tae-toggle").getAttribute("aria-expanded"), "false");
});

test("include/exclude supports contains, exact, regex, and case sensitivity", (t) => {
  const { eventMatchesFilter, DEFAULT_SETTINGS } = setup(t);
  for (const [mode, query, matched, other] of [
    ["contains", "click", "button_click", "page_view"],
    ["exact", "click", "click", "button_click"],
    ["regex", "^(click|scroll)$", "scroll", "page_view"],
  ]) {
    const filter = { ...DEFAULT_SETTINGS.filter, mode, query };
    assert.equal(eventMatchesFilter(matched, filter), true);
    assert.equal(eventMatchesFilter(other, filter), false);
    filter.action = "exclude";
    assert.equal(eventMatchesFilter(matched, filter), false);
    assert.equal(eventMatchesFilter(other, filter), true);
  }
  const filter = { ...DEFAULT_SETTINGS.filter, query: "CLICK", action: "exclude" };
  assert.equal(eventMatchesFilter("click", filter), false);
  assert.equal(eventMatchesFilter("click", { ...filter, caseSensitive: true }), true);
  assert.equal(eventMatchesFilter("click", { ...filter, query: "  " }), true);
  assert.equal(eventMatchesFilter("click", { ...filter, mode: "regex", query: "[" }), true);
});

test("saved preferences without a filter action retain include behavior", async (t) => {
  const { dom, DEFAULT_SETTINGS, getSettings, eventMatchesFilter } = setup(t);
  const legacy = structuredClone(DEFAULT_SETTINGS);
  delete legacy.filter.action;
  delete legacy.exclusions;
  delete legacy.filter.eventNames;
  legacy.filter.query = "purchase";
  dom.window.chrome = { storage: { sync: { get: async () => ({ tagAssistantPowerToolsSettings: legacy }) } } };
  const settings = await getSettings();
  assert.equal(settings.filter.action, "include");
  assert.equal(settings.exclusions.length, 0);
  assert.equal(settings.filter.eventNames.length, 0);
  assert.equal(eventMatchesFilter("purchase", settings.filter), true);
  assert.equal(eventMatchesFilter("page_view", settings.filter), false);
});

test("exclusions can be added, edited, toggled, and deleted without closing the sidebar", (t) => {
  const ui = setup(t);
  ui.find("#tae-toggle").click();
  ui.find("#tae-add-exclusion").click();
  const input = ui.find(".exclusion-pattern");
  input.value = "scroll";
  input.dispatchEvent(new ui.dom.window.Event("input"));
  assert.equal(ui.changes.at(-1).exclusions[0].pattern, "scroll");
  assert.equal(ui.changes.at(-1).exclusions[0].mode, "exact");
  ui.find(".exclusion-enabled").click();
  assert.equal(ui.changes.at(-1).exclusions[0].enabled, false);
  ui.change(".exclusion-mode", "contains");
  assert.equal(ui.changes.at(-1).exclusions[0].mode, "contains");
  ui.find("#tae-add-exclusion").click();
  assert.equal(ui.changes.at(-1).exclusions.length, 2);
  ui.find(".delete-exclusion").click();
  assert.equal(ui.changes.at(-1).exclusions.length, 1);
  assert.equal(ui.open(), true);
});

test("exclusions hide independently of filter dimming and ignore blank/disabled/invalid rules", (t) => {
  const { DEFAULT_SETTINGS, getEventVisibility } = setup(t);
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.filter.query = "purchase";
  settings.filter.hideUnmatched = false;
  settings.exclusions = [
    { id: "1", pattern: "scroll", mode: "exact", enabled: true },
    { id: "2", pattern: "mouse", mode: "contains", enabled: true },
    { id: "3", pattern: "^gtm\\.", mode: "regex", enabled: true },
    { id: "4", pattern: "purchase", mode: "exact", enabled: false },
    { id: "5", pattern: "  ", mode: "contains", enabled: true },
    { id: "6", pattern: "[", mode: "regex", enabled: true },
  ];
  for (const name of ["SCROLL", "mouse_move", "gtm.click"]) {
    assert.equal(getEventVisibility(name, settings), "hidden");
    assert.equal(getEventVisibility(name, settings, true), "visible");
  }
  assert.equal(getEventVisibility("purchase", settings), "visible");
  assert.equal(getEventVisibility("page_view", settings), "dimmed");
  assert.equal(getEventVisibility("page_view", settings, true), "visible");
  settings.filter.query = "";
  assert.equal(getEventVisibility("scroll", settings), "hidden");
  assert.equal(getEventVisibility("scroll_depth", settings), "visible");
});

test("live counts do not replace focused controls and show-all is not persisted", (t) => {
  const ui = setup(t);
  ui.find("#tae-toggle").click();
  const input = ui.find("#tae-filter");
  input.focus();
  ui.sidebar.updateCounts({ visible: 4, hidden: 3, dimmed: 2 });
  assert.equal(ui.shadow.activeElement, input);
  assert.equal(ui.find("#tae-counts").textContent, "6 visible · 3 hidden · 2 dimmed");
  ui.find("#tae-show-all").click();
  assert.equal(ui.find("#tae-show-all").getAttribute("aria-pressed"), "true");
  assert.equal(ui.changes.length, 0);
  ui.sidebar.updateSettings(ui.DEFAULT_SETTINGS);
  assert.equal(ui.find("#tae-show-all").textContent, "Resume filtering");
  assert.equal(ui.find("#tae-counts").textContent, "6 visible · 3 hidden · 2 dimmed");
  ui.find("#tae-show-all").click();
  assert.equal(ui.find("#tae-show-all").getAttribute("aria-pressed"), "false");
  assert.equal(ui.open(), true);
});

test("detected events are grouped and update without losing selection, search or focus", (t) => {
  const ui = setup(t);
  ui.sidebar.updateEvents(["scroll", "purchase", "scroll"]);
  assert.equal(ui.shadow.querySelectorAll(".event-item").length, 2);
  const scroll = ui.find('[data-event-name="scroll"] .event-select');
  scroll.click();
  scroll.focus();
  ui.sidebar.updateEvents(["scroll", "purchase", "scroll", "scroll", "click"]);
  assert.equal(ui.find('[data-event-name="scroll"] .event-select'), scroll);
  assert.equal(ui.shadow.activeElement, scroll);
  assert.equal(scroll.checked, true);
  assert.equal(ui.find('[data-event-name="scroll"] .event-count').textContent, "3");
  const search = ui.find("#tae-event-search");
  search.value = "PURCHASE";
  search.dispatchEvent(new ui.dom.window.Event("input"));
  assert.equal(ui.find('[data-event-name="scroll"]').hidden, true);
  assert.equal(ui.find('[data-event-name="purchase"]').hidden, false);
  assert.equal(ui.find("#tae-selected-count").textContent, "Selected: 1");
  ui.sidebar.updateEvents([]);
  assert.equal(ui.find("#tae-use-events").disabled, true);
  assert.equal(ui.shadow.querySelectorAll(".event-item").length, 0);
});

test("multiple picked names become literal filters, can be refined, inverted and removed", (t) => {
  const ui = setup(t);
  ui.find("#tae-toggle").click();
  const oddName = 'purchase.[x]|<img src=x onerror="alert(1)">';
  ui.sidebar.updateEvents(["scroll", "purchase", oddName]);
  const inputs = [...ui.shadow.querySelectorAll(".event-select")];
  inputs.find((input) => input.getAttribute("aria-label") === "purchase").click();
  inputs.find((input) => input.getAttribute("aria-label") === oddName).click();
  ui.find("#tae-use-events").click();
  const filter = ui.changes.at(-1).filter;
  assert.equal(filter.eventNames.length, 2);
  assert.equal(filter.query, "");
  assert.equal(ui.eventMatchesFilter(oddName, filter), true);
  assert.equal(ui.eventMatchesFilter("purchase", filter), true);
  assert.equal(ui.eventMatchesFilter("scroll", filter), false);
  assert.equal(ui.eventMatchesFilter("purchase_other", filter), false);
  assert.equal(ui.eventMatchesFilter("purchase", { ...filter, action: "exclude" }), false);
  assert.equal(ui.eventMatchesFilter("scroll", { ...filter, action: "exclude" }), true);
  assert.equal(ui.eventMatchesFilter(oddName, { ...filter, query: "purchase", mode: "exact" }), false);
  assert.equal(ui.shadow.querySelectorAll("img").length, 0);
  assert.equal(ui.shadow.querySelectorAll(".remove-event-name").length, 2);
  ui.find(".remove-event-name").click();
  assert.equal(ui.changes.at(-1).filter.eventNames.length, 1);
  ui.find("#tae-clear-names").click();
  assert.equal(ui.changes.at(-1).filter.eventNames.length, 0);
  assert.equal(ui.open(), true);
});

test("bulk exclusion reuses and enables existing exact rules without duplicating them", (t) => {
  const ui = setup(t);
  const settings = structuredClone(ui.DEFAULT_SETTINGS);
  settings.exclusions = [{ id: "existing", pattern: "SCROLL", mode: "exact", enabled: false }];
  ui.sidebar.updateSettings(settings);
  ui.sidebar.updateEvents(["scroll", "click"]);
  ui.shadow.querySelectorAll(".event-select").forEach((input) => input.click());
  ui.find("#tae-exclude-events").click();
  const next = ui.changes.at(-1);
  assert.equal(next.exclusions.length, 2);
  assert.equal(next.exclusions.find((rule) => rule.id === "existing").enabled, true);
  ui.shadow.querySelectorAll(".event-select").forEach((input) => input.click());
  ui.find("#tae-exclude-events").click();
  assert.equal(ui.changes.at(-1).exclusions.length, 2);
});

test("Portuguese browser UI language localizes controls and counters while retaining event names", (t) => {
  const ui = setup(t, "pt-BR");
  assert.equal(ui.dom.window.document.querySelector("[data-tae-extension-root]").lang, "pt");
  assert.equal(ui.find("#tae-use-events").textContent, "Mostrar somente selecionados");
  assert.equal(ui.find("#tae-show-all").textContent, "Mostrar todos temporariamente");
  ui.sidebar.updateCounts({ visible: 3, hidden: 2, dimmed: 1 });
  assert.equal(ui.find("#tae-counts").textContent, "Visíveis: 4 · Ocultos: 2 · Atenuados: 1");
  ui.sidebar.updateEvents(["page_view", "Inicialização"]);
  assert.equal(ui.find('[data-event-name="page_view"] .event-name').textContent, "page_view");
  assert.equal(ui.find('[data-event-name="Inicialização"] .event-name').textContent, "Inicialização");
  ui.find("#tae-show-all").click();
  assert.equal(ui.find("#tae-show-all").textContent, "Retomar filtros");
  ui.find("#tae-add-exclusion").click();
  assert.equal(ui.find(".delete-exclusion").getAttribute("aria-label"), "Excluir exclusão");
  assert.equal(ui.getMessages("pt-PT").locale, "pt");
  assert.equal(ui.getMessages("en-GB").locale, "en");
  assert.equal(ui.getMessages("fr-FR").locale, "en");
});

test("color rules select detected names literally and still allow manual patterns", (t) => {
  const ui = setup(t, "pt-BR");
  ui.find("#tae-toggle").click();
  ui.find("#tae-tab-colors").click();
  ui.sidebar.updateEvents(["purchase", "button_click", "button_click", "checkout.[test]"]);
  ui.find("#tae-add-rule").click();
  const rule = ui.shadow.querySelector(".rule:last-child");
  const picker = rule.querySelector(".rule-event");
  const pattern = rule.querySelector(".rule-pattern");
  const mode = rule.querySelector(".rule-mode");
  assert.equal([...picker.options].filter((option) => option.textContent === "button_click").length, 1);
  assert.equal(rule.querySelector(".rule-manual").open, false);
  assert.equal(ui.findColorRule("random", ui.changes.at(-1).colorRules), undefined);
  picker.value = "event:checkout.[test]";
  picker.dispatchEvent(new ui.dom.window.Event("change"));
  assert.equal(pattern.value, "checkout.[test]");
  assert.equal(mode.value, "exact");
  assert.equal(ui.changes.at(-1).colorRules.at(-1).pattern, "checkout.[test]");
  assert.equal(ui.findColorRule("checkout.[test]", ui.changes.at(-1).colorRules).color, "#3B82F6");
  assert.equal(ui.findColorRule("checkout.Xtest", ui.changes.at(-1).colorRules), undefined);
  picker.value = "manual";
  picker.dispatchEvent(new ui.dom.window.Event("change"));
  assert.equal(rule.querySelector(".rule-manual").open, true);
  assert.equal(ui.shadow.activeElement, pattern);
  pattern.value = "future_event";
  pattern.dispatchEvent(new ui.dom.window.Event("input"));
  ui.sidebar.updateEvents(["purchase", "button_click", "new_event"]);
  assert.equal(ui.shadow.activeElement, pattern);
  assert.equal(pattern.value, "future_event");
  assert.equal(picker.value, "manual");
  assert.equal([...picker.options].some((option) => option.value === "event:new_event"), true);
  ui.sidebar.updateSettings(ui.changes.at(-1));
  assert.equal(ui.shadow.querySelector(".rule:last-child .rule-pattern").value, "future_event");
  assert.equal(ui.find("#tae-view-colors").hidden, false);
});

test("legacy negative filters migrate to exclusions preserving names, pattern and case semantics", async (t) => {
  const ui = setup(t);
  let saved = structuredClone(ui.DEFAULT_SETTINGS);
  saved.filter = { ...saved.filter, action: "exclude", query: "^purchase", mode: "regex", eventNames: ["purchase", "purchase_special", "other"], caseSensitive: true };
  ui.dom.window.chrome = { storage: { sync: {
    get: async () => ({ tagAssistantPowerToolsSettings: saved }),
    set: async (value) => { saved = value.tagAssistantPowerToolsSettings; }
  } } };
  const settings = await ui.getSettings();
  assert.equal(settings.filter.action, "include");
  assert.equal(settings.filter.query, "");
  assert.equal(settings.filter.eventNames.length, 0);
  assert.equal(settings.exclusions.length, 1);
  assert.equal(ui.getEventVisibility("purchase", settings), "hidden");
  assert.equal(ui.getEventVisibility("purchase_special", settings), "hidden");
  assert.equal(ui.getEventVisibility("purchase_extra", settings), "visible");
  assert.equal(ui.getEventVisibility("PURCHASE", settings), "visible");
  assert.equal(ui.getEventVisibility("other", settings), "visible");
  const reloaded = await ui.getSettings();
  assert.equal(reloaded.exclusions.length, 1);
  assert.equal(reloaded.exclusions[0].id, settings.exclusions[0].id);
});

test("tabs isolate tasks and retain the active section after edits, including keyboard navigation", (t) => {
  const ui = setup(t);
  ui.find("#tae-toggle").click();
  assert.equal(ui.find("#tae-view-events").hidden, false);
  assert.equal(ui.find("#tae-view-exclusions").hidden, true);
  assert.equal(ui.find("#tae-view-colors").hidden, true);
  assert.equal(ui.find("#tae-manual-filter").open, false);
  ui.find("#tae-tab-exclusions").click();
  ui.find("#tae-add-exclusion").click();
  assert.equal(ui.find("#tae-view-exclusions").hidden, false);
  assert.equal(ui.find("#tae-tab-exclusions").getAttribute("aria-selected"), "true");
  ui.find("#tae-tab-exclusions").dispatchEvent(new ui.dom.window.KeyboardEvent("keydown", { key: "ArrowRight" }));
  assert.equal(ui.find("#tae-view-colors").hidden, false);
  assert.equal(ui.shadow.activeElement, ui.find("#tae-tab-colors"));
  ui.find("#tae-add-rule").click();
  assert.equal(ui.find("#tae-view-colors").hidden, false);
  ui.find("#tae-tab-colors").dispatchEvent(new ui.dom.window.KeyboardEvent("keydown", { key: "Home" }));
  assert.equal(ui.find("#tae-view-events").hidden, false);
  ui.find("#tae-manual-filter").open = true;
  ui.sidebar.updateSettings(ui.changes.at(-1));
  assert.equal(ui.find("#tae-manual-filter").open, true);
  ui.find("#tae-close").click();
  assert.equal(ui.find("#tae-panel").hasAttribute("inert"), true);
  assert.equal(ui.shadow.activeElement, ui.find("#tae-toggle"));
});

test("selection actions appear only when needed and a collapsed filter remains visible and clearable", (t) => {
  const ui = setup(t, "pt-BR");
  ui.sidebar.updateEvents(["purchase", "scroll"]);
  assert.equal(ui.find("#tae-selection-actions").hidden, true);
  ui.find('[data-event-name="purchase"] .event-select').click();
  assert.equal(ui.find("#tae-selection-actions").hidden, false);
  ui.find("#tae-use-events").click();
  assert.equal(ui.find("#tae-selection-actions").hidden, true);
  assert.equal(ui.find("#tae-manual-filter").open, false);
  assert.equal(ui.find("#tae-filter-status").hidden, false);
  assert.equal(ui.find("#tae-filter-summary").textContent, "Incluir: 1 nome");
  ui.find("#tae-reset-filter").click();
  assert.equal(ui.find("#tae-filter-status").hidden, true);
  assert.equal(ui.changes.at(-1).filter.eventNames.length, 0);
  assert.equal(ui.changes.at(-1).filter.query, "");
  ui.find("#tae-show-all").click();
  assert.equal(ui.find("#tae-paused").hidden, false);
  ui.find("#tae-show-all").click();
  assert.equal(ui.find("#tae-paused").hidden, true);
});
