# PLAN — Native lock-screen media (Android now, iOS later)

Status: **PLANNING ONLY.** No native code until the build-host fork (below) is decided. This is the tracked design for fixing lock-screen media controls, which the pure web/PWA layer provably cannot do.

## The problem (established, not speculative)

- **iOS PWA:** lock-screen controls exist, but **play-from-pause while backgrounded is silent** — an `<audio>` element paused in the background cannot reactivate its `AVAudioSession` until foreground. Confirmed on device (builds `.95`–`.99`) and in the literature (WebKit #198277 — the *fixed* iOS-15.4 bug was "background playback stops"; Apple DevForums 762582 — the *still-open* "paused then can't resume until foreground"). Web Audio API is worse (#237878, suspends when backgrounded). No reliable web-layer workaround. `.99` mitigates to "auto-resume the instant you unlock" — that is the PWA ceiling.
- **Android WebView APK:** **no lock-screen controls at all.** A raw `android.webkit.WebView` does NOT bridge the page's `MediaSession` API to the Android system MediaSession/notification (that's a Chrome-the-browser feature, not a WebView feature). Background *web audio* itself plays fine on Android; only the controls are missing.

A lock-screen Play button that doesn't work is a broken-app-level defect. The only real fix is native media integration. **A WebView shell that still plays through the web `<audio>` element inherits the iOS limit** — for iOS the audio bytes must move to a native player; for Android only the controls must move to native.

## Architecture (shared bridge; different depth per platform)

```
   OS lock screen / notification / headset / Bluetooth / CarPlay-AndroidAuto
                                  │
              ┌───────────────────┴───────────────────┐
      ANDROID: Media3 MediaSessionService      iOS: MPRemoteCommandCenter
                    │                                    │  + MPNowPlayingInfoCenter
        WebAudioPlayer : SimpleBasePlayer          AVPlayer (owns decode/output)
                    │                                    │
                    └──────────► JS ↔ native bridge ◄────┘
                                  │
                       PlaybackController (js/playback.js)
                                  │
                 ANDROID: <audio> element   iOS: (audio moved to AVPlayer)
```

- **The JS↔native bridge contract is designed ONCE** (command + event surface below). Android uses it for controls; iOS reuses it for controls **and** relocating playback.
- The native side talks to the **`PlaybackController`** (the deferred JS extraction — see `[[tomeroam-code-review-refactor]]`), never to `app.js` internals. That controller is the seam this whole plan plugs into, which is why its extraction is step 0.

### Bridge contract (v1)

**Commands (native → JS):** `play` · `pause` · `seek(sec)` · `skipForward` · `skipBack` · `next` · `prev` · `setRate(r)`. These map to the controller's existing methods (`resumePlay`, `userPause`, seek, skip/chapter).

**State events (JS → native):** on any real change, JS pushes `{ playing:bool, positionSec, durationSec, rateNum, title, author, artworkUrl, chapterIndex, canNext, canPrev, buffering:bool, error:bool }`. The native adapter stores this and updates its player/session state, which the OS renders automatically.

**Discipline (the hard-won lesson of `.85`–`.99`): the native side must NOT assume a command succeeded.** It forwards the command to JS and waits for JS's *real* `play`/`pause`/`waiting`/`error`/chapter-change report before updating displayed state. Trust observed state, never the command.

## Android — the lighter fix (buildable on the current Windows box, no Mac)

- A native **`MediaSessionService`** hosting a **`MediaSession`** built with a custom **`WebAudioPlayer : SimpleBasePlayer`** (Media3's sanctioned base for non-ExoPlayer players — **ExoPlayer is NOT needed initially**). Audio decode/output stays in the WebView `<audio>` element; the adapter is a thin control/state relay.
- Adapter mapping:
  - `handleSetPlayWhenReady(true)` → bridge → `PlaybackController.resumePlay()`
  - `handleSetPlayWhenReady(false)` → bridge → `userPause()`
  - `handleSeek()` → bridge → seek
  - next/prev/skip → bridge → skip/chapter
  - exposes: playing/paused, current media item (title/author/artwork), duration, position, available commands — all from JS-reported state, via `SimpleBasePlayer.State` + `invalidateState()`.
- **Foreground service:** `MediaSessionService` with `foregroundServiceType="mediaPlayback"`. Manifest:
  ```xml
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
  <service android:name=".TomeRoamMediaService" android:foregroundServiceType="mediaPlayback" .../>
  ```
  Media3 auto-creates/maintains the MediaStyle notification from session/player state. (Android 15+/16 background-audio hardening increasingly *requires* a playback foreground service or the app gets frozen/choppy.)
- **v1 limitation (document it, don't hide it):** the adapter breaks Media3's assumption that the Player lives in the service and outlives the Activity — here the decoder is in the WebView bound to the Activity. So **controls work only while the TomeRoam WebView/Activity is alive; process/WebView death needs reopening the app.** Acceptable for a first cut.
- **Escalate to ExoPlayer** (real native decode) ONLY if testing shows: background Play doesn't restart WebView audio · Android destroys the WebView during long playback · Bluetooth/audio-focus is unreliable · playback must survive Activity/task/process death.

## iOS — the heavier fix (Mac + Xcode + Apple Developer $99/yr, gated)

- No native iOS app exists today (iOS is a pure Safari PWA). This means **building a native/hybrid iOS app** (WKWebView host + native audio), not a plugin swap.
- **`AVPlayer` + `AVAudioSession(.playback, active)`** owns decode/output (the web element can't resume in bg regardless of who sends Play, so controls-only is insufficient). `MPRemoteCommandCenter` + `MPNowPlayingInfoCenter` for controls/metadata, bridged via `WKScriptMessageHandler` ↔ `evaluateJavaScript` using the same contract.
- **The downloads-storage question (dominant cost):** downloaded books are IndexedDB blobs served by the SW `./__dl/` range path; `AVPlayer` cannot read IndexedDB. So offline playback forces a decision: **native owns downloaded files** (native downloads to app storage, plays local files directly) vs. keeping IDB (needs a native-readable bridge that doesn't really exist). Streaming is easy — `AVPlayer` plays the Plex URL directly (needs the same `plex.direct` cert-chain handling the Android WebView already does in `PlexDirectTrust`).
- **Requires a Mac** for build/sign (Apple toolchain is Mac-only — no way around it). Options: used Mac mini (~$400–600), or a cloud/CI Mac (GitHub Actions macOS runners are free for this public repo; MacinCloud/MacStadium/Codemagic otherwise). Distribution: Apple Developer account for TestFlight/year-long signing (free Apple ID = 7-day re-sign).

## Build-host fork (decide before any native code)

The current APK is a deliberately **dependency-free raw `aapt2`/`d8` build with NO AndroidX** (why the OTA path hand-rolled a framework-only `FileProvider`). **Media3 is AndroidX with a large transitive graph — it will NOT drop into the raw pipeline.** So:

- **Option A — Gradle-ify the APK:** convert `android/build.ps1` to a Gradle project, pull `androidx.media3:media3-session` etc. Keeps the raw-shell philosophy closest; more build-system work; iOS still separate later.
- **Option B — Capacitor:** wraps the web app, brings Gradle+AndroidX for Android AND the WKWebView shell + `WKScriptMessageHandler` bridge for iOS. One framework, both platforms, less hand-rolled shell. Adds a dependency; migrates the existing hand-rolled OTA/WebFiles logic into Capacitor's model. Probably the pragmatic solo-dev choice since it also solves the iOS shell.

This same fork governs iOS. **Recommendation: evaluate Capacitor first** (it collapses "Gradle for Android" + "WKWebView shell for iOS" into one), but only after the `PlaybackController` seam exists so the bridge has a clean JS target.

## Sequence

0. **Extract `PlaybackController` (JS)** — defines the command/event surface the bridge targets. (In progress; the reliability payoff — unit-testable retry/intent/wedge races — is worth it independent of native.)
1. **Decide the build host** (Gradle vs Capacitor).
2. **Android: Media3 `MediaSessionService` + `SimpleBasePlayer` adapter** over the WebView audio; wait-for-real-events; foreground service. Ship with the alive-WebView limitation. Test bg pause/resume + Activity lifecycle.
3. **iOS (Mac-gated): AVPlayer relocation** reusing the bridge contract; resolve downloads storage.
4. ExoPlayer / full-native only if the adapter approach proves unreliable per the triggers above.

Related memory: `[[tomeroam-lockscreen-resume-kill-bug]]` (the diagnosis + research verdict), `[[tomeroam-code-review-refactor]]` (the PlaybackController extraction), `[[plexbooks-companion-pwa]]` (the WebView shell + the earlier hybrid discussion).
