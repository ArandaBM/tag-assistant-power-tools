import type { ColorRule, EventCounts, ExclusionRule, ExtensionSettings, MatchMode } from "../types";
import { formatMessage, getMessages } from "./i18n";

type SettingsCallback = (settings: ExtensionSettings) => void;
type PanelTab = "events" | "exclusions" | "colors";

export class Sidebar {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private settings: ExtensionSettings;
  private isOpen = false;
  private showAll = false;
  private counts: EventCounts = { visible: 0, hidden: 0, dimmed: 0 };
  private readonly messages = getMessages();
  private readonly t = this.messages.text;
  private detectedEvents = new Map<string, number>();
  private selectedEvents = new Set<string>();
  private eventSearch = "";
  private activeTab: PanelTab = "events";
  private disclosureState = new Map<string, boolean>();
  private tabScroll = new Map<PanelTab, number>();

  constructor(
    settings: ExtensionSettings,
    private readonly onChange: SettingsCallback,
    private readonly onShowAllChange: (enabled: boolean) => void = () => {}
  ) {
    this.settings = structuredClone(settings);
  }

  public mount(): void {
    if (document.querySelector("[data-tae-extension-root]")) return;

    this.host = document.createElement("div");
    this.host.setAttribute("data-tae-extension-root", "true");
    this.host.lang = this.messages.locale;
    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: "open" });
    this.render();
  }

  public updateSettings(settings: ExtensionSettings): void {
    this.settings = structuredClone(settings);
    this.render();
  }

  public updateCounts(counts: EventCounts): void {
    this.counts = counts;
    const counter = this.shadow?.getElementById("tae-counts");
    const text = this.countText();
    if (counter && counter.textContent !== text) counter.textContent = text;
  }

  public updateEvents(names: string[]): void {
    const next = new Map<string, number>();
    for (const name of names) next.set(name, (next.get(name) ?? 0) + 1);
    const unchanged = next.size === this.detectedEvents.size &&
      [...next].every(([name, count]) => this.detectedEvents.get(name) === count);
    if (unchanged) return;
    this.detectedEvents = next;
    for (const name of this.selectedEvents) {
      if (!next.has(name)) this.selectedEvents.delete(name);
    }
    this.renderEventList();
    this.updateColorPickers();
  }

  private updateColorPickers(): void {
    const names = [...this.detectedEvents.keys()].sort((a, b) => a.localeCompare(b, this.messages.locale));
    const signature = JSON.stringify(names);
    this.shadow?.querySelectorAll<HTMLElement>(".rule").forEach((element) => {
      const rule = this.settings.colorRules.find((item) => item.id === element.dataset.ruleId);
      const select = element.querySelector<HTMLSelectElement>(".rule-event");
      if (!rule || !select) return;
      if (select.dataset.catalog !== signature) {
        const option = (value: string, label: string) => {
          const node = document.createElement("option");
          node.value = value;
          node.textContent = label;
          return node;
        };
        select.replaceChildren(option("", this.t.chooseColorEvent),
          ...names.map((name) => option(`event:${name}`, name)),
          option("manual", this.t.typeColorEvent));
        select.dataset.catalog = signature;
      }
      select.value = rule.mode === "exact" && this.detectedEvents.has(rule.pattern)
        ? `event:${rule.pattern}` : rule.pattern ? "manual" : "";
    });
  }

  private renderEventList(): void {
    const list = this.shadow?.getElementById("tae-event-list");
    if (!list) return;
    const existing = new Map(Array.from(list.querySelectorAll<HTMLLabelElement>(".event-item"))
      .map((item) => [item.dataset.eventName!, item]));
    for (const [name, item] of existing) {
      if (!this.detectedEvents.has(name)) item.remove();
    }
    let shown = 0;
    // Keep existing inputs alive so incoming events do not interrupt selection.
    for (const name of [...this.detectedEvents.keys()].sort((a, b) => a.localeCompare(b, this.messages.locale))) {
      let item = existing.get(name);
      if (!item) {
        item = document.createElement("label");
        item.className = "event-item";
        item.dataset.eventName = name;
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "event-select";
        checkbox.setAttribute("aria-label", name);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) this.selectedEvents.add(name);
          else this.selectedEvents.delete(name);
          this.updateSelectionStatus();
        });
        const label = document.createElement("span");
        label.className = "event-name";
        label.textContent = name;
        const count = document.createElement("small");
        count.className = "event-count";
        item.append(checkbox, label, count);
        // Insert only new names; existing controls retain focus and scroll.
        const before = Array.from(list.children).find((child) =>
          name.localeCompare((child as HTMLElement).dataset.eventName!, this.messages.locale) < 0);
        list.insertBefore(item, before ?? null);
      }
      item.querySelector<HTMLInputElement>("input")!.checked = this.selectedEvents.has(name);
      const count = item.querySelector<HTMLElement>(".event-count")!;
      const total = this.detectedEvents.get(name)!;
      if (count.textContent !== String(total)) count.textContent = String(total);
      count.title = formatMessage(this.t.occurrences, { count: total });
      item.hidden = !name.toLowerCase().includes(this.eventSearch.trim().toLowerCase());
      if (!item.hidden) shown += 1;
    }
    const empty = this.shadow!.getElementById("tae-event-empty")!;
    empty.hidden = shown > 0;
    empty.textContent = this.detectedEvents.size ? this.t.noResults : this.t.noEvents;
    this.updateSelectionStatus();
  }

  private updateSelectionStatus(): void {
    if (!this.shadow) return;
    this.shadow.getElementById("tae-selected-count")!.textContent =
      formatMessage(this.t.selected, { count: this.selectedEvents.size });
    for (const id of ["tae-use-events", "tae-exclude-events", "tae-clear-selection"]) {
      (this.shadow.getElementById(id) as HTMLButtonElement).disabled = this.selectedEvents.size === 0;
    }
    this.shadow.getElementById("tae-selection-actions")!.hidden = this.selectedEvents.size === 0;
  }

  private renderSelectedNames(): string {
    if (!this.settings.filter.eventNames.length) return "";
    return `<div class="selected-names" aria-label="${this.t.exactNames}">
      ${this.settings.filter.eventNames.map((name) => `<button class="name-chip remove-event-name" data-name="${this.escape(name)}" aria-label="${this.escape(formatMessage(this.t.removeName, { name }))}">${this.escape(name)} ×</button>`).join("")}
      <button id="tae-clear-names" class="text-button">${this.t.clearNames}</button>
    </div>`;
  }

  private countText(): string {
    const { visible, hidden, dimmed } = this.counts;
    return formatMessage(this.t.counts, { visible: visible + dimmed, hidden }) +
      (dimmed ? formatMessage(this.t.dimmed, { dimmed }) : "");
  }

  private render(): void {
    if (!this.shadow) return;
    // Keep the current section, scroll and disclosure choices through edits.
    const scrollTop = this.shadow.getElementById("tae-content")?.scrollTop ?? 0;
    this.shadow.querySelectorAll<HTMLDetailsElement>("details[id]").forEach((details) => {
      this.disclosureState.set(details.id, details.open);
    });

    this.shadow.innerHTML = `
      <style>${this.styles()}</style>
      <button id="tae-toggle" class="toggle" aria-label="${this.t.open}" aria-controls="tae-panel" aria-expanded="${this.isOpen}">⚡</button>
      <aside id="tae-panel" class="panel${this.isOpen ? " open" : ""}" aria-label="Tag Assistant Power Tools" ${this.isOpen ? "" : "inert"}>
        <header>
          <div><strong>Tag Assistant</strong><span>Power Tools</span></div>
          <button id="tae-close" class="close" aria-label="${this.t.close}">×</button>
        </header>
        <div class="status-bar${this.showAll ? " paused" : ""}">
          <p id="tae-counts" class="counts" role="status" title="${this.t.countHint}">${this.countText()}</p>
          <button id="tae-show-all" class="text-button" aria-pressed="${this.showAll}">${this.showAll ? this.t.resume : this.t.showAll}</button>
          <span id="tae-paused" class="paused-label" ${this.showAll ? "" : "hidden"}>${this.t.paused}</span>
        </div>
        <div class="tabs" role="tablist" aria-label="${this.t.navigation}">
          ${(["events", "exclusions", "colors"] as const).map((tab) => `<button id="tae-tab-${tab}" class="tab" role="tab" aria-controls="tae-view-${tab}" aria-selected="${this.activeTab === tab}" tabindex="${this.activeTab === tab ? 0 : -1}" data-tab="${tab}">${tab === "events" ? this.t.tabEvents : tab === "exclusions" ? this.t.tabExclusions : this.t.tabColors}${tab === "events" ? "" : ` <span id="tae-badge-${tab}" class="badge"></span>`}</button>`).join("")}
        </div>
        <div id="tae-content" class="content">
        <div id="tae-view-events" role="tabpanel" aria-labelledby="tae-tab-events" ${this.activeTab === "events" ? "" : "hidden"}>
        <section class="event-section">
          <div id="tae-filter-status" class="filter-status" hidden><span id="tae-filter-summary"></span><button id="tae-reset-filter" class="text-button">${this.t.clearFilter}</button></div>
          ${this.renderSelectedNames()}
          <p class="section-intro">${this.t.pickHint}</p>
          <input id="tae-event-search" class="input" type="search" aria-label="${this.t.searchEvents}" aria-describedby="tae-search-hint" placeholder="${this.t.searchEvents}" value="${this.escape(this.eventSearch)}" />
          <p id="tae-search-hint" class="search-hint">${this.t.listSearchHint}</p>
          <div id="tae-event-list" class="event-list"></div>
          <p id="tae-event-empty" class="hint"></p>
          <div id="tae-selection-actions" class="selection-actions" hidden>
          <p id="tae-selected-count" class="hint"></p>
          <div class="picker-actions">
            <button id="tae-use-events" class="small-button">${this.t.useFilter}</button>
            <button id="tae-exclude-events" class="small-button secondary">${this.t.excludeSelected}</button>
            <button id="tae-clear-selection" class="text-button">${this.t.clearSelection}</button>
          </div>
          </div>
        </section>
        <section class="filter-section">
          <details id="tae-manual-filter" class="disclosure">
          <summary>${this.t.manualFilter}</summary>
          <div class="disclosure-body">
          <div class="row">
          <input id="tae-filter" class="input" type="text" aria-label="${this.t.query}" placeholder="${this.t.queryPlaceholder}" value="${this.escape(this.settings.filter.query)}" />
          </div>
          <div class="row">
            <select id="tae-filter-mode" class="select" aria-label="${this.t.matchMode}">${this.modeOptions(this.settings.filter.mode)}</select>
          </div>
          <label class="checkbox">
            <input id="tae-hide" type="checkbox" ${this.settings.filter.hideUnmatched ? "checked" : ""} />
            ${this.t.hide}
          </label>
          </div>
          </details>
          <details id="tae-events-help" class="help"><summary>${this.t.help}</summary><p class="hint">${this.t.eventsHint}</p><p class="hint">${this.t.namesHint}</p><p class="hint">${this.t.countHint}</p></details>
        </section>
        </div>
        <div id="tae-view-exclusions" role="tabpanel" aria-labelledby="tae-tab-exclusions" ${this.activeTab === "exclusions" ? "" : "hidden"}>
        <section>
          <div class="section-title">
            <h3>${this.t.exclusions}</h3>
            <button id="tae-add-exclusion" class="small-button">${this.t.addExclusion}</button>
          </div>
          <div id="tae-exclusions">${this.settings.exclusions.map((rule) => this.renderExclusion(rule)).join("") || `<p class="hint">${this.t.noExclusions}</p>`}</div>
          <details id="tae-exclusions-help" class="help"><summary>${this.t.help}</summary><p class="hint">${this.t.exclusionHint}</p></details>
        </section>
        </div>
        <div id="tae-view-colors" role="tabpanel" aria-labelledby="tae-tab-colors" ${this.activeTab === "colors" ? "" : "hidden"}>
        <section>
          <div class="section-title">
            <h3>${this.t.colors}</h3>
            <button id="tae-add-rule" class="small-button">${this.t.addRule}</button>
          </div>
          <p class="hint">${this.t.colorPickerHint}</p>
          <div id="tae-rules">${this.settings.colorRules.map((rule) => this.renderRule(rule)).join("")}</div>
        </section>
        </div>
        </div>
        <footer class="footer">
          <a href="https://www.linkedin.com/in/brunoarandati/" target="_blank" rel="noopener noreferrer" aria-label="${this.t.linkedinLabel}">
            <span>${this.t.madeBy} <strong>Bruno Aranda</strong></span>
            <span class="feedback-link">${this.t.feedbackLink} <span aria-hidden="true">↗</span></span>
          </a>
        </footer>
      </aside>
    `;

    this.bindEvents();
    this.renderEventList();
    this.updateColorPickers();
    this.updateFilterStatus();
    this.shadow.querySelectorAll<HTMLDetailsElement>("details[id]").forEach((details) => {
      details.open = this.disclosureState.get(details.id) ?? details.open;
    });
    this.shadow.getElementById("tae-content")!.scrollTop = scrollTop;
  }

  private renderRule(rule: ColorRule): string {
    return `
      <div class="rule" data-rule-id="${this.escape(rule.id)}">
        <div class="rule-top">
          <input class="rule-enabled" type="checkbox" aria-label="${this.t.ruleEnabled}" ${rule.enabled ? "checked" : ""} />
          <input class="rule-color" type="color" aria-label="${this.t.color}" value="${this.escape(rule.color)}" />
          <button class="delete-rule" title="${this.t.deleteRule}" aria-label="${this.t.deleteRule}">×</button>
        </div>
        <select class="select rule-event" aria-label="${this.t.chooseColorEvent}"></select>
        <details id="tae-color-manual-${this.escape(rule.id)}" class="help rule-manual" ${rule.pattern && (rule.mode !== "exact" || !this.detectedEvents.has(rule.pattern)) ? "open" : ""}>
          <summary>${this.t.typeColorEvent}</summary>
          <div class="row">
            <input class="input rule-pattern" type="text" value="${this.escape(rule.pattern)}" placeholder="${this.t.eventName}" aria-label="${this.t.eventName}" />
            <select class="select rule-mode" aria-label="${this.t.matchMode}">${this.modeOptions(rule.mode)}</select>
          </div>
        </details>
      </div>
    `;
  }

  private renderExclusion(rule: ExclusionRule): string {
    return `
      <div class="exclusion" data-exclusion-id="${this.escape(rule.id)}">
        <div class="rule-top">
          <label class="exclusion-toggle"><input class="exclusion-enabled" type="checkbox" ${rule.enabled ? "checked" : ""} /> ${this.t.enabled}</label>
          <button class="delete-exclusion delete-rule" aria-label="${this.t.deleteExclusion}">×</button>
        </div>
        <input class="input exclusion-pattern" type="text" aria-label="${this.t.eventToExclude}" value="${this.escape(rule.pattern)}" placeholder="${this.t.exclusionPlaceholder}" />
        ${rule.eventNames?.length ? `<div class="hint">${this.t.exactNames}: ${rule.eventNames.map((name) => this.escape(name)).join(", ")}<br /><button class="text-button clear-exclusion-names">${this.t.clearNames}</button></div>` : ""}
        ${rule.caseSensitive ? `<p class="hint">${this.t.matchingCase}</p>` : ""}
        <div class="row"><select class="select exclusion-mode" aria-label="${this.t.exclusionMode}">${this.modeOptions(rule.mode)}</select></div>
      </div>
    `;
  }

  private bindEvents(): void {
    if (!this.shadow) return;
    const tabs: PanelTab[] = ["events", "exclusions", "colors"];
    this.shadow.querySelectorAll<HTMLButtonElement>("[role='tab']").forEach((button) => {
      button.addEventListener("click", () => this.switchTab(button.dataset.tab as PanelTab));
      button.addEventListener("keydown", (event) => {
        const index = tabs.indexOf(this.activeTab);
        const next = event.key === "ArrowRight" ? tabs[(index + 1) % tabs.length]
          : event.key === "ArrowLeft" ? tabs[(index + tabs.length - 1) % tabs.length]
          : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : null;
        if (!next) return;
        event.preventDefault();
        this.switchTab(next);
        this.shadow?.getElementById(`tae-tab-${next}`)?.focus();
      });
    });
    this.shadow.getElementById("tae-reset-filter")?.addEventListener("click", () => {
      this.settings.filter.query = "";
      this.settings.filter.eventNames = [];
      this.emit();
      this.render();
    });

    this.shadow.getElementById("tae-event-search")?.addEventListener("input", (event) => {
      this.eventSearch = (event.target as HTMLInputElement).value;
      this.renderEventList();
    });
    this.shadow.getElementById("tae-clear-selection")?.addEventListener("click", () => {
      this.selectedEvents.clear();
      this.renderEventList();
    });
    this.shadow.getElementById("tae-use-events")?.addEventListener("click", () => {
      if (!this.selectedEvents.size) return;
      this.settings.filter.eventNames = [...this.selectedEvents];
      this.settings.filter.query = "";
      this.settings.filter.action = "include";
      this.settings.filter.hideUnmatched = true;
      this.selectedEvents.clear();
      this.emit();
      this.render();
    });
    this.shadow.getElementById("tae-exclude-events")?.addEventListener("click", () => {
      if (!this.selectedEvents.size) return;
      for (const name of this.selectedEvents) {
        const existing = this.settings.exclusions.find((rule) => rule.mode === "exact" && !rule.eventNames?.length && !rule.caseSensitive &&
          rule.pattern.trim().toLowerCase() === name.trim().toLowerCase());
        if (existing) existing.enabled = true;
        else this.settings.exclusions.push({ id: crypto.randomUUID(), pattern: name, mode: "exact", enabled: true });
      }
      this.selectedEvents.clear();
      this.emit();
      this.render();
    });
    this.shadow.getElementById("tae-clear-names")?.addEventListener("click", () => {
      this.settings.filter.eventNames = [];
      this.emit();
      this.render();
    });
    this.shadow.querySelectorAll<HTMLButtonElement>(".remove-event-name").forEach((button) => {
      button.addEventListener("click", () => {
        this.settings.filter.eventNames = this.settings.filter.eventNames.filter((name) => name !== button.dataset.name);
        this.emit();
        this.render();
      });
    });

    this.shadow.getElementById("tae-toggle")?.addEventListener("click", () => this.setOpen(true));
    this.shadow.getElementById("tae-close")?.addEventListener("click", () => this.setOpen(false));
    this.shadow.getElementById("tae-show-all")?.addEventListener("click", () => {
      this.showAll = !this.showAll;
      const button = this.shadow!.getElementById("tae-show-all")!;
      button.textContent = this.showAll ? this.t.resume : this.t.showAll;
      button.setAttribute("aria-pressed", String(this.showAll));
      this.shadow!.getElementById("tae-paused")!.hidden = !this.showAll;
      this.shadow!.querySelector(".status-bar")!.classList.toggle("paused", this.showAll);
      this.onShowAllChange(this.showAll);
    });

    this.shadow.getElementById("tae-add-exclusion")?.addEventListener("click", () => {
      this.settings.exclusions.push({ id: crypto.randomUUID(), pattern: "", mode: "exact", enabled: true });
      this.emit();
      this.render();
      this.shadow?.querySelector<HTMLInputElement>(".exclusion:last-child .exclusion-pattern")?.focus();
    });
    this.shadow.querySelectorAll<HTMLElement>(".exclusion").forEach((element) => this.bindExclusion(element));

    const filter = this.shadow.querySelector<HTMLInputElement>("#tae-filter");
    filter?.addEventListener("input", () => {
      this.settings.filter.query = filter.value;
      this.emit();
    });

    const filterMode = this.shadow.querySelector<HTMLSelectElement>("#tae-filter-mode");
    filterMode?.addEventListener("change", () => {
      this.settings.filter.mode = filterMode.value as MatchMode;
      this.emit();
    });

    const hide = this.shadow.querySelector<HTMLInputElement>("#tae-hide");
    hide?.addEventListener("change", () => {
      this.settings.filter.hideUnmatched = hide.checked;
      this.emit();
    });

    this.shadow.getElementById("tae-add-rule")?.addEventListener("click", () => {
      this.settings.colorRules.push({
        id: crypto.randomUUID(),
        pattern: "",
        mode: "contains",
        color: "#3B82F6",
        enabled: true,
        caseSensitive: false
      });
      this.emit();
      this.render();
    });

    this.shadow.querySelectorAll<HTMLElement>(".rule").forEach((element) => this.bindRule(element));
  }

  private bindRule(element: HTMLElement): void {
    const id = element.dataset.ruleId;
    if (!id) return;

    const rule = this.settings.colorRules.find((current) => current.id === id);
    if (!rule) return;

    const enabled = element.querySelector<HTMLInputElement>(".rule-enabled");
    const color = element.querySelector<HTMLInputElement>(".rule-color");
    const pattern = element.querySelector<HTMLInputElement>(".rule-pattern");
    const mode = element.querySelector<HTMLSelectElement>(".rule-mode");
    const deleteButton = element.querySelector<HTMLButtonElement>(".delete-rule");
    const eventPicker = element.querySelector<HTMLSelectElement>(".rule-event");
    const manual = element.querySelector<HTMLDetailsElement>(".rule-manual")!;
    eventPicker?.addEventListener("change", () => {
      if (eventPicker.value === "manual") {
        manual.open = true;
        pattern?.focus();
        return;
      }
      if (!eventPicker.value.startsWith("event:")) return;
      rule.pattern = eventPicker.value.slice("event:".length);
      rule.mode = "exact";
      if (pattern) pattern.value = rule.pattern;
      if (mode) mode.value = rule.mode;
      manual.open = false;
      this.emit();
    });

    enabled?.addEventListener("change", () => {
      rule.enabled = enabled.checked;
      this.emit();
    });

    color?.addEventListener("input", () => {
      rule.color = color.value;
      this.emit();
    });

    pattern?.addEventListener("input", () => {
      rule.pattern = pattern.value;
      this.updateColorPickers();
      this.emit();
    });

    mode?.addEventListener("change", () => {
      rule.mode = mode.value as MatchMode;
      this.updateColorPickers();
      this.emit();
    });

    deleteButton?.addEventListener("click", () => {
      this.settings.colorRules = this.settings.colorRules.filter((current) => current.id !== id);
      this.emit();
      this.render();
    });
  }

  private bindExclusion(element: HTMLElement): void {
    const rule = this.settings.exclusions.find((current) => current.id === element.dataset.exclusionId);
    if (!rule) return;
    const enabled = element.querySelector<HTMLInputElement>(".exclusion-enabled")!;
    const pattern = element.querySelector<HTMLInputElement>(".exclusion-pattern")!;
    const mode = element.querySelector<HTMLSelectElement>(".exclusion-mode")!;
    enabled.addEventListener("change", () => { rule.enabled = enabled.checked; this.emit(); });
    pattern.addEventListener("input", () => { rule.pattern = pattern.value; this.emit(); });
    mode.addEventListener("change", () => { rule.mode = mode.value as MatchMode; this.emit(); });
    element.querySelector(".clear-exclusion-names")?.addEventListener("click", () => {
      rule.eventNames = [];
      this.emit();
      this.render();
    });
    element.querySelector(".delete-exclusion")?.addEventListener("click", () => {
      this.settings.exclusions = this.settings.exclusions.filter((current) => current.id !== rule.id);
      this.emit();
      this.render();
    });
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.shadow?.getElementById("tae-panel")?.classList.toggle("open", open);
    this.shadow?.getElementById("tae-panel")?.toggleAttribute("inert", !open);
    this.shadow?.getElementById("tae-toggle")?.setAttribute("aria-expanded", String(open));
    this.shadow?.getElementById(open ? `tae-tab-${this.activeTab}` : "tae-toggle")?.focus();
  }

  private emit(): void {
    this.updateFilterStatus();
    this.onChange(structuredClone(this.settings));
  }

  private switchTab(tab: PanelTab): void {
    if (!this.shadow || tab === this.activeTab) return;
    const content = this.shadow.getElementById("tae-content")!;
    this.tabScroll.set(this.activeTab, content.scrollTop);
    this.activeTab = tab;
    this.shadow.querySelectorAll<HTMLButtonElement>("[role='tab']").forEach((button) => {
      const active = button.dataset.tab === tab;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      this.shadow!.getElementById(button.getAttribute("aria-controls")!)!.hidden = !active;
    });
    content.scrollTop = this.tabScroll.get(tab) ?? 0;
  }

  private updateFilterStatus(): void {
    if (!this.shadow) return;
    const { query, eventNames, action } = this.settings.filter;
    const status = this.shadow.getElementById("tae-filter-status");
    if (!status) return;
    status.hidden = !query.trim() && eventNames.length === 0;
    const names = eventNames.length === 1 ? this.t.selectedName : formatMessage(this.t.selectedNames, { count: eventNames.length });
    const criteria = [eventNames.length ? names : "", query.trim()].filter(Boolean).join(" · ");
    const summary = this.shadow.getElementById("tae-filter-summary")!;
    summary.textContent = `${action === "exclude" ? this.t.excludeShort : this.t.includeShort}: ${criteria}`;
    summary.title = summary.textContent;
    const totals = {
      exclusions: this.settings.exclusions.filter((rule) => rule.enabled && (rule.pattern.trim() || rule.eventNames?.length)).length,
      colors: this.settings.colorRules.filter((rule) => rule.enabled && rule.pattern.trim()).length
    };
    for (const kind of ["exclusions", "colors"] as const) {
      const badge = this.shadow.getElementById(`tae-badge-${kind}`)!;
      badge.textContent = String(totals[kind]);
      badge.hidden = totals[kind] === 0;
    }
  }

  private modeOptions(selected: MatchMode): string {
    const options: Array<{ value: MatchMode; label: string }> = [
      { value: "contains", label: this.t.contains },
      { value: "exact", label: this.t.exact },
      { value: "regex", label: this.t.regex }
    ];

    return options
      .map((option) => `<option value="${option.value}" ${option.value === selected ? "selected" : ""}>${option.label}</option>`)
      .join("");
  }

  private escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  private styles(): string {
    return `
      :host { font-family: Inter, Arial, sans-serif; color-scheme: light; }
      * { box-sizing: border-box; }
      button, input, select { font: inherit; }
      button, summary { -webkit-tap-highlight-color: transparent; }
      :focus-visible { outline: 2px solid #1a73e8; outline-offset: 3px; }
      .toggle {
        position: fixed; right: 16px; bottom: 20px; width: 48px; height: 48px;
        border: 0; border-radius: 50%; background: #1a73e8; color: white;
        font-size: 20px; cursor: pointer; z-index: 2147483647;
        box-shadow: 0 5px 18px rgba(0,0,0,.25);
      }
      .panel {
        position: fixed; top: 0; right: 0; width: min(360px, 100vw); height: 100vh; height: 100dvh;
        background: #fff; color: #202124; z-index: 2147483647;
        box-shadow: -5px 0 25px rgba(0,0,0,.14); transition: transform 180ms ease;
        transform: translateX(110%); display: flex; flex-direction: column; font-size: 13px;
      }
      .panel.open { transform: translateX(0); }
      .toggle[aria-expanded="true"] { visibility: hidden; }
      header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px 12px; flex-shrink: 0; }
      header strong { display: block; font-size: 16px; }
      header span { color: #6b7280; font-size: 12px; }
      .close { border: 0; background: transparent; font-size: 24px; cursor: pointer; width: 32px; height: 32px; color: #5f6368; border-radius: 6px; }
      .close:hover { background: #f1f3f4; }
      .status-bar { padding: 10px 20px; background: #f7f9fc; border-top: 1px solid #edf0f5; flex-shrink: 0; }
      .status-bar.paused { background: #fff7e5; }
      .status-bar .text-button { font-size: 12px; }
      .paused-label { margin-left: 10px; font-size: 11px; color: #855800; }
      .tabs { display: flex; padding: 0 14px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
      .tab { flex: 1; padding: 14px 4px 11px; border: 0; border-bottom: 3px solid transparent; background: transparent; cursor: pointer; color: #5f6368; font-size: 13px; }
      .tab[aria-selected="true"] { border-bottom-color: #1a73e8; color: #185abc; font-weight: 600; }
      .badge { display: inline-block; padding: 1px 5px; border-radius: 8px; background: #edf0f5; font-size: 10px; }
      .content { min-height: 0; overflow-y: auto; flex: 1; overscroll-behavior: contain; }
      .footer { flex-shrink: 0; padding: 12px 20px; border-top: 1px solid #e5e7eb; background: #f7f9fc; }
      .footer a { display: block; color: #5f6368; text-decoration: none; font-size: 11px; line-height: 1.6; }
      .footer a > span { display: block; }
      .footer strong { color: #374151; font-weight: 600; }
      .footer .feedback-link { color: #1967d2; }
      .footer a:hover .feedback-link { text-decoration: underline; }
      section { padding: 18px 20px; }
      .filter-section { border-top: 1px solid #edf0f5; }
      .section-intro { margin: 0 0 12px; font-size: 12px; color: #5f6368; }
      .search-hint { margin: 6px 0 0; font-size: 11px; color: #6b7280; }
      .selected-names { max-height: 100px; overflow-y: auto; margin-bottom: 14px; }
      .disclosure summary { font-weight: 600; cursor: pointer; padding: 6px 0; }
      .disclosure-body { padding-top: 12px; }
      .field-label { display: block; margin-bottom: 6px; font-size: 12px; color: #5f6368; }
      .help { margin-top: 14px; }
      .help summary { color: #6b7280; font-size: 12px; cursor: pointer; }
      .filter-status { display: flex; align-items: center; gap: 8px; padding: 0 0 10px; color: #185abc; font-size: 12px; }
      #tae-filter-summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
      .filter-status .text-button { flex-shrink: 0; font-size: 12px; }
      h3 { margin: 0 0 12px; font-size: 14px; }
      .input, .select { width: 100%; height: 38px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 10px; background: white; color: #202124; outline: none; }
      .input:focus, .select:focus { border-color: #1a73e8; }
      .row { margin-top: 8px; }
      .counts { margin: 0; font-size: 12px; font-weight: 600; line-height: 1.5; }
      .hint { font-size: 12px; line-height: 1.5; color: #6b7280; }
      [hidden] { display: none !important; }
      .event-list { max-height: clamp(140px, 40vh, 380px); overflow-y: auto; margin-top: 10px; overscroll-behavior: contain; }
      .event-item { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 6px; font-size: 13px; cursor: pointer; }
      .event-item:hover { background: #f7f9fc; }
      .event-item:has(input:checked) { background: #edf4ff; }
      input[type="checkbox"] { accent-color: #1a73e8; width: 15px; height: 15px; flex-shrink: 0; }
      .event-name { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .event-count { color: #6b7280; }
      .picker-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .selection-actions { position: sticky; bottom: 0; background: #fff; padding-top: 10px; border-top: 1px solid #edf0f5; margin-top: 10px; }
      .selection-actions .hint { margin: 0 0 8px; color: #374151; }
      .picker-actions .small-button { flex: 1; }
      .picker-actions .text-button { width: 100%; text-align: center; font-size: 12px; }
      .text-button { border: 0; background: transparent; color: #1967d2; cursor: pointer; padding: 6px 0; }
      button:disabled { opacity: .45; cursor: default; }
      .name-chip { max-width: 100%; overflow-wrap: anywhere; margin: 3px; padding: 5px 8px; border: 1px solid #c4d7f5; border-radius: 12px; background: #eef4ff; color: #174ea6; cursor: pointer; }
      .exclusion-toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; }
      .checkbox { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 13px; }
      .section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .section-title h3 { margin: 0; }
      .small-button { border: 1px solid transparent; border-radius: 6px; background: #1a73e8; color: white; padding: 8px 10px; cursor: pointer; font-size: 12px; }
      .small-button.secondary { background: #fff; color: #185abc; border-color: #c4d7f5; }
      .rule, .exclusion { margin-bottom: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
      .rule-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .rule-color { width: 32px; height: 28px; border: 0; padding: 0; background: none; cursor: pointer; }
      .rule-pattern { margin-bottom: 8px; }
      .delete-rule { margin-left: auto; border: 0; background: transparent; font-size: 20px; cursor: pointer; color: #6b7280; }
      @media (prefers-reduced-motion: reduce) { .panel { transition: none; } }
    `;
  }
}
