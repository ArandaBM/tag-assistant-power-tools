import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const { outputFiles } = await build({
  entryPoints: ["src/content/index.ts"], bundle: true, write: false, format: "iife",
});
const row = (index, name) => `<div role="button"><span>${index}</span><span><span title="${name}">${name}</span></span></div>`;
const key = "tagAssistantPowerToolsSettings";

test("saved exclusions, incoming events, counters, colors and temporary bypass work together", async (t) => {
  let saved;
  function start() {
    const dom = new JSDOM(`<!doctype html><html><head></head><body><main>${row(1, "purchase")}${row(2, "scroll")}${row(3, "page_view")}</main></body></html>`, {
      url: "https://tagassistant.google.com/", runScripts: "outside-only",
    });
    t.after(() => dom.window.close());
    const { window } = dom;
    const frames = [];
    const listeners = [];
    window.structuredClone = structuredClone;
    window.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
    window.chrome = { storage: {
      sync: {
        get: async () => ({ [key]: structuredClone(saved) }),
        set: async (value) => {
          saved = structuredClone(value[key]);
          queueMicrotask(() => listeners.forEach((listener) => listener({ [key]: { newValue: saved } }, "sync")));
        },
      },
      onChanged: { addListener: (fn) => listeners.push(fn), removeListener: () => {} },
    } };
    window.eval(outputFiles[0].text);
    const flush = async () => {
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setImmediate(resolve));
        if (!frames.length) return;
        frames.splice(0).forEach((callback) => callback());
      }
      assert.fail("Unexpected rendering loop");
    };
    const find = (selector) => window.document.querySelector("[data-tae-extension-root]").shadowRoot.querySelector(selector);
    const set = (selector, value, event = "input") => {
      find(selector).value = value;
      find(selector).dispatchEvent(new window.Event(event));
    };
    const counts = () => find("#tae-counts").textContent;
    return { window, find, set, counts, flush };
  }

  const app = start();
  await app.flush();
  assert.equal(app.counts(), "3 visible · 0 hidden");
  app.find("#tae-toggle").click();
  app.find("#tae-add-exclusion").click();
  app.set(".exclusion-pattern", "scroll");
  await app.flush();
  assert.equal(saved.exclusions[0].pattern, "scroll");
  assert.equal(app.counts(), "2 visible · 1 hidden");
  assert.equal(app.find('[data-event-name="scroll"] .event-count').textContent, "1");
  const scroll = app.window.document.querySelector('[data-tae-event-name="scroll"]');
  assert.equal(scroll.getAttribute("data-tae-hidden"), "true");

  app.set("#tae-filter", "purchase");
  app.find("#tae-hide").click();
  await app.flush();
  assert.equal(app.counts(), "2 visible · 1 hidden · 1 dimmed");
  assert.equal(app.window.document.querySelector('[data-tae-event-name="purchase"]').getAttribute("data-tae-colored"), "true");

  app.window.document.querySelector("main").insertAdjacentHTML("beforeend", row(4, "scroll"));
  await app.flush();
  assert.equal(app.counts(), "2 visible · 2 hidden · 1 dimmed");
  assert.equal(app.find('[data-event-name="scroll"] .event-count').textContent, "2");
  app.find("#tae-show-all").click();
  await app.flush();
  assert.equal(app.counts(), "4 visible · 0 hidden");
  assert.equal(app.window.document.querySelectorAll('[data-tae-hidden], [data-tae-dimmed]').length, 0);
  assert.equal(app.window.document.querySelector('[data-tae-event-name="purchase"]').getAttribute("data-tae-colored"), "true");
  assert.equal("showAll" in saved, false);
  app.find("#tae-show-all").click();
  await app.flush();
  assert.equal(app.counts(), "2 visible · 2 hidden · 1 dimmed");

  app.find(".exclusion-enabled").click();
  await app.flush();
  assert.equal(app.counts(), "4 visible · 0 hidden · 3 dimmed");
  app.find(".exclusion-enabled").click();
  app.find("#tae-show-all").click();
  await app.flush();
  const reloaded = start();
  await reloaded.flush();
  assert.equal(reloaded.counts(), "2 visible · 1 hidden · 1 dimmed");
  assert.equal(reloaded.find("#tae-show-all").getAttribute("aria-pressed"), "false");
  assert.equal(reloaded.find(".exclusion-pattern").value, "scroll");
  reloaded.set("#tae-filter", "");
  reloaded.find(".delete-exclusion").click();
  await reloaded.flush();
  assert.equal(reloaded.counts(), "3 visible · 0 hidden");
  reloaded.find("#tae-hide").click();
  reloaded.find('[data-event-name="purchase"] .event-select').click();
  reloaded.find('[data-event-name="page_view"] .event-select').click();
  reloaded.find("#tae-use-events").click();
  await reloaded.flush();
  assert.equal(reloaded.counts(), "2 visible · 1 hidden");
  assert.equal(reloaded.find('[data-event-name="scroll"] .event-count').textContent, "1");
  const pickedReload = start();
  await pickedReload.flush();
  assert.equal(pickedReload.counts(), "2 visible · 1 hidden");
  assert.equal(pickedReload.window.document.querySelector("[data-tae-extension-root]").shadowRoot.querySelectorAll(".remove-event-name").length, 2);
  pickedReload.find('[data-event-name="page_view"] .event-select').click();
  pickedReload.find("#tae-exclude-events").click();
  await pickedReload.flush();
  assert.equal(pickedReload.counts(), "1 visible · 2 hidden");
});
