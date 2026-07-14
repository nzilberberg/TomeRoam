# 0006 — No platform detection — structural fixes only

**Status:** Accepted

## Context

The app runs as an iOS standalone PWA and inside an Android WebView, each with
sharp platform quirks. The tempting fix for a platform-specific bug is a UA sniff
plus a branch — which multiplies code paths, rots as OS behavior changes, and
hides the real cause.

## Decision

Fixes are **structural**, not platform-branched. Address the underlying layout /
lifecycle / API behavior so one code path is correct everywhere.

## Consequences

Worked examples (the "why" behind otherwise-odd code):

- **Android 15 edge-to-edge** drew the WebView behind the system bars. The fix is
  *not* padding the WebView (it anchors `position:fixed` to its full box and
  ignores its own padding — that made it worse). Instead the WebView is hosted in
  a `FrameLayout` whose **container** is padded by the system-bar insets, so the
  layout viewport genuinely ends above the nav bar.
- **iOS 26 fixed-layer displacement:** a `fixed; bottom:0` bar seats at the true
  physical bottom only while the document has genuine scroll overflow. The cure
  is a real scroll runway plus a rule that full-screen overlays are **additive**
  (paint over the page; never hide the underlying view or shrink the document) —
  not a device check.
- Trade-dress and behavior stay responsive; there are no `isIOS` / `isAndroid`
  branches to keep in sync with OS releases.
