# Tag Assistant Power Tools

**English** | [Português (Brasil)](README.pt-BR.md)

A Chrome and Microsoft Edge extension that helps you focus on relevant events in [Google Tag Assistant](https://tagassistant.google.com/): select events, hide noise, and highlight what matters.

**[Download the ready-to-use ZIP — v0.1.0 preview](https://github.com/ArandaBM/tag-assistant-power-tools/releases/download/v0.1.0/tag-assistant-power-tools.zip)** · [Release details](https://github.com/ArandaBM/tag-assistant-power-tools/releases/tag/v0.1.0)

## Try it without building

No Node.js, npm, or Git required.

1. Download **tag-assistant-power-tools.zip** using the link above. The GitHub **Source code** archives are not the ready-to-use extension.
2. Extract the ZIP into a permanent folder on your computer. Do not try to load the ZIP itself.
3. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
4. Enable **Developer mode**, click **Load unpacked**, and select the extracted folder containing **manifest.json**.
5. Open or refresh a debug session in [Tag Assistant](https://tagassistant.google.com/), then click the Power Tools button.

Keep the extracted folder: the browser loads the extension from it. This is a manual preview installation, not a Chrome Web Store or Edge Add-ons installation. For future updates, extract the new package over the same folder, click **Reload** on the extensions page, and refresh Tag Assistant.

## Features

- **Events:** searchable list of detected event names, with occurrence counts and multiple selection.
- **Show only selected:** apply an exact-name filter without typing. Active names appear as removable chips.
- **Filter by text:** refine results using Contains, Exact, or Regex.
- **Saved exclusions:** hide several event types, enable/disable individual rules, and keep preferences across sessions.
- **Colors:** choose a detected event or type a name/pattern, then assign a color.
- **Live updates:** filters, exclusions, colors, and counts follow incoming events.
- **Temporary override:** show all events without deleting rules, then resume filtering.
- **Focused sidebar:** separate Events, Exclusions, and Colors tabs; secondary controls and help expand on demand.
- **Automatic language:** Portuguese and English, following the browser UI language. Other languages fall back to English.
- **Feedback channel:** a footer link to the author's LinkedIn profile.

The extension changes the visualization only. It does not delete events or change the site's tracking implementation. Event names are not translated.

## Build from source (developers)

Requirements: Git, npm, **Node.js 24.15 or newer in the 24.x line**, and Chrome or Microsoft Edge. This Node version supports the included development and test dependencies.

```bash
git clone https://github.com/ArandaBM/tag-assistant-power-tools.git
cd tag-assistant-power-tools
npm ci
npm run build
```

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the generated **dist** folder.
4. Open a real debug session in [Tag Assistant](https://tagassistant.google.com/).
5. Click the floating Power Tools button in the bottom-right corner.

After rebuilding, reload the extension on the browser's extensions page and refresh Tag Assistant. The `dist` folder is generated locally and is not committed to this repository.

## Using the extension

### Events and filters

The search field **only searches the sidebar list**. To change what Tag Assistant displays, check one or more event names and click **Show only selected**. This replaces the previous selected-name filter, clears its text query, and hides other names. Selected names match literally and case-sensitively.

Use **Filter by text** to type a name or pattern. When selected names are active, the text further narrows that selection. Its hide checkbox lets you hide or dim nonmatching events. **Clear filter** removes the selected names and text query, while leaving saved exclusions intact.

### Exclusions

Click **Exclude selected** in Events, or add a rule in the Exclusions tab. Rules support Contains, Exact, and Regex; newly created exclusions ignore letter case. Matching any enabled exclusion hides the event, even when the main filter is empty or configured to dim other events.

Disable an exclusion to keep it for later, or delete it. Blank rules do nothing. For example, an exact `scroll` exclusion hides `scroll`; a Contains `click` exclusion also hides `button_click`.

Older negative filters migrate automatically into saved exclusions. Selected-name constraints and case sensitivity are preserved and shown in the migrated rule.

### Colors

Add a rule in Colors and **choose a detected event**. Selecting a name automatically sets Exact matching. For names not yet listed, or to match several events with a pattern, expand **Type a name or pattern**.

Empty color rules have no effect. The first enabled matching color rule wins. Colors apply to events retained by filtering; the temporary show-all mode also keeps colors active.

### Counts and temporary display

Counts reflect event rows currently detected in Tag Assistant, including rows hidden by Power Tools. Dimmed events count as visible and are also identified separately. The event picker shows each name once with its occurrence count; it does **not** group or reorder the original Tag Assistant timeline.

**Show all temporarily** pauses filtering and exclusions in the current tab. **Resume filtering** or a page reload restores them. This temporary choice is not saved or synced.

## Preferences and limits

- Filters, exclusions, and color rules are stored using `chrome.storage.sync`; browser sync behavior depends on the user's browser configuration.
- The sidebar preserves its active tab, open sections, and scroll position during rule edits. Arrow keys and Home/End navigate its tabs.
- The detected-event list is not a historical archive: events removed or unloaded by Tag Assistant may leave the list.
- Detection uses numbered interactive rows and their titles, without depending on Tag Assistant CSS classes. Future changes to Google's DOM may require adapter updates.
- Permissions are limited to extension storage and `https://tagassistant.google.com/*`.

## Development

```bash
npm run watch       # Rebuild when source files change
npm run typecheck   # TypeScript validation
npm test            # Local DOM and behavior tests
npm run build       # Generate dist
```

Run checks appropriate to the change. The automated tests use jsdom; real browser validation remains useful for changes involving Tag Assistant's live DOM.

```text
src/
  background/       Extension background worker
  content/          DOM adapter, event styling, and update loop
  rules/            Filtering, exclusion, and color matching
  storage/          Preferences and migration
  ui/               Sidebar and Portuguese/English strings
  types.ts          Shared types
tests/              Focused behavior and integration tests
```

Built with TypeScript, esbuild, Manifest V3, Shadow DOM, and Chrome Storage API.

## Suggestions and feedback

Created by **[Bruno Aranda](https://www.linkedin.com/in/brunoarandati/)**. Have a suggestion or found a problem? [Let's talk on LinkedIn](https://www.linkedin.com/in/brunoarandati/).

Future features will be guided by user feedback. This project is independent and is not affiliated with or endorsed by Google or Microsoft.
