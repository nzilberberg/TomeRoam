// swipe.js — the swipe/reveal CLASSIFICATION boundary (PLAN-swipe-reveal.md stage 4).
//
// WHY THIS MODULE EXISTS. The swipe's behaviour "cannot be determined by reading it"
// (plan §1): the pane inventory was hand-written wrong twice, the branch conditions
// were mirrored in a generator behind a fingerprint pin the generator itself called
// "the one weak link". Stage 4 closes that weak link by making the decision live in
// ONE place — here — that production (start()) derives from and that an INDEPENDENT
// frozen spec (test/fixtures/swipe-plan-spec.mjs) is CHECKED AGAINST. The spec is
// hand-written and reviewed; the generator RENDERS it; the tests compare this production
// output to it. Production never generates the expectation and the spec never mirrors
// production's branches — that circular oracle is exactly what this replaces (the old
// two hand-kept copies a fingerprint could only prove EQUAL, never CORRECT).
//
// SCOPE — CONSTRUCTION. classifyTransition() normalizes a transition into kinds, the
// kind→host projection and decorations; constructionPlanFor() says what start() must BUILD:
// which element each of the outgoing/incoming movers is resolved to, whether the destination
// is rendered into the #browse host or into its own page node, and the Now Playing
// decoration — every field start() consumes. FINALIZATION is not modelled here at all:
// stage 6d's `finalizationPlanFor` declared one field, `abortRender`, and
// PLAN-swipe-declone.md Stage 2 retired the function with the decision. An abort no longer
// re-renders anything, because the source element is never overwritten — each browse page is
// its own scroller, so an abort is a transform reset and nothing else. This project forbids
// dead fields, so a plan that can only say 'none' is not kept.
//
// PARITY. Every mapping below reproduces js/app.js start() (the branch conditions at
// what was `fromOv`/`toOv`/`incomingBrowse`). classifyTransition is PURE (no DOM). The
// pane BUILDERS and the render dispatch stay in app.js today; stage 5 (boundary B,
// ratified 2026-07-22 — Claude/Plans/PLAN-swipe-stage5.md) moved the capture recipes, the
// real overlayEl/appViewEl source resolution and the npPillClone decoration builder here
// behind an injected env, while the destination render dispatch
// (renderScreen/renderNowPlaying/Browse.render) and the Browse hold stay in app.js.
//
// NO TRANSITION BUILDS A COPY OF A VIEW (PLAN-swipe-declone.md, Invariant D1). Stage 6i
// retired snapshotHome (active #home is a position:fixed own-scroll view un-parked as the
// real incoming mover); declone Stage 1 narrowed the remaining app-ghost recipe to the one
// pair sharing a single real host; declone Stage 2 gave each browse page its own inset
// own-scroll box, so browse→browse moves two real `.browsepage` elements and the recipe —
// with `ghostWrap`, the clone-fidelity helper cluster and the `capture` field — is deleted.
// `npPillClone` is retained: it clones a navbar PILL, not a view. Gated by
// test/no-view-clone-gate.test.js.
const Swipe = (() => {
  'use strict';

  // The overlay membership is the single source in Nav (isOverlay is pure — a name
  // check against 'options'/'nowplaying'/SETTINGS_SUBS, no DOM). Shared, not
  // reimplemented (plan: registries/enums may be shared, decision outcomes may not).
  const NAV = (typeof window !== 'undefined' && window.Nav) ? window.Nav
    : (typeof require !== 'undefined' ? require('./nav.js') : null);

  // The browse-family descriptors. Owned here so the frozen-model generator can import
  // the one list instead of re-listing it (drafts 1/2 of the plan omitted authorBooks).
  const BROWSE_FAMILY = ['books', 'authors', 'authorBooks', 'files'];

  // A screen name -> its structural kind. Home is NOT an overlay (draft 1's error).
  // An unknown name THROWS rather than defaulting — an unhandled input must be loud.
  function kindOf(v) {
    if (v === 'home') return 'home';
    if (BROWSE_FAMILY.indexOf(v) !== -1) return 'browse';
    if (NAV && NAV.isOverlay(v)) return 'overlay';
    throw new Error('Swipe: unknown screen "' + v + '" — not home, browse-family or an overlay');
  }

  const KINDS = ['home', 'browse', 'overlay'];

  // The two PARAMETERIZED descriptors carry a required payload (browse.js:22-23 keys
  // them by it): authorBooks needs `author`, files needs `book`. A descriptor whose
  // name is parameterized but whose payload is missing is MALFORMED and is rejected
  // here with a named reason, never silently planned (plan §4.3, I16). This is the
  // normalization boundary's WELL-FORMEDNESS check — NOT the stack-effect USE of the
  // payload (push vs replace), which joins the signature in stage 6.
  const PARAM_REQUIRED = { authorBooks: 'author', files: 'book' };
  function requirePayload(d, role) {
    const key = PARAM_REQUIRED[d.v];
    if (key && d[key] == null) {
      throw new Error('Swipe: malformed ' + role + ' descriptor "' + d.v
        + '" — missing required "' + key + '"');
    }
  }

  // classifyTransition — THE ONE NORMALIZATION BOUNDARY (plan §3.3). Raw descriptors in,
  // derived kinds + host projection + decorations out. Descriptor identity — authorBooks(A)
  // vs (B) — matters only to the stage-6 stack effect, so `direction`/`navigationRelation`
  // join the signature then. The output exposes the fields a current-slice consumer reads:
  // `fromKind`/`toKind` (constructionPlanFor), `sourceHost`/`destinationHost` (stage-5
  // buildConstruction, which reads them to resolve the real source element and the render
  // host — plan §3, F1-r), and `decorations` (start()). §3.3 also lists sameBrowseHost. Its
  // only planned consumer, the stage-6 abort re-render, was itself retired with the clone by
  // PLAN-swipe-declone.md Stage 2 (finalizationPlanFor and its abortRender decision are gone),
  // so per the no-dead-fields rule sameBrowseHost stays unemitted here with no current or
  // planned consumer — not "reintroduced later," since the stage that was going to do so no
  // longer exists in that form.
  function classifyTransition({ from, to }) {
    const fromKind = kindOf(from.v);
    const toKind = kindOf(to.v);
    requirePayload(from, 'source');
    requirePayload(to, 'destination');
    // The kind→host projection (plan §3, F1-r), the single place the kind→host mapping
    // policy lives. sourceHost picks overlay vs in-flow source resolution; destinationHost
    // picks the render host. Pinned per structural case in the frozen spec (expectedHosts).
    //
    // 'browse-page' (PLAN-swipe-declone.md §5.3.6) is keyed on the PAIR, not on either kind
    // alone: for browse→browse both slots resolve to the two `.browsepage` NODES rather than
    // to the one #browse host they share. Without it `sourceHost` is 'in-flow' → appViewEl →
    // #browse and `destinationHost` is 'browse-host' → $('browse'), so ONE element lands in
    // TWO mover slots — the second transform write wins, the view slides off and nothing
    // arrives (Invariant D6 distinctness, gated by MOVERSDISTINCT). It is keyed on the pair
    // rather than re-pointing appViewEl because a browse SOURCE must still resolve to
    // #browse when the destination is not browse: browse→home and browse→overlay ship that
    // today. The resolution is a property of the pair, which is what this boundary knows.
    const browsePair = fromKind === 'browse' && toKind === 'browse';
    const sourceHost = fromKind === 'overlay' ? 'overlay' : browsePair ? 'browse-page' : 'in-flow';
    const destinationHost = toKind === 'overlay' ? 'overlay'
      : browsePair ? 'browse-page'
        : toKind === 'browse' ? 'browse-host' : 'home';
    // The Now Playing pill is cloned when NP is EITHER endpoint (app.js start(): the
    // fromV and toV nowplaying branches). It is a mover with the same lifetime as
    // outgoing/incoming — based at the outgoing slot when NP is the source, the incoming
    // slot when NP is the destination. NP cannot be both (a pair with v===v is not a
    // transition), so this is a list of zero or one.
    let decorations = [];
    if (from.v === 'nowplaying') decorations = [{ kind: 'now-playing-pill', role: 'mover', base: 'outgoing' }];
    else if (to.v === 'nowplaying') decorations = [{ kind: 'now-playing-pill', role: 'mover', base: 'incoming' }];
    // Freeze the boundary DEEP (each decoration, the array, the object). The plan calls
    // this "THE ONE NORMALIZATION BOUNDARY" whose fields "cannot disagree"; a shallow
    // freeze would let a consumer push onto or edit a decoration and corrupt the shared
    // classification (and, since constructionPlanFor passes the SAME array through, the
    // plan too). A frozen array here makes the plan's decorations frozen for free.
    decorations = Object.freeze(decorations.map((d) => Object.freeze(d)));
    return Object.freeze({ fromKind, toKind, sourceHost, destinationHost, decorations });
  }

  // constructionPlanFor — what start() must BUILD. Immutable. No default branch; an
  // unhandled classification THROWS (plan §3.3).
  //   outgoing         'real-source'      move the real source element (borrowed-real).
  //                                        The ONLY value: Stage 2 of
  //                                        PLAN-swipe-declone.md gave each browse page its
  //                                        own inset own-scroll box, so browse→browse — the
  //                                        last pair whose two ends shared the real #browse
  //                                        host — now moves two real `.browsepage` elements
  //                                        and needs no stand-in either. NO transition
  //                                        builds a copy of a view (Invariant D1). The
  //                                        FIELD is deliberately kept at one value: it is
  //                                        the frozen spec's per-case assertion surface and
  //                                        what the anti-cloning gate reads, so collapsing
  //                                        it away would delete the place a re-introduced
  //                                        clone would have to declare itself.
  //   incoming         'real-destination' the real overlay element, the real #browse
  //                                        with the destination rendered into it, or
  //                                        (Stage 6i, PLAN-swipe-noswap-home.md) the
  //                                        real fixed #home un-parked as the incoming
  //                                        mover — 'home-snapshot' is RETIRED: a →home
  //                                        reveal never builds an owned pane
  //   renderDestination 'browse-page'     browse→browse only: render the destination and
  //                                        take the destination PAGE node as the incoming
  //                                        mover (PLAN-swipe-declone.md §5.3.6). Declared
  //                                        here as well as projected by classifyTransition
  //                                        so the declared field and the operative host
  //                                        cannot disagree on the one row Stage 2 changes
  //                    'browse-host'      render the destination INTO #browse mid-drag
  //                    'home-host'        un-park the real fixed #home as the incoming
  //                                        mover (Stage 6i) — #browse is NOT hidden
  //                    'none'             no live render (overlay renders itself)
  //   decorations       an independent deep-frozen COPY of the classification's list
  function constructionPlanFor(c) {
    // No default branch on EITHER kind. The toKind else-throws below; the fromKind is
    // read by the outgoing ternary, whose else would silently absorb a bad kind into
    // 'real-source' — so validate it explicitly (plan §3.3: an unhandled classification
    // THROWS, it does not default). Unreachable from classifyTransition (kindOf throws
    // first); this is the pure function's own contract for a direct malformed call.
    if (KINDS.indexOf(c.fromKind) === -1) {
      throw new Error('Swipe.constructionPlanFor: unhandled source kind "' + c.fromKind + '"');
    }
    // EVERY transition moves its real source element. Stage 1 narrowed the copy to the one
    // pair whose two ends shared the real #browse host (browse→browse); Stage 2 gave each
    // browse page its own inset own-scroll box, so that pair moves the two real
    // `.browsepage` nodes and the copy is gone entirely (PLAN-swipe-declone.md §5.1,
    // Invariant D1). Covering a view with a copy bought nothing (plan §3 audit: nine of the
    // eleven things the copy supplied were needed only BECAUSE it was a copy) and cost the
    // clone's own id-stripped, differently-laid-out geometry — the 7px gap, the 53px patch,
    // the reported swipe-start reflow.
    const outgoing = 'real-source';
    let incoming, renderDestination;
    if (c.toKind === 'overlay') { incoming = 'real-destination'; renderDestination = 'none'; }
    // Stage 6i (PLAN-swipe-noswap-home.md §4): active #home is a position:fixed
    // own-scroll view that never leaves the DOM, so →home no longer needs a snapshot —
    // the real fixed #home is un-parked as the incoming mover via 'home-host'.
    else if (c.toKind === 'home') { incoming = 'real-destination'; renderDestination = 'home-host'; }
    else if (c.toKind === 'browse') {
      incoming = 'real-destination';
      renderDestination = c.fromKind === 'browse' ? 'browse-page' : 'browse-host';
    }
    else throw new Error('Swipe.constructionPlanFor: unhandled destination kind "' + c.toKind + '"');
    // Independently immutable: CLONE the caller's decorations and freeze the copy, so the
    // plan's "Immutable" contract holds on a DIRECTLY-built classification too — it does not
    // ride on classifyTransition having frozen the input first (the composed path shares no
    // ref now). Clone, not freeze-in-place, so a caller-owned array is never mutated
    // (Engineering Contract item 14: clone caller-owned arrays/objects before freezing).
    const decorations = Object.freeze((c.decorations || []).map((d) => Object.freeze({ ...d })));
    return Object.freeze({ outgoing, incoming, renderDestination, decorations });
  }

  // ── STAGE 5 (plan §3/§7) — the DECORATION builder, private to the L1 seam ───────────
  // ONE builder is left. PLAN-swipe-declone.md Stage 2 retired the last view-copy recipe
  // (app-ghost) along with its clone-fidelity helper cluster — the id strip, the 53px
  // #library alignment constant, the topbar/hidden/parked/alphaindex prunes, the art
  // freeze, the carousel scrollLeft copy, the cover-animation phase seek and the
  // .nav-ghost wrapper. Every one of those existed only to make a COPY resemble the
  // original, and a real element that is simply moved supplies each of them inherently
  // (plan §3, §8). What remains is `npPillClone`, which clones a navbar PILL — a
  // decoration, not a view — and is deliberately retained.
  // It reads the world ONLY through env (env.document / env.navPill), never an ambient
  // document/window/Element/getComputedStyle — so the module stays DOM-free at load and
  // the recipe is drivable against a fake env (plan §7; the require() no-DOM gate and
  // test/swipe-construction.test.js). No builder touches the session itself.
  function paneBuilders(env) {
    const doc = env.document;
    // A detached, non-interactive clone of the Now Playing pill for the duration of an NP
    // swipe: it rides with NP as a mover. Removes any stale float first, strips ids, classes it.
    function npPillClone() {
      doc.querySelectorAll('.np-pill-float').forEach((n) => n.remove());
      const clone = env.navPill().cloneNode(true);
      clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      clone.classList.add('np-pill-float');
      doc.body.appendChild(clone);
      return clone;
    }
    return { npPillClone };
  }

  // buildConstruction — the L1 seam (plan §3). Given the canonical gesture descriptors and
  // the injected env, derive the classification + plan (single source of identity, F5) and
  // BUILD the panes, returning a Construction the L3 adapter maps to production movers and
  // records onto the session. The destination render dispatch stays app-side behind
  // env.renderDestination (L2); numeric base/width/direction never cross the seam (they stay
  // in L3). NON_CONTRACT: the return carries live DOM nodes, so it is not a deep-frozen
  // contract object (see test/contract-function-gate.test.js NON_CONTRACT).
  function buildConstruction(from, dest, env) {
    const classification = classifyTransition({ from, to: dest });
    const plan = constructionPlanFor(classification);
    const { sourceHost, destinationHost } = classification;
    const { npPillClone } = paneBuilders(env);
    const mover = (element, ownership, slot) => ({ element, ownership, slot });

    // ── OUTGOING — resolved to completion FIRST, before any destination render runs
    // (plan §6 step 5, F7a). NO transition builds an owned pane any more, so there is
    // nothing to capture and every view mover is borrowed-real. env.sourceEl selects
    // overlay / browse-page / in-flow source resolution by sourceHost; for a
    // browse→browse pair that is the SOURCE PAGE node, resolved from the descriptor-keyed
    // cache and therefore independent of what the destination render then shows.
    let outgoing, incoming, decoration = null;
    outgoing = mover(env.sourceEl(sourceHost, from.v), 'borrowed-real', 'outgoing');

    // ── INCOMING — always the real destination element as a borrowed-real mover (Stage 6i
    // retired the home-snapshot owned-pane outcome). env.renderDestination dispatches by host:
    // 'browse-page' renders the destination and returns its PAGE node (browse→browse — the
    // second half of Invariant D6's distinctness), 'browse-host' renders the destination into
    // #browse, 'home-host' un-parks the real fixed #home (without hiding #browse), an overlay
    // host renders the real overlay — every case returns a real element, so the mover shape
    // is identical for all four. ──
    incoming = mover(env.renderDestination(dest, destinationHost), 'borrowed-real', 'incoming');

    // ── DECORATIONS — the NP pill; zero or one (plan §3). Its np-locked unlock stays in L3.
    for (const deco of plan.decorations) {
      if (deco.kind !== 'now-playing-pill') continue;
      decoration = mover(npPillClone(), 'owned-decoration', deco.base);   // slot: outgoing | incoming
    }

    // The TWO-key Construction contract (plan §3; PLAN-swipe-declone.md §6): `classification`
    // is derived and consumed above (host resolution, plan derivation) and is NOT returned;
    // the `plan` WRAPPER is dropped — of its fields only `decorations` has an L3 consumer
    // (the outgoing-NP `np-locked` unlock), so it is HOISTED to the top level and PROJECTED
    // to `{ kind, base }` (the `role` leaf stripped — no L3 consumer reads it, F2). `capture`
    // is REMOVED, not nulled: its only producer was the app-ghost recipe, which no longer
    // exists, and a key that is always null is a dead field.
    const decorations = plan.decorations.map(({ kind, base }) => ({ kind, base }));
    return { decorations, movers: { outgoing, incoming, decoration } };
  }

  return { classifyTransition, constructionPlanFor, buildConstruction, BROWSE_FAMILY };
})();

if (typeof window !== 'undefined') window.Swipe = Swipe;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Swipe;
