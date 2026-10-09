import type { ColorRule, ExtensionSettings, MatchMode } from "../types";

type SettingsCallback = (settings: ExtensionSettings) => void;

export class Sidebar {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private settings: ExtensionSettings;

  constructor(
    settings: ExtensionSettings,
    private readonly onChange: SettingsCallback
  ) {
    this.settings = structuredClone(settings);
  }

  public mount(): void {
    if (document.querySelector("[data-tae-extension-root]")) return;

    this.host = document.createElement("div");
    this.host.setAttribute("data-tae-extension-root", "true");
    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: "open" });
    this.render();
  }

  public updateSettings(settings: ExtensionSettings): void {
    this.settings = structuredClone(settings);
    this.render();
  }

  private render(): void {
    if (!this.shadow) return;

    this.shadow.innerHTML = `
      <style>${this.styles()}</style>
      <button id="tae-toggle" class="toggle" aria-label="Open Tag Assistant Power Tools">⚡</button>
      <aside id="tae-panel" class="panel">
        <header>
          <div><strong>Tag Assistant</strong><span>Power Tools</span></div>
          <button id="tae-close" class="close" aria-label="Close">×</button>
        </header>
        <section>
          <h3>Filter events</h3>
          <input id="tae-filter" class="input" type="text" placeholder="purchase" value="${this.escape(this.settings.filter.query)}" />
          <div class="row">
            <select id="tae-filter-mode" class="select">${this.modeOptions(this.settings.filter.mode)}</select>
          </div>
          <label class="checkbox">
            <input id="tae-hide" type="checkbox" ${this.settings.filter.hideUnmatched ? "checked" : ""} />
            Hide events that don't match
          </label>
        </section>
        <section>
          <div class="section-title">
            <h3>Color rules</h3>
            <button id="tae-add-rule" class="small-button">+ Rule</button>
          </div>
          <div id="tae-rules">${this.settings.colorRules.map((rule) => this.renderRule(rule)).join("")}</div>
        </section>
      </aside>
    `;

    this.bindEvents();
  }

  private renderRule(rule: ColorRule): string {
    return `
      <div class="rule" data-rule-id="${rule.id}">
        <div class="rule-top">
          <input class="rule-enabled" type="checkbox" ${rule.enabled ? "checked" : ""} />
          <input class="rule-color" type="color" value="${rule.color}" />
          <button class="delete-rule" title="Delete rule">×</button>
        </div>
        <input class="input rule-pattern" type="text" value="${this.escape(rule.pattern)}" placeholder="Event name" />
        <select class="select rule-mode">${this.modeOptions(rule.mode)}</select>
      </div>
    `;
  }

  private bindEvents(): void {
    if (!this.shadow) return;

    const panel = this.shadow.getElementById("tae-panel");
    this.shadow.getElementById("tae-toggle")?.addEventListener("click", () => panel?.classList.add("open"));
    this.shadow.getElementById("tae-close")?.addEventListener("click", () => panel?.classList.remove("open"));

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
      this.emit();
    });

    mode?.addEventListener("change", () => {
      rule.mode = mode.value as MatchMode;
      this.emit();
    });

    deleteButton?.addEventListener("click", () => {
      this.settings.colorRules = this.settings.colorRules.filter((current) => current.id !== id);
      this.emit();
      this.render();
    });
  }

  private emit(): void {
    this.onChange(structuredClone(this.settings));
  }

  private modeOptions(selected: MatchMode): string {
    const options: Array<{ value: MatchMode; label: string }> = [
      { value: "contains", label: "Contains" },
      { value: "exact", label: "Exact" },
      { value: "regex", label: "Regex" }
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
      :host { font-family: Inter, Arial, sans-serif; }
      * { box-sizing: border-box; }
      .toggle {
        position: fixed; right: 16px; bottom: 20px; width: 48px; height: 48px;
        border: 0; border-radius: 50%; background: #1a73e8; color: white;
        font-size: 20px; cursor: pointer; z-index: 2147483647;
        box-shadow: 0 5px 18px rgba(0,0,0,.25);
      }
      .panel {
        position: fixed; top: 0; right: -360px; width: 340px; height: 100vh;
        background: #fff; color: #202124; z-index: 2147483647;
        box-shadow: -5px 0 25px rgba(0,0,0,.18); transition: right 180ms ease;
        overflow-y: auto;
      }
      .panel.open { right: 0; }
      header { display: flex; justify-content: space-between; align-items: center; padding: 18px; border-bottom: 1px solid #e5e7eb; }
      header strong { display: block; font-size: 16px; }
      header span { color: #6b7280; font-size: 12px; }
      .close { border: 0; background: transparent; font-size: 26px; cursor: pointer; }
      section { padding: 18px; border-bottom: 1px solid #e5e7eb; }
      h3 { margin: 0 0 12px; font-size: 14px; }
      .input, .select { width: 100%; height: 38px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 10px; background: white; color: #202124; outline: none; }
      .input:focus, .select:focus { border-color: #1a73e8; }
      .row { margin-top: 8px; }
      .checkbox { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 13px; }
      .section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .section-title h3 { margin: 0; }
      .small-button { border: 0; border-radius: 5px; background: #1a73e8; color: white; padding: 6px 10px; cursor: pointer; }
      .rule { margin-bottom: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
      .rule-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .rule-color { width: 32px; height: 28px; border: 0; padding: 0; background: none; cursor: pointer; }
      .rule-pattern { margin-bottom: 8px; }
      .delete-rule { margin-left: auto; border: 0; background: transparent; font-size: 20px; cursor: pointer; color: #6b7280; }
    `;
  }
}
