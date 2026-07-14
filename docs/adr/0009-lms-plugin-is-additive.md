# 0009 — The app is standalone; the LMS plugin is additive-only

**Status:** Accepted

## Context

TomeRoam began alongside a companion Lyrion (LMS) plugin that reads Plex's
database on the server. It's tempting to treat the plugin as part of the product
— but LMS is a niche server almost no user runs, so anything that *requires* it
would strand nearly everyone.

## Decision

The app is **fully functional standalone**, with **no plugin**:

- **Which books** to resume comes from Plex's own recently-played data
  (`lastViewedAt`).
- **Where** to resume, for anything played in the app, comes from the app's own
  durable per-device Progress ([0002](0002-coordination-via-hidden-playlist-boards.md)).
- **Cross-device** handoff (TomeRoam ↔ TomeRoam) is native via the presence/
  progress mesh.

The plugin is **purely additive**: its one contribution is the resume *offset*
for books played in **other** Plex apps (Prologue, Plexamp) — the single value
Plex hides over its HTTP metadata API, which a server-side DB read can surface.
When absent, that grey cross-app resume time simply doesn't appear; nothing
breaks.

## Consequences

- Never frame any plugin capability as "required" or a "bridge the app needs" —
  it's an optional enhancement, and a Plex-API limitation should be stated as a
  Plex limitation, not the plugin's job to fix.
- **Planned direction:** even cross-*app* resume should not depend on LMS. Plex
  exposes a live session's `viewOffset` over HTTP after all — on the notification
  WebSocket (`PlaySessionStateNotification`) and `/status/sessions` — and the app
  already receives those events but currently discards the offset. Capturing it
  into durable Progress would make cross-app resume work plugin-free; the DB read
  would remain only for the cold/long-closed case. (Not yet built.)
