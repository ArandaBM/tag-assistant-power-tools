# Tag Assistant Power Tools

Chrome extension that adds productivity and QA helpers to Google Tag Assistant.

> Early MVP. The project is currently validating a robust way to identify event rows in the live Tag Assistant DOM without coupling the extension to fragile generated CSS classes.

## v0.1

The first version focuses on the event stream:

- Filter events by `contains`, `exact` or `regex`
- Hide or dim events that do not match the active filter
- Create color rules for specific events or groups of events
- Persist preferences with `chrome.storage.sync`
- React to new Tag Assistant events with `MutationObserver`
- Isolate Tag Assistant DOM parsing behind a dedicated adapter
- Inject the UI through Shadow DOM to avoid style collisions

## Tech stack

- Chrome Extension Manifest V3
- TypeScript
- esbuild
- Shadow DOM
- Chrome Storage API

## Project structure

```text
src/
├── background/
├── content/
│   ├── event-styler.ts
│   ├── index.ts
│   └── tag-assistant-adapter.ts
├── rules/
├── storage/
├── ui/
└── types.ts
```

## Run locally

Requirements: Node.js 20+ and Google Chrome.

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist` folder.

Open a debug session at `https://tagassistant.google.com/`. A floating Power Tools button should appear in the bottom-right corner.

For development:

```bash
npm run watch
```

After rebuilding, reload the extension from `chrome://extensions` when needed.

## Why an adapter?

Tag Assistant is a dynamic web application and its internal DOM can change. The extension intentionally keeps all event-discovery heuristics inside `TagAssistantAdapter` instead of spreading Tag Assistant-specific selectors throughout the codebase.

The flow is:

```text
Tag Assistant DOM
       ↓
TagAssistantAdapter
       ↓
Normalized events
       ↓
Filter + Color Rules
       ↓
EventStyler
```

This makes future DOM changes much cheaper to support.

## Roadmap

### v0.2

- Validate the adapter against the current production Tag Assistant DOM
- Event counters
- Multiple include/exclude filters
- Favorites
- Better rule management

### v0.3

- Tracking specification import
- Required parameter validation
- Naming convention validation
- Warnings and errors

### Future

- Reusable QA profiles
- GA4 ecommerce presets
- Session summaries
- Exportable QA reports
- Funnel/event-sequence analysis

## Status

This project is under active development and is not affiliated with or endorsed by Google.
