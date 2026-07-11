# Debug tooling

The app streams its diagnostics ring into hidden Plex playlists (`js/logpipe.js`),
so a desktop on the same Plex account can tail the phone's log and drive the app
remotely — no Mac, no copy-paste. Turn it on with **Options → Live debug** on the
device. One-tap **Options → Bug report** uploads the whole ring even when Live
debug is off.

Run these with Node ≥ 18 (a portable install lives at `C:\Users\nzilb\tools\node-dist\node.exe`).
The Plex token is resolved from `--token`, `$PLEX_TOKEN`, or the local LMS
TomeRoam prefs — it is never stored in this repo.

```
# watch the phone's log live (3s poll; --snap prints every state snapshot change)
node tools/tail-log.mjs

# fetch + assemble one-tap bug reports (--delete removes them after printing)
node tools/tail-log.mjs --reports --delete

# remote REPL: send a command, print the result from the streamed log
node tools/send-cmd.mjs ping
node tools/send-cmd.mjs state
node tools/send-cmd.mjs eval "document.title"
node tools/send-cmd.mjs js "return PBDebug.snapshot()"
node tools/send-cmd.mjs reload
```

Boards: `pb_log_<device>` (app writes, ~4s cadence), `pb_cmd_<device>` (desktop
writes, app polls while Live debug is on), `pb_report_<ts>_<i>of<n>` (one-shot).

Unit tests (also exercise the real `js/logic.js`, `js/plex.js`, `js/presence.js`):

```
node --test test/*.test.js
```
