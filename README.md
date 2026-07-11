# TomeRoam

A mobile web (PWA) audiobook player for Plex that does the one thing Prologue won't:
**read your saved position back from the server when you open a book** — not just write it.

## How it works

- **Audio, browsing, progress writes** talk directly to Plex (via Plex Remote Access), exactly like Prologue.
- **Cold resume** (reopening a book when nothing is currently playing) is read from a hidden Plex
  playlist whose summary is kept in sync with Plex's real saved offsets by a companion
  LMS plugin running on the home server.

The app itself holds **no secrets** — it signs into Plex at runtime via the standard
plex.tv PIN flow and stores the token on the device.

## Hosting

Static files served over HTTPS by GitHub Pages. Add to Home Screen on iOS to install.
An Android build (self-contained WebView shell) is published under Releases.
