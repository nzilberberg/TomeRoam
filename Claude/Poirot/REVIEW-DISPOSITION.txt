TOMEROAM — CODE REVIEW DISPOSITION (corrected)
==============================================
Scope: the 26-finding external review, dispositioned against the actual code.
Builds .73–.80 this session (plus earlier review work). Gate: 192 unit tests,
lint, typecheck — green in CI. Deploy model, no-framework/no-bundler rule, and
atomic-staging behavior all preserved.

STATUS KEY:  DONE | PARTIAL | ADAPTED (deliberate deviation) | NOT DONE

This corrects an earlier summary that (a) omitted #3, (b) implied near-completion
while ~a third of the review was untouched, and (c) overstated #1 and #6.


PART A — PER-FINDING STATUS (all 26)
------------------------------------

CORRECTNESS
  #1  Android mixed-build updater ....... ADAPTED (partial mitigation)
        Shipped: WebUpdater checks fetched index.html build meta == build.json
        before staging; atomic staging kept.
        NOT done: per-file sha256, build-immutable URLs, signed manifest, and the
        mixed/corrupt/interrupted/stale test harness. Individual JS/CSS can still
        come from different builds during CDN propagation — the core failure mode
        is only partially mitigated, not the immutable design the finding asked for.
        Why down-scoped: solo dev, own build host, "just push" workflow. But this
        is a mitigation, not the requested format.

  #2  Download byte-cap 32-bit corruption  DONE + tests
        parseByteLimit (Math.trunc + isSafeInteger, self-heals corrupt stored
        values); round-trip tests around 2/4/8/16 GB. Banking limit setter: Model B
        retired pb_bankBudget; parsing centralized in settings.js (#13).

  #3  Reset undone by stale peer progress  DONE + on-device verified + tests
        Durable per-book tombstone (rst timestamp) + read-time suppression floor +
        clear-on-contact GC + grab-style live claim. Verified cross-device from
        logs. Tests in progress.test.js. (This was missing from the prior report.)
        Deferred sub-item: tombstone compaction/expiry (bounded by 16-book LRU now).

  #4  Live Debug arbitrary JS execution ... ADAPTED (partial) + documented
        Kept the logpipe eval/new-Function path (default-off toggle, own-Plex
        trust boundary, single user). Documented the boundary in SECURITY.md with a
        TODO to gate it before ANY distribution.
        NOT done (the rest of #4): allowlist-only production build, minimize the
        Android JS bridge, document every native bridge method, lock down privileged
        navigation, formal dev/prod separation. So #4 is only partly addressed.

  #5  Resume-source tie authority ........ RESOLVED as deliberate + tests
        Kept first-wins tie; documented in logic.js that candidates are ordered
        least-authoritative-first and the only tie that matters (live playback) is
        overridden in bestSource. Equal-timestamp tie tests exist (handoff.test.js,
        logic.test.js). Deviation: kept array-order rather than an explicit
        priority field/table (documented).

ARCHITECTURE / SINGLE-RESPONSIBILITY
  #6  app.js is too large a kernel ....... PARTIAL
        Extracted: buffer/banking subsystem (banking.js) + 5 screen objects
        (sign-in, Home, Now-Playing, Options, Downloads) + HandoffController.
        app.js 2734 -> 2280 lines.
        NOT done: a PlaybackController owning the Audio element (Audio + immediate
        playback state still live in app.js), and a ResumeController/ResumePolicy
        object (bestSource still in app.js; only the pure pickResume is in logic.js).
        Deliberate boundary: the shared tile/progress-line ENGINE stays in app.js
        (welded to live playback, ~4x/sec, shared across screens; pure kernels
        already extracted+tested). Documented as an architectural decision.

  #7  Dependencies hidden via globals ..... NOT DONE (deliberate defer)
        Kept the IIFE + window.X + script-order pattern; new modules use the same
        pattern, not native ESM. Reason: WebView needs correct JS MIME for
        type=module; ESM migration is a later phase. This also blocks #17 (no-undef).

  #8  Unclear progress/state ownership .... LARGELY NOT DONE
        No dedicated ownership-model doc or invariant-enforcement pass. Legacy
        myProgress map still in app.js (8 refs), not migrated. progress.js /
        syncqueue.js / pickResume are de-facto owners but the invariants (ms-only,
        single mutator, single comparator) weren't formalized or enforced.

  #9  plex.js too many responsibilities ... NOT DONE
        Still ~810 lines: auth + discovery + probing + transport + retry + caching +
        metadata mapping + progress reset + playlist/board ops in one module.

READABILITY / MAINTAINABILITY
  #10 Comments as incident reports ....... DONE (ADRs) / PARTIAL (trimming)
        docs/adr 0001-0009 added. But the long saga narratives largely REMAIN in
        hot code (not all trimmed to invariant + link).

  #11 Over-compressed names .............. NOT DONE
        ctx / rk / mine / etc. unchanged.

  #12 Encode units in names .............. PARTIAL
        logic.js now uses nowMs/serverNowMs + a units-convention note. A full
        seconds/ms suffixing sweep across the codebase was not done.

  #13 Settings scattered ................. DONE / PARTIAL
        settings.js owns each key + default + encoding; app.js keeps delegator
        names. NOT done: schema version + migration mechanism.

ERROR HANDLING / DIAGNOSTICS
  #14 Best-effort vs swallowed failure ... NOT DONE
        No error taxonomy (typed errors / result objects). Empty catches and
        failure-collapsing-to-null remain.

  #15 Structured logging ................. NOT DONE
        Still tagged-string logging (PBDebug.log('TAG', msg)); not event+fields.

TESTING / STATIC ANALYSIS
  #16 Browser integration tests .......... NOT DONE
        The 10 critical-journey Playwright/browser tests were not added. The unit
        suite is strong (192 tests, incl. IDB/SW-logic/contract tests) but the
        integrated-journey layer the finding asked for is absent.

  #17 Strengthen ESLint gradually ........ NOT DONE
        Beyond the pre-existing narrow high-signal rules (e.g. no-const-assign),
        the listed rules (no-undef, eqeqeq, no-shadow, no-use-before-define, ...)
        were not enabled. no-undef in particular depends on #7 (ESM) first.

  #18 JSDoc types + checkJs .............. DONE (partial)
        tsc checkJs over // @ts-check opt-in files (logic/swkit/speed/handoff/warmer
        + guards). App ships zero TS; in CI. NOT done: the full record typedefs
        (ProgressRecord/PresenceRecord/etc.) across the board; screens/app.js not
        opted in.

  #19 _test internals as prod API ........ PARTIAL
        Pure kernels extracted (PBLogic, swkit, settings, etc.) and imported by both
        prod + tests. BUT _test hooks are still shipped on 9 production modules
        (browse, downloads, handoff, net, plex, presence, progress, syncqueue,
        warmer). The dedicated pure-policy modules (resume-policy.js etc.) were not
        carved out.

UI / CSS / ACCESSIBILITY
  #20 Imperative DOM ownership ........... DONE
        Major screens are objects owning root DOM + cached refs + listeners +
        render; Now-Playing self-binds its own controls. Reduced cross-subsystem
        getElementById for the extracted screens.

  #21 Organize CSS (tokens/sections) ..... NOT DONE
        The stylesheet was not reorganized into tokens/layout/screens/etc.

  #22 Accessibility pass ................. PARTIAL
        Done: aria-labels on SVG-only transport buttons + sliders, role=status /
        aria-live on toasts + status lines, aria-current on nav, dynamic Play/Pause
        label.
        NOT done: keyboard operability for the clickable-<div> tiles/rows, overlay
        focus-trap / Escape / focus-return, contrast + touch-target audit,
        prefers-reduced-motion review, automated a11y checks. (Deferred: needs a
        device + screen reader, and touches the swipe/fixed-layer system.)

REPO / RELEASE / DOCS
  #23 Expand README ...................... DONE
        Fleshed README; corrected the stale "cold resume needs the LMS plugin"
        framing (app is standalone). Some sub-topics (troubleshooting depth, board
        cleanup how-to) are lighter than the finding's full list.

  #24 Add CI ............................. DONE
        GitHub Actions on push/PR: stamp-check + lint + typecheck + test.

  #25 Generate build identity ........... DONE
        build.json -> tools/stamp-build.mjs -> sw.js / debug.js / index.html (+ ?v=
        asset stamps). CI fails on stale stamps.

  #26 Security/data-flow docs + CSP ...... PARTIAL
        SECURITY.md added (token on-device, Plex-only, honest logpipe trust
        boundary). NOT done: the full data-flow doc (every localStorage/IDB/Cache/
        Android-file item, sign-out residue, complete bridge inventory, threat
        boundaries) and NO Content-Security-Policy — correctly deferred, since the
        CSP would block the eval that #4 kept.


PART B — SCORECARD
------------------
DONE (or substantially):  #2, #3, #10*, #12*, #13*, #18*, #20, #23, #24, #25   (* = partial)
ADAPTED (deliberate):     #1 (down-scoped), #4 (partial), #5, #6 (partial)
NOT DONE:                 #7, #8, #9, #11, #14, #15, #16, #17, #19*, #21, #26-CSP
Roughly: ~11 addressed, 4 adapted, ~10 not done. The untouched band is mostly the
architecture / error-handling / integration-testing / static-analysis findings
(#8, #9, #11, #14, #15, #16, #17, #19, #21).


PART C — DIRECTIVES / DELIVERABLES AUDIT
----------------------------------------
FOLLOWED:
  - Inspect current code before changing; run existing tests/lint baseline.
  - Preserve behavior; incremental, not rewrite; avoid cosmetic churn.
  - Regression test for every correctness fix (#2, #3 tested; #5 has tie tests).
  - Keep platform-constraint comments (improved placement for the extracted ones).
  - No React/Vue/framework; no mandatory bundler; deploy model preserved.
  - Document disagreements as in-code comments (#1, #4, #5) so they aren't "fixed".
  - Explain the invariant each change establishes (in commit messages / ADRs).

NOT FOLLOWED / GAPS:
  - "Expected deliverables" final-summary FORMAT not produced originally: an
    explicit Files-changed list, Behavior-changed, Behavior-deliberately-preserved,
    Tests-added, Tests-run, Remaining-risks, Deferred. (Part D below is the
    corrected attempt at it.)
  - No per-item "confirmed still exists in current code" status was presented.
  - Preferred order of work: followed the early band (byte-cap, resume-tie,
    tombstone, CI, build-gen, settings, extractions, a11y-partial, docs) but
    skipped the later band (#7, #8, #9, #11, #14, #15, #16, #17, #19, #21).


PART D — DELIVERABLES SUMMARY (the format the review asked for)
--------------------------------------------------------------
FILES ADDED (modules, this arc):
  js/handoff.js, js/downloads-screen.js, js/options-screen.js, js/signin-screen.js,
  js/home-screen.js, js/nowplaying-screen.js, js/banking.js, js/settings.js
  (+ earlier: swkit.js, warmer.js, store.js, net.js, syncqueue.js, downloads.js);
  tools/stamp-build.mjs; .github/workflows/ci.yml; docs/adr/0001-0009;
  SECURITY.md; types/globals.d.ts; jsconfig.json; tests (see below).

BEHAVIOR CHANGED (deliberately):
  - Download byte-cap parses correctly above 1 GB (#2).
  - Reset Progress now sticks cross-device via tombstones (#3).
  - SW no longer auto-applies updates (waiting-worker; user taps "App update") —
    fixes the surprise reload; beyond the review, from a device log.
  - Remove-download converts to the evictable buffer window instead of delete +
    re-fetch — beyond the review, from device logs (.77–.79).
  - Model B buffering: two toggles + one shared budget (pre-review-report, verified).

BEHAVIOR DELIBERATELY PRESERVED:
  - Resume tie-break (#5), the eval debug channel (#4), sequential Plex connect,
    cache-first/warm/revalidate semantics, atomic SW staging, the deploy model.

TESTS ADDED: byte-cap round-trip, tombstone (own/peer suppression + replay +
  applyPeerResets), handoff/tie, settings, withcache, repaint, swkit, and the
  download-remove convert/free tests. Suite now 192.

TESTS RUN: node --test (192 pass), eslint (clean), tsc checkJs (clean) — each push.

REMAINING RISKS:
  - #1 mixed-build during CDN propagation still possible (per-file coherence not
    verified).
  - Playback-critical extractions (#6 banking, Now-Playing) have NO unit coverage
    on their audio-coupled paths -> on-device verification owed.
  - Legacy myProgress still in app.js (#8) — dual state ownership persists.
  - eval channel remains (#4) — acceptable only while single-user.

DEFERRED (with reason):
  #7 ESM (WebView MIME; later phase) · #8 ownership model + myProgress migration ·
  #9 plex.js split · #11 naming · #14 error taxonomy · #15 structured logging ·
  #16 Playwright journeys · #17 ESLint strengthening (needs #7) · #19 _test hook
  removal · #21 CSS organization · #22 keyboard/focus a11y remainder · #26 CSP
  (needs #4 removed first) + full data-flow doc.
