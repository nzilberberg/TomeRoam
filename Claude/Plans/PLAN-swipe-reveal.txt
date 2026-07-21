PLAN — SWIPE / REVEAL REWRITE
TomeRoam · draft 7 (PLAN OF RECORD) · 2026-07-20
APPROVED by review. Stages 1 and 2 authorised.
Next review: the frozen-model tests and their mutation results, BEFORE the
session owner or any production extraction lands.
=====================================================================

CHANGE LOG FROM DRAFT 6

  [REQ]  Mover ownership TYPED (§3.2). movers[] holds three resource classes
         whose teardown differs — borrowed-real (restore styles, never
         remove), owned-decoration (remove the NP pill clone), owned-pane
         (paint-gated release or approved disposal). Today the distinction
         is indirect: styles are cleared from every mover, only nodes
         flagged remove:true are removed. That works by CONVENTION, which
         is what this rewrite exists to replace — and "dispose its panes
         and movers" was broad enough to authorise removing the real #home.
  [DOC]  §3.7 signature corrected to recoverSession({reason, phase}), the
         generalised form already defined later in the same section.

CHANGE LOG FROM DRAFT 5

  [HIGH] I11 was UNSATISFIABLE on an abort. It demanded that stack top,
         visible screen and 'destination descriptor' agree — but on an
         abort the stack and screen are the SOURCE and the destination is
         the thing not navigated to. Now keyed to an AUTHORITATIVE SETTLED
         DESCRIPTOR chosen by outcome. As written, an implementation could
         satisfy real behaviour and fail the invariant, or mutate the stack
         merely to satisfy the wording.
  [MED]  Pre-drag cancellation had NO valid route. Draft 5 sent touchcancel
         through settleSession() unconditionally, but a touch can be
         cancelled while still ARMED, where there are no movers and no
         travel decision. Gesture-ending inputs now route by STATE (§3.7,
         I19). VERIFIED as parity: end() releases listeners then returns at
         "if (!cur.live)" — no settle, no navigation.
  [MED]  A new touchstart during ARMED/DRAGGING was undefined while
         'superseded' was already listed as a recovery reason. Policy
         frozen (§3.7, I20). VERIFIED that parity is SUPERSEDE, not reject:
         begin() rejects only while "finishing" is true; otherwise it
         hard-resets and arms the new gesture (app.js:452-465).
         ⚠️ One deliberate difference is flagged in-place: today's hard
         reset does NOT restore the starting scroll, so a superseded
         browse→browse drag can be left at the DESTINATION's scroll. The
         corrected rule restores it — new policy, not parity.
  [DOC]  Stale §8 audit prose replaced with a sign-off state. It still said
         'ROUND 4' and referenced table rows that no longer existed —
         exactly the kind of drift this document exists to prevent.

CHANGE LOG FROM DRAFT 4

  [HIGH] touchcancel routing DISAMBIGUATED (§3.1). Draft 4 listed it as a
         cleanup reason in §3.1 while §3.7 routed it through the settle
         decision — two incompatible implementation instructions. It is a
         NORMAL gesture-ending input: settleSession() with the ordinary
         travel-and-velocity decision, so it can COMMIT. That is parity
         (touchend and touchcancel share onEnd, app.js:271).
  [HIGH] RECOVERY GENERALISED (§3.7). Draft 4 made the pre/post-stack
         distinction for finalize-threw ONLY, leaving lease-invalid and
         destination-gone able to render the source under a stack whose top
         is the destination — precisely the I11 violation the boundary
         exists to prevent. Now ONE rule keyed on phase, covering
         lease-invalid, destination-gone, finalize-threw and supersession.
         Per-reason screen/scroll rules are gone.
  [MED]  §3.4 concurrency wording now states the same rule as I17: reject
         while an active session is SETTLING/FINALIZING/REVEALING, never
         dispose that session's pane; dispose only an ORPHAN pane.
  [DOC]  Stage 8 completion criterion sharpened — preexisting regression
         tests unchanged and passing; every new invariant test active,
         mutation-verified and green.

CHANGE LOG FROM DRAFT 3

  [HIGH] ABNORMAL-EXIT POLICY added (§3.7). Draft 3 named the exit reasons
         but defined outcomes for none of them, leaving the rewrite free to
         invent behaviour in the exact path that has caused most of the
         trouble. Now a table, plus three distinct verbs:
         settleSession / finishSession / recoverSession.
         VERIFIED while writing it: `touchcancel` binds to the SAME onEnd
         as touchend (app.js:271), so today it can settle as a COMMIT, not
         an abort. Draft 3 implied it was an abort-style cleanup reason.
  [MED]  I16 expanded from screen-name pairs to DESCRIPTOR SCENARIOS
         (§4.3). VERIFIED: navTo (app.js:141) REPLACES the stack top when
         `v` matches — unless the descriptor carries `author` or `book`,
         which PUSHES. So authorBooks(A)→authorBooks(B) and files(A)→
         files(B) have different stack effects from books→books, and 132
         name pairs cannot express that.
  [MED]  I17 split into active-session rejection vs orphan-pane disposal;
         draft 3's prose conflated them and misstated current behaviour.
  [LOW]  The 1px Home scroll is FROZEN for parity, not removed (§2.6.4,
         T12, stage 1). This is a behaviour-preserving extraction; removing
         it is an unrelated visible change in a path with a long history of
         platform surprises. Separate commit after device parity.
  [DOC]  §2.6.3 overlay→overlay reachability is ESTABLISHED, not deferred:
         openSub() pushes a sub-screen over Options, so a left-edge swipe
         yields general→options directly.
  [DOC]  §2.4's overlay→browse side effect is now encoded in the plan as
         `hiddenHostState`, and deliberately NOT fixed here.

CHANGE LOG FROM DRAFT 2

  [HIGH] The "14 of 30" matrix was still not the reachable space. Replaced
         by a STRUCTURAL matrix (8 base combinations) plus explicit
         modifiers, with the concrete screen set GENERATED from the real
         registry (§2.4). Verified: the registry is 12 screens — home, 4
         browse-family (books, authors, authorBooks, files), 7 overlays
         (options, nowplaying + Nav.SETTINGS_SUBS = general, playback,
         buffering, downloads, diagnostics) = 132 ordered pairs. Draft 2
         enumerated 30 and called it exhaustive; I16 was untrue as written.
  [MED]  planFor() no longer accepts derived facts alongside raw ones;
         one normalization boundary, classifyTransition() (§3.3).
  [MED]  `clobbered` removed from the target vocabulary entirely (§3.3).
  [MED]  pane.release() vs pane.dispose(reason) split, with a stated
         concurrency policy (§3.4).
  [FACT] The Home `scrollTo(0,1)` description is CORRECTED (§2.6.4). The
         reviewer is right and the code says so in nav.js:121-126: seating
         is `body.home-tall`; the 1px is "a harmless remnant of the
         abandoned scroll runway theory". Draft 2 called it an iOS-26
         runway requirement. I repeated a myth that the code itself
         corrects, in a comment I had already read.
  [PROC] Stage 2 reclassified: tests are triaged green / known-red /
         unobservable rather than required to pass (§7).
  [PROC] The four unresolved behavioural rules are RESOLVED from code
         (§2.6), so stage 1 can freeze.

=====================================================================
1. PURPOSE

Not about fixing the swipe flash. About why the flash took ~20 hours and
~35 builds and is still open: the swipe/reveal path's behaviour cannot be
determined by reading it.

Success criterion: a session with no memory of this work reads ONE
document and ONE module header and correctly predicts what a swipe does —
which nodes are created, covered, destroyed, and what state everything is
in when the gesture ends.

If the rewrite lands and the flash remains, it still succeeded.

=====================================================================
2. THE MODEL AS IT EXISTS TODAY

2.1  TWO KINDS OF VIEW
     IN-FLOW    #home, #browse — inside .app, SHARE the document scroll.
                Two in-flow views cannot be on screen at once.
     OVERLAY    fixed, outside .app's flow, own scroll box.
     isOverlay(v) === options | nowplaying | Nav.SETTINGS_SUBS.
     HOME IS NOT AN OVERLAY. Draft 1's error came from forgetting this.

2.2  GESTURE LIFECYCLE (js/app.js bindSwipeBack)
     begin()  arm within EDGE of an edge if a destination exists; hard-
              reset leftover state; bind move/end to the TOUCHSTART TARGET.
     move()   8px direction lock; vertical abandons; first horizontal move
              calls start().
     start()  builds movers, renders the destination.
     end()    commit vs abort from travel + velocity.
     settle() animates; runFinalize() on transitionend OR a 340ms fallback
              (both can fire — I13).

2.3  THE BRANCH CONDITIONS (verbatim, js/app.js:536-560)
       incomingBrowse = !toOv && toV !== 'home'
       OUTGOING:  fromOv         -> real overlay element
                  incomingBrowse -> ghostApp()          [PANE]
                  else           -> real in-flow view
       INCOMING:  toOv           -> real overlay element
                  toV === 'home' -> snapshotHome()      [PANE]
                  else           -> real #browse, destination rendered
                                    INTO it mid-drag

2.4  STRUCTURAL MATRIX — the base plan

     Kinds: home | browse | overlay. Eight reachable combinations
     (home→home is not a transition):

       from     to        outgoing        incoming        pane?
       -------  --------  --------------  --------------  -----
       home     browse    GHOST           real #browse    yes
       home     overlay   real #home      real overlay    no
       browse   home      real #browse    SNAPSHOT        yes
       browse   browse    GHOST           real #browse    yes
       browse   overlay   real #browse    real overlay    no
       overlay  home      real overlay    SNAPSHOT        yes
       overlay  browse    real overlay    real #browse    no
       overlay  overlay   real overlay    real overlay    no

     RULES, stated once:
       GHOST     iff source is NOT an overlay AND destination kind is
                 browse.
       SNAPSHOT  iff destination kind is home, whatever the source.
       A pane exists in 4 of the 8 base combinations.

     ⚠️ NOTE on overlay→browse: no pane is built, but the destination IS
     rendered into the real #browse mid-drag. An abort returns to the
     overlay leaving #browse holding the destination's content.
     DECIDED: preserve today's behaviour. Restoring the hidden host would
     add a render during abort purely to clean state that is not visible
     and is reconciled on the next real Browse entry — more work and
     another chance to disturb images/controllers, fixing nothing the user
     can see. Encoded explicitly rather than left implicit:
       abort: { screen:'source', render:'none',
                hiddenHostState:'destination-may-remain' }
     Canonicalizing the hidden host is a SEPARATE cleanup after parity.

2.5  CONCRETE SCREENS — GENERATED, NEVER HAND-LISTED
     The registry is derived from the real sources of truth:
       home                                          -> kind home
       books, authors, authorBooks, files            -> kind browse
       options, nowplaying, ...Nav.SETTINGS_SUBS     -> kind overlay
     = 12 screens, 132 ordered pairs.

     Prose must never enumerate the pairs (draft 2 did, and was wrong).
     Instead, a test iterates the registry and asserts every ordered pair
     either yields a plan or is rejected with a NAMED reason. Adding a
     sixth settings sub-screen must not require editing this document.

2.6  THE FOUR PREVIOUSLY-UNRESOLVED RULES — resolved from code

     2.6.1 NOW PLAYING PILL
       Cloned when NP is EITHER endpoint (app.js:544 fromV, :558 toV):
         from NP -> pill mover at base 0, and body loses `np-locked`
         to   NP -> pill mover at base off
       It is a third mover alongside outgoing/incoming, with the same
       creation/removal lifetime. In the target it is a `decorations`
       entry in the plan, not a special case in start().

     2.6.2 NAVIGATION RELATION
       back           left edge, destination = navStack[len-2]
       new-forward    right edge FROM nowplaying only -> filesDescForCurrent(),
                      `newNav`; on commit PUSHES the destination and CLEARS
                      fwdStack (app.js:479, :778)
       forward-replay right edge otherwise, destination = fwdStack top;
                      on commit pops fwdStack onto navStack
       A back commit pushes the popped entry onto fwdStack.

     2.6.3 OVERLAY→OVERLAY REACHABILITY  [ESTABLISHED]
       Reachable, and no stack-state search is needed to prove it:
       openSub() pushes a settings sub-screen ON TOP of Options, so a
       left-edge swipe takes the previous navStack entry as its
       destination and produces e.g. general→options or downloads→options
       directly. Now Playing can also be stacked over an overlay.
       Button navigation between overlays uses Nav.overlayFilmstrip(), a
       DIFFERENT path this plan does not touch and must not assume shares
       code.
       Stage 1 adds representative NAVIGATION-ACTION tests, not an
       enumeration of unbounded stack histories:
         Options → sub-screen → swipe back
         sub-screen → Now Playing → swipe back
         forward replay between adjacent overlays
         invalid same-screen / no-destination cases
       The structural planner supports overlay→overlay regardless of which
       navigation action produced the stack.

     2.6.4 SCROLL POLICY  [CORRECTED]
       Home entry uses `window.scrollTo(0, 1)` when resetScroll is set.
       This is NOT an iOS-26 runway requirement. nav.js:121-126 states the
       navbar seating is `body.home-tall` (real scroll height), and the
       1px is "a harmless remnant of the abandoned scroll runway theory".
       The saga's dead-end list agrees: the 1px/2px runway was tried three
       times and failed; `body.home-tall` is the actual seater.
       ⇒ FROZEN FOR PARITY. The plan carries the existing behaviour
       forward as `scroll.onCommit: 'destination-entry'` with NO runway
       justification. Stage 1 does NOT decide whether the 1px survives.
       This is a behaviour-preserving extraction; removing the 1px is an
       unrelated visible change in a path with a long history of
       platform-specific surprises. Remove it AFTER device parity, in a
       separate commit, with a focused Home-entry device test.
       Overlays keep their own scrollTop; the document scroll is not
       touched when the destination is an overlay.

       The PLAN states policy; Browse resolves coordinates:
         scroll: { onCommit: 'destination-entry',
                   onAbort:  'restore-session-start',
                   overlay:  'preserve-document',
                   reveal:   'destination-final' }
       Browse decides what 'destination-entry' means for a cached Books
       page, an Authors page, or the current Files row. Swipe applies the
       final document-scroll transaction in order. No raw Y values and no
       Browse cache details enter planFor().

=====================================================================
3. TARGET DESIGN

3.1  STATE MACHINE

       IDLE -> ARMED -> DRAGGING -> SETTLING -> FINALIZING
            -> REVEALING [only when a covering pane exists] -> IDLE

     Vertical intent and hard reset are ABNORMAL TERMINATION reasons:
     finishSession(reason).

     ⚠️ touchcancel is NOT one of them. It is a NORMAL gesture-ending
     input: it records endReason:'touch-cancel' and routes through
     settleSession() using the ordinary travel-and-velocity decision, so
     it can COMMIT. That is parity — touchend and touchcancel are bound to
     the same onEnd (app.js:271). Draft 4 listed it as a cleanup reason
     here while §3.7 routed it through the settle decision; the two
     instructions were incompatible and this is the correct one.
     finishSession() remains the common idempotent cleanup ENDPOINT, and
     settleSession() calls it — but finishSession must never independently
     decide what touchcancel means.
     FINALIZING performs, as ONE transaction: commit/preserve the nav
     stack; apply or restore the real screen; restore document scroll;
     return the Browse lease and await its readiness; clear inline styles;
     decide whether a delayed reveal is needed. The four no-pane base
     combinations go FINALIZING -> IDLE directly.

3.2  ONE SESSION OWNS EVERY RESOURCE
       { id, state, plan, listeners, leaseToken, panes[], movers[],
         transitionListener, settleTimer, revealTimer, revealFrames,
         startScroll, endReason }

     ⭐ MOVERS ARE NOT ONE KIND OF THING — TYPE THE OWNERSHIP.
     `movers[]` holds three resource classes whose teardown differs, and
     conflating them is how a real view gets removed. Each mover carries
     its ownership explicitly:

       { element, base, ownership, cleanup }

       'borrowed-real'      #home / #browse / an overlay element. Clear
                            transform, transition, will-change and any
                            other transient styling. NEVER remove the node.
       'owned-decoration'   the Now Playing pill clone. Remove it.
       'owned-pane'         a ghost or snapshot. Release through the
                            paint-gated path (I10), or dispose for an
                            approved emergency reason (§3.4).

     Today's code makes this distinction INDIRECTLY — it clears styles from
     every mover but removes only those flagged `remove: true`. That works
     by convention, and convention is what this rewrite exists to replace.
     Wherever this document says a session "disposes its panes and movers",
     read it as: panes are released or disposed per their policy,
     decorations are removed, and borrowed real views are RESTORED and
     never removed.
     Acquired only through the session; every exit passes through one
     idempotent finishSession(reason); every async callback captures
     session.id and no-ops when superseded.

3.3  classifyTransition() IS THE ONLY NORMALIZATION BOUNDARY

       classifyTransition({ from, to, direction, navigationRelation })
         -> { fromKind, toKind, sourceHost, destinationHost,
              sameBrowseHost, decorations }

       planFor(classification) -> immutable plan:
         { outgoing, incoming, renderTarget,
           commit: { screen, stackEffect, scroll },
           abort:  { screen, render, scroll },
           decorations, paneRemovalPolicy }

     planFor() NEVER accepts raw descriptors alongside derived kinds.
     Supplying both is what allows `{from:'home', sourceHost:'browse'}` to
     exist, and removing states that can disagree is the entire point.
     There is no default branch; an unhandled classification THROWS.

     `clobbered` DOES NOT EXIST in the target vocabulary. Its only
     consequence is expressed directly:
       browse→browse   abort: { screen:'source', render:'rerender',
                                scroll:'restore-start' }
       overlay→browse  abort: { screen:'source', render:'none',
                                scroll:'restore-start',
                                hiddenHostState:'destination-may-remain' }
       everything else abort: { screen:'source', render:'none',
                                scroll:'restore-start' }
     Nothing downstream asks whether the host was "clobbered".

     DECORATIONS keep their mover nature explicit — the pill has a base
     position, receives transforms, and needs session-owned cleanup:
       decorations: [{ kind:'now-playing-pill', role:'mover',
                       base:'outgoing' | 'incoming' }]
     `decorations` is a plan-level CATEGORY, not a plugin system and not a
     separate non-mover cleanup path. A list of one is preferable to
     another hard-coded `if (nowplaying)` inside start().

3.4  PANE RELEASE vs DISPOSAL
     Two operations, because a normal visual release and an emergency
     teardown have different obligations:

       pane.release()        called ONLY by reveal(), only after under-view
                             readiness AND the paint barrier. Obeys I10.
       pane.dispose(reason)  idempotent emergency teardown. Bypasses I10
                             deliberately. Permitted reasons ONLY:
                               'superseded'      a newer session owns the UI
                               'lease-invalid'   Browse invalidated the lease
                               'finalize-threw'  finalization failed
                               'hard-reset'      leftover pane found at begin()
                               'destination-gone'

     CONCURRENCY POLICY (states the same rule as I17 — draft 4's wording
     here could be read as disposing the ACTIVE session's pane, which is
     the opposite of what is intended):

       begin() REJECTS whenever an active session is SETTLING, FINALIZING
       or REVEALING. It NEVER disposes a resource owned by that session —
       the active reveal is left to satisfy I10.

       If NO active session exists and an ORPHAN pane is found, begin()
       disposes that pane as 'hard-reset' before arming a new session.

     This is parity: production returns immediately while `finishing` is
     true (app.js:452), and leftover cleanup happens only once that guard
     no longer applies. Without the split, "only reveal may remove a pane"
     and "every exit must clean up panes" contradict each other, and the
     implementation ends up either bypassing I10 or stranding a pane.

3.5  BROWSE OWNS THE HOLD; SWIPE OWNS THE LEASE
       const lease  = Browse.beginGestureHold();
       const result = Browse.finishGestureHold(lease, {
                        visibleDescriptor, settledScrollY });
       // result: { status: 'ready' | 'invalidated', ready: Promise<void> }
       await result.ready;     // SEMANTIC completion
       await paintBarrier();   // VISUAL release requirement — Swipe's job

     Browse's reconciliation is synchronous today (unpark, activate,
     realize, deactivate, deferred repaints). An already-resolved `ready`
     is therefore HONEST — and does not satisfy I10, because reveal() must
     still await the paint barrier independently. Browse must NOT add a
     requestAnimationFrame merely to look asynchronous; that would
     reproduce .179's vacuous gate with better names.
     A destructive Browse operation invalidates the lease explicitly.
     Swipe never touches .browsepage classes or virtual controllers.

3.6  PANES — ONE INTERFACE, TWO RECIPES
       { kind:'app-ghost'|'home-snapshot', element, source, pin,
         equivalence, release(), dispose(reason) }
     Ownership, cleanup, runtime-state copying and instrumentation are
     unified; the capture algorithms are not pretended to be identical.

3.7  ABNORMAL EXITS — THREE VERBS, ONE POLICY TABLE

     Draft 3 named the exit reasons and defined outcomes for none of them.
     That leaves the rewrite free to invent behaviour in the path that has
     caused most of the trouble. Three distinct verbs:

       settleSession(decision)      NORMAL end: commit or abort, chosen by
                                    travel + velocity in end().
       finishSession(reason)        ABNORMAL termination.
       recoverSession({reason, phase})
                                    a failure detected mid-finalization or
                                    mid-reveal; phase-aware, because
                                    "before" and "after" the stack mutation
                                    are not the same situation.

     ⚠️ VERIFIED, and it corrects draft 3: `touchcancel` binds to the SAME
     onEnd as touchend (app.js:271). Today a cancelled touch does NOT
     abort — it runs the normal settle decision and CAN COMMIT. The table
     preserves that; changing it is a behaviour change and out of scope.

     GESTURE-ENDING INPUTS, BY STATE
     Draft 5 routed touchcancel through settleSession() unconditionally,
     but a touch can be cancelled while still ARMED — before the 8px
     direction lock — where there are no movers and no travel decision to
     make. Route by STATE, not by input:

       state              touchend / touchcancel
       -----------------  -------------------------------------------------
       ARMED              finish with NO navigation; release listeners;
                          remain on source. (PARITY: end() releases
                          listeners then returns at `if (!cur.live)`,
                          app.js — no settle, no navigation.)
       DRAGGING           ordinary travel-and-velocity decision through
                          settleSession(). touchcancel CAN commit; that is
                          parity (shared onEnd, app.js:271).
       SETTLING or later  ignore as a stale duplicate event.

     The cancellation reason is still recorded for diagnostics; it simply
     cannot always enter the settle path.
     REQUIRED TESTS: cancel before the direction lock; cancel after a
     horizontal move BELOW the 8px threshold (still ARMED); a duplicate
     end arriving during SETTLING.

     SUPERSESSION — A NEW TOUCH DURING ARMED OR DRAGGING
     I17 covers SETTLING/FINALIZING/REVEALING (reject). Draft 5 said
     nothing about a new gesture arriving while a session is ARMED or
     DRAGGING, yet listed 'superseded' as a recovery reason without stating
     what causes it.

     PARITY IS SUPERSEDE, NOT REJECT — verified: begin() rejects only while
     `finishing` is true; otherwise, if a session or a leftover pane
     exists, it hard-resets (releaseGesture, dropRowHold, d = null,
     resetSwipeStyles, applyScreen(currentDesc, {render:false})) and then
     arms the new gesture (app.js:452-465).

     RULE: a new gesture beginning while a session is ARMED or DRAGGING
     synchronously recovers the old session as superseded / pre-stack —
     restore the source, return its Browse lease, tear down its movers BY
     OWNERSHIP (§3.2 — panes disposed, decorations removed, borrowed real
     views restored and NEVER removed), release its listeners — and only
     then arms the new session.

     ⚠️ ONE DELIBERATE DIFFERENCE FROM PARITY, flagged rather than smuggled:
     today's hard reset does NOT restore the starting scroll, so a
     superseded browse→browse drag can leave the document at the
     DESTINATION's scroll (its mid-drag render ran positionOnEnter). The
     reviewer's rule restores it. That is a BEHAVIOUR CHANGE and arguably a
     bug fix; it is listed here as new policy, not as extraction parity,
     and it needs its own device check.

     REQUIRED TESTS: new touch while armed but not dragging; new touch
     during a partial drag WITH a pane; old move/end callbacks arriving
     after the new session begins; only the new session may mutate
     transforms, stacks, scroll or pane ownership.

     NORMAL AND TERMINATION REASONS
     Reason                     Nav result       Screen         Scroll        Pane
     -------------------------  ---------------  -------------  ------------  ------------
     vertical-intent (pre-drag) unchanged        source         unchanged     none built
     touch-cancel (dragging)    settle decision  from decision  commit/abort  normal settle
     hard-reset (leftover)      unchanged        currentDesc()  none today    dispose orphan

     These three PRESERVE today's behaviour (verified: vertical intent does
     releaseGesture + d=null and returns; touchcancel shares onEnd with
     touchend, app.js:271; hard reset does releaseGesture, dropRowHold,
     resetSwipeStyles, applyScreen(currentDesc,{render:false}) with no
     scroll restore — app.js:462-465).

     RECOVERY — ONE RULE, KEYED ON THE AUTHORITY BOUNDARY
     Draft 4 made pre/post-stack distinctions for finalize-threw ONLY. The
     same boundary applies to every failure detected while finalization or
     reveal is underway, and getting it wrong produces exactly the defect
     I11 exists to forbid: commit mutates the stack, the destination then
     disappears, "restore the source" renders the source UNDER a stack
     whose top is the destination.

       recoverSession({
         reason: 'lease-invalid' | 'destination-gone' | 'finalize-threw'
                 | 'superseded',
         phase:  'pre-stack' | 'post-stack'
       })

       phase        Navigation           Screen                  Scroll
       -----------  -------------------  ----------------------  --------------------
       pre-stack    unchanged            restore source          restore session start
       post-stack   stack authoritative  render current stack top  destination policy

     Pane disposal and resource cleanup then follow normally in both
     phases. There are NO per-reason screen/scroll rules — that is what
     produced draft 4's underspecified 'lease-invalid' row ("authoritative
     screen", without saying whether it is rendered, and "none" scroll,
     which is wrong after a committed destination transition).

     ALL RECOVERY ROWS ARE NEW POLICY, stated because today they are
     UNDEFINED — finalization has a try/finally for the row hold and
     nothing else. These are gaps the rewrite must CLOSE, not behaviour it
     must reproduce.

=====================================================================
4. INVARIANTS

  I1   When Browse is the active in-flow view, exactly one .browsepage is
       neither .hidden nor .parked; when Browse is not active, none is
       exposed. Separately: the visible page's controller is active, all
       others inactive; during a live hold only explicitly held pages may
       be suspended or parked.
  I2   Every pane created is released or disposed exactly once, on every
       exit path.
  I3   A Browse lease taken in start() is returned on every exit path.
  I4   Gesture listeners bound at touchstart are released on every exit.
  I5   At end, no real view carries an inline transform/transition/
       will-change.
  I6   No page is left `suspended` after a gesture ends.
  I7   After an ABORT, document scroll equals scroll at gesture start.
  I8   Each pane builder emits an EQUIVALENCE MANIFEST (see 4.2).
  I9   A gesture settles even if the DOM under the finger is destroyed
       mid-drag.
  I10  A covering pane may not be released in the same task or microtask
       that exposes/prepares the under-view. Release requires under-view
       readiness AND the paint barrier. (dispose() is exempt by design.)
  I11  After every exit, the navigation-stack top, the visible screen and
       the AUTHORITATIVE SETTLED DESCRIPTOR agree. The authoritative
       descriptor is selected by the completed OUTCOME:
         commit                -> the committed destination
         abort                 -> the original source
         pre-stack recovery    -> the original source
         post-stack recovery   -> the current stack top
         hard reset            -> currentDesc()
       Draft 5 said "destination descriptor", which is IMPOSSIBLE on an
       abort: the stack stays on the source, the screen returns to the
       source, and the destination is the thing that was NOT navigated to.
       An implementation could have satisfied real behaviour and failed the
       invariant — or mutated the stack merely to satisfy the wording.
  I12  Only one session owns resources; a stale callback cannot affect
       another session.
  I13  Finalization occurs exactly once despite transitionend AND the
       340ms timeout both firing.
  I14  Every acquired timer, listener, lease, pane and animation callback
       is released or invalidated.
  I15  Deferred Browse repaint work is applied exactly once after the hold
       ends.
  I16  Every DESCRIPTOR SCENARIO (§4.3) — not merely every screen-name
       pair — either yields a plan or is rejected with a named reason. No
       default branch.
  I17  Two distinct rules, conflated in draft 3:
       (a) While an active session is SETTLING, FINALIZING or REVEALING, a
           new gesture does NOT arm. It is REJECTED. The active reveal is
           left to satisfy I10 — its pane is NOT disposed to make room.
       (b) An ORPHAN pane found while NO session owns it is disposed as
           'hard-reset' before arming.
       This preserves today's behaviour: begin() returns while `finishing`
       is true (app.js:452); once the reveal drops the pane `finishing`
       clears, and a later gesture may remove an already-uncovered
       `.spent` pane and continue. Today does NOT hard-reset an actively
       held reveal pane, and neither may the rewrite.
  I18  Every exit reason in §3.7 produces its tabulated outcome for nav
       stacks, visible screen, scroll, lease and pane. Recovery is keyed on
       PHASE (pre-stack / post-stack), not on reason: after the stack has
       been mutated the stack is authoritative and the screen is rendered
       from its top, for lease-invalid, destination-gone, finalize-threw
       and supersession alike.
  I19  Gesture-ending inputs route by STATE (§3.7): ARMED finishes with no
       navigation; DRAGGING takes the travel-and-velocity decision;
       SETTLING or later ignores the event as a stale duplicate.
  I20  A new gesture during ARMED or DRAGGING supersedes: the old session
       is recovered pre-stack and fully released BEFORE the new one arms,
       and only the new session may thereafter mutate transforms, stacks,
       scroll or pane ownership.

4.1  WHY I2 + I8 WERE NOT SUFFICIENT
     The .179+.194 implementation removed the pane exactly once (I2 ok)
     over an under-view already decoded and structurally identical (I8 ok)
     and still removed it after one microtask, before any painted frame.
     Only I10 forbids it.
     I10 mutation plan:
       1. make every decode() promise immediately resolved
       2. remove one or both requestAnimationFrame gates
       3. assert the pane is STILL PRESENT until the frame boundary
       4. assert the timeout can still release it if frames never arrive
       5. assert a superseded reveal cannot release the next session's pane

4.2  I8 — EXHAUSTIVE OVER A DEFINED CANDIDATE SET, NEVER SAMPLED
     Sampling would recreate .207 (six pairs checked, thirty missed).
     Candidate classes the pane PROMISES to preserve:
       animated art elements · horizontal scroll containers ·
       fixed-position decorations · visible browse pages ·
       explicitly pruned hidden/parked subtrees ·
       any element whose inline or computed state is copied
     Assertions:
       every source candidate is exactly one of { paired, omitted-with-
         named-reason }
       no source appears twice; no clone target appears twice
       every surviving clone candidate has a source
       every pruned candidate appears in omitted[]
       paired + omitted === sourceCandidates
     Coupling this to the prune rule is DESIRABLE: if the prune rule
     changes, the equivalence contract changed and must be re-reviewed.

4.3  I16 — DESCRIPTOR SCENARIOS, NOT SCREEN NAMES
     Two registry entries are PARAMETERIZED: authorBooks carries an
     author, files carries a book (browse.js:22-23 keys them
     'author:<rk>' / 'files:<rk>').

     ⚠️ VERIFIED: navTo (app.js:141) REPLACES the stack top when `v`
     matches — UNLESS the descriptor carries `author` or `book`, in which
     case it PUSHES. So descriptor identity changes STACK EFFECTS, and 132
     name pairs cannot express it. The structural planner will classify
     all of the below as browse→browse; their stack effects, rerender
     requirement and scroll restoration differ.

     Generate scenarios, not names:
       home() · books() · authors()
       authorBooks('A') · authorBooks('B')
       files('A') · files('B')
       options() · nowplaying() · each of Nav.SETTINGS_SUBS

     Explicitly cover:
       different type                books()      -> authors()
       same type, different identity authorBooks('A') -> authorBooks('B')
                                     files('A')   -> files('B')
       same semantic descriptor      books()      -> books()
       identical descriptor object   d            -> d
       two independently allocated but semantically equal descriptors
       missing required payload      authorBooks() with no author
                                     files() with no book
     A malformed parameterized descriptor must be REJECTED with a named
     reason, never silently planned.

=====================================================================
5. TRAPS — ENUMERATED BEFORE CODE

  T1  cloneNode copies no runtime state: scrollLeft, animation phase,
      decoded images; CSS animations RESTART from t=0 in a clone.
  T2  ghostApp() PRUNES .hidden/.parked from the clone. Any pairing must
      filter the source identically and must NOT test the root itself
      (snapshotHome's source IS #home.parked).
  T3  position:fixed inside a transformed clone re-anchors to the clone.
      `.alphaindex` is fixed; in the ghost it lands scrollY px away.
  T4  display:none drops decoded images on iOS; re-showing re-decodes.
  T5  With transitions disabled, transitionend never fires; finalize then
      depends entirely on the 340ms fallback. Motion-disabling experiments
      change the code path under test.
  T6  Touch events target the touchstart node for the gesture's life; once
      detached they no longer reach `document`.
  T7  DEAD END — pointer events + setPointerCapture (touch-action
      intersects down the ancestor chain, kills the home carousels).
  T8  DEAD END — floating the INCOMING page in a fixed pane.
  T9  DEAD END — parking a transform to keep a layer alive (.195/.196).
  T10 The A-Z strip covers ~77% of the forward-swipe edge band; it must
      CEDE by direction, not be excluded from arming.
  T11 app.js reads DOM globals bare (Element, MutationObserver,
      navigator); a new one must be installed in the harness or its code
      path is dead under test, silently.
  T12 The 1px Home scroll is NOT an iOS-26 requirement (§2.6.4). Do not
      preserve it under that label; `body.home-tall` is the seater.

=====================================================================
6. WHAT THIS DOES NOT DO

  - It does not fix the flash. Everything observable from inside the page
    is eliminated by device measurement: no DOM writes, no position
    change, no appearance change, no animation (phase=n/a, animSync=0 with
    fades disabled — still flashed), no main-thread frame cost (worst=17ms
    on a user-confirmed flashing swipe). The remaining hypothesis is
    compositor-level and JS cannot see it. Next diagnostic step is a 60fps
    screen recording scrubbed frame by frame, NOT another instrument.
  - It does not change the visual design of the transition.
  - It does not touch nav stacks, Browse's cache, or the virtualizer.

=====================================================================
7. STAGED EXTRACTION

   1. Freeze the structural matrix (§2.4), the generated registry (§2.5),
      the descriptor scenarios (§4.3), the four rules (§2.6) and the
      abnormal-exit policy (§3.7). overlay→overlay reachability is already
      established (§2.6.3) — add the four navigation-action tests, do not
      enumerate stack histories. The 1px Home scroll is FROZEN, not
      revisited.
   2. Add the tests that can be TRUTHFULLY specified from the frozen
      model. Triage each:
         GREEN NOW    mutation-verify immediately
         KNOWN RED    keep as an explicit expected-failure with the exact
                      current defect recorded; never invert an assertion
                      to bless broken behaviour
         UNOBSERVABLE add the instrumentation needed first
      Stage 2 does NOT block on known-red invariants. Every one must be
      active and green before stage 8; parity cannot be declared while any
      remain.
   3. Introduce the session/resource owner; pane builders and render calls
      unchanged.
   4. Extract classifyTransition() + planFor(); prove every registry pair.
   5. Move pane builders unchanged into swipe.js.
   6. Centralize finalization and reveal ordering (I10, I17).
   7. Replace Browse hold calls with the lease interface.
   8. All PREEXISTING regression tests remain unchanged and pass; every
      new invariant test is ACTIVE, mutation-verified and green. (Stage 2
      may start some as expected failures; none may remain so here.)
   9. Device parity pass.
  10. Only then remove old diagnostics and simplify.

  DIAGNOSTICS RETAINED THROUGH MIGRATION. A structured trace stays behind
  the Diagnostics toggle: session id · state transition · selected plan ·
  resources acquired/released · pane created/released/disposed+reason ·
  lease acquired/released · commit/abort/reset reason · final visible
  descriptor · final scroll. Exposed as Swipe.debugSnapshot() /
  Swipe.debugTrace(). Heavy mutation-observer and frame probes go only
  after device parity.

=====================================================================
8. SIGN-OFF STATE

  Six review rounds. The architecture is settled; no further redesign is
  expected. Draft 6 applies the last three control-flow corrections:
    I11 uses an AUTHORITATIVE SETTLED DESCRIPTOR (it was unsatisfiable on
        an abort as written)
    gesture-ending inputs route by STATE, so a pre-drag cancel has a
        defined outcome
    a new gesture during ARMED/DRAGGING has an explicit supersession
        policy, matching today's hard-reset parity

  THREE THINGS THE IMPLEMENTER MUST KNOW:

  A. NOT EVERYTHING HERE IS PARITY. New policy, stated as such:
       - the recovery table's pre/post-stack rules (today: undefined;
         finalization has a try/finally for the row hold and nothing else)
       - restoring the starting scroll when a gesture is superseded
         (today's hard reset does not, so a superseded browse→browse drag
         can be left at the DESTINATION's scroll)
     Everything else, including the 1px Home entry and the hidden-host
     side effect, is preserved deliberately.

  B. THE MODEL IN §2 WAS WRONG THREE TIMES BEFORE IT WAS RIGHT. The pane
     inventory was wrong in drafts 1 and 2; the iOS-26 label on the 1px
     scroll was wrong in drafts 2 and 3; touchcancel routing contradicted
     itself in draft 4; I11 was unsatisfiable through draft 5. Every one
     was caught by review, none by the author, and every one concerned code
     the author had already read. Treat §2 as load-bearing but not
     self-evidently correct: stage 2 exists to check it against the running
     implementation before anything is extracted.

  C. DERIVE, DO NOT READ. The transition inventory must be GENERATED from
     the branch conditions and diffed in CI, never hand-maintained in
     prose. Reading produced two wrong inventories; a ten-line script
     produced the right one in seconds. The same discipline applies to the
     screen registry (from Nav.SETTINGS_SUBS) and the descriptor scenarios.
     A first gate of this kind shipped in build .214
     (test/harness-globals.test.js) and caught all three historical
     harness-global defects plus two mistakes in its own first draft.
