---
name: verify
description: Verify a change in the running app — headless Chrome over file://, driven through CDP from a Node script on stdin, reading the rendered DOM and the printed report
---

# Verify in the running app

No build step: the pages open directly over `file://`. Chrome is at
`C:/Program Files/Google/Chrome/Application/chrome.exe` (Edge also works).

## Handle
- Launch Chrome yourself: `--headless=new --remote-debugging-port=<port> --user-data-dir=<profile>`. Kill only that
  process at the end — never `taskkill /IM chrome.exe`.
- The profile path must be SHORT for anything touching the service worker (PWA, offline): use
  `"$(cygpath -m "$TMP")/nmv"` and delete it afterwards. A scratchpad path is too long — `register()` resolves,
  then the worker silently disappears and Cache Storage stays empty. For DOM-only checks any path works.
- Offline check: serve the extracted package (`python -m http.server <port> --bind 127.0.0.1`), load twice until
  `navigator.serviceWorker.controller`, then `Network.setCacheDisabled` + `Network.emulateNetworkConditions
  {offline: true}` and reload every page with and without `?id=`; `Page.getInstallabilityErrors` must be empty.
- Driver: `node - "$(pwd -W)" "<profile>" <<'EOF' … EOF` from the repo root. `pwd -W` gives the path with
  forward slashes, so the page URL is `'file:///' + ROOT + '/effluent.html'`.
- **No backslashes inside the heredoc**: they are lost (`\s`, `\d`, `\n` break the script). Use
  `String.fromCharCode(10)` and inject a whitespace normaliser with `Page.addScriptToEvaluateOnNewDocument`:
  `window.__n = s => s.replace(new RegExp('[' + String.fromCharCode(32,10,9,13) + ']+', 'g'), ' ').trim();`
  together with `window.alert = window.confirm = window.print = () => {}` (they block).
- CDP: `fetch('http://127.0.0.1:<port>/json')` → page `webSocketDebuggerUrl` → `Runtime.evaluate` with
  `returnByValue: true`, `Page.navigate` and ~1.6 s wait. Node ≥ 22 has `fetch` and `WebSocket` built in.

## Reading the page
- Text inside a closed `<details>` has an empty `innerText`: read `textContent`.
- Spanish screens are an asynchronous overlay (MutationObserver): after changing a field or toggling `#langToggle`,
  wait ~300 ms before reading.
- Fields: set `value`, then dispatch `input` and `change` (bubbling). Input errors go to `#calcError` and the field
  gets `aria-invalid="true"`.
- Separator: `#decimalToggle`; current mode `UTILS.getDecimalMode()`. The browser default follows the system
  language (comma on a Spanish Windows).
- Reports: `#btnPrintDose`, `#btnPrintDecay`, `#btnPrint` (Effluent, Caregiver) build `#printReport`; read it with
  `innerText` right after the click.
- `decay.html?id=` and `dose.html?id=` select a nuclide and calculate.

## Flows worth driving
- Effluent: defaults (Scenario 2 total 3.546 mSv/y, catchment 100 %); out-of-range parameters (respirable fraction
  1.5, external time 9000, criterion −1, patients −5) → visible name, range, unit, field marked, Spanish message.
- Dose: Pd-103, Pb 1 mm → «Out of tabulated range» warning (screen, report, Spanish); Y-90 → hypothetical note.
- Decay: Ba-133 (CSN values, not Table B) and Lu-177 (Table B), screen and report; target date equal to / before
  the reference date.
- Spanish with the point and with the comma: catalog decimals follow the separator, «…» quotations do not change.

`node tools/browser-smoke.js` covers most of these as regression checks; this skill is for observing a new change.
