# Security & trust model

TomeRoam is a client for **your own** Plex server, signed in as **you**. It runs
as static files in your browser (or a WebView on Android). This document
describes what it trusts, what it stores, and where the boundaries are.

## Credentials

- The app authenticates through the standard **plex.tv PIN flow**: you approve a
  short-lived PIN in a Plex-hosted page, and Plex returns an auth token to the
  app.
- The token is stored **on the device only** — the browser's `localStorage`, or
  the WebView's origin storage on Android. It is **never** committed to this
  repository, sent to any third party, or placed in a URL / query string.
- This is a public repository and contains **no secrets**: no tokens, keys, or
  server addresses. Server discovery and connection happen at runtime from the
  signed-in account.

## What talks to the network, and to whom

- **Plex only**, for library, cover art, audio, and progress — the same
  endpoints the official clients use, over Plex Remote Access / `*.plex.direct`.
- **GitHub Pages**, for the static app itself and a small `build.json` fetched to
  check for updates. This is an *update check*, not a runtime dependency: after
  one successful load the app runs fully from cache with no network.
- No analytics, telemetry, ads, or other third-party endpoints.

## Data at rest (all on your device or your own server)

- On the device: the Plex token, your playback progress, app settings, and any
  downloaded or buffered audio (IndexedDB).
- On your Plex server: hidden playlists used as coordination "boards" — device
  presence, durable progress, and (only when enabled) the debug log. These live
  in your own library and carry no credentials.

## The remote debug channel — an explicit trust boundary

TomeRoam has a built-in remote debug channel (`js/logpipe.js`) so a desktop on
the same Plex account can tail the app's log and drive it — invaluable for a
phone app that otherwise can't be inspected. **Understand its trust model:**

- It is **off by default.** Streaming the log requires turning on
  *Options → Live debug*; the one-tap *Bug report* uploads a snapshot on demand.
- The command channel accepts `eval` / `js` commands and executes them in the
  running app. Its security boundary is **your Plex account**: the command board
  is a hidden playlist on your server, so only something authenticated to your
  Plex can write to it. In the intended single-user setup, that is only you.
- **Assumption:** this is acceptable *because* the app is used by the account
  owner on their own server. Anyone who obtains your Plex token could both read
  the log and send commands — so treat the token accordingly.
- **Planned hardening** (before any multi-user distribution): gate `eval` / `js`
  behind their own explicit setting, separate from the logging toggle, so
  enabling logging can never by itself enable remote code execution.

## Reporting a problem

This is a personal project. If you find a security issue, please open an issue on
the GitHub repository — and leave any token or personal data out of the report.
