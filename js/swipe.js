// swipe.js — the swipe/reveal CLASSIFICATION boundary (PLAN-swipe-reveal.md stage 4).
//
// WHY THIS MODULE EXISTS. The swipe's behaviour "cannot be determined by reading it"
// (plan §1): the pane inventory was hand-written wrong twice, the branch conditions
// were mirrored in a generator behind a fingerprint pin the generator itself called
// "the one weak link". Stage 4 closes that weak link by making the decision live in
// ONE place — here — that both production (start()) and the frozen model derive from,
// instead of two hand-kept copies that a fingerprint can only prove have not drifted.
//
// SCOPE — CONSTRUCTION ONLY (plan §7.4, phase-split). classifyTransition() normalizes a
// transition into kinds/hosts/decorations; constructionPlanFor() says what start() must
// BUILD: which representation the outgoing/incoming movers take, whether the destination
// is rendered into the #browse host, and the Now Playing decoration. That is every field
// start() consumes today and nothing more. The FINALIZATION half — commit/abort/scroll/
// stackEffect/paneRemovalPolicy/reveal — is deliberately NOT here: nothing consumes it
// until finalization centralizes in stage 6, and this project forbids dead fields (the
// stage-3 review removed unreachable guards for exactly this reason). Stage 6 adds
// finalizationPlanFor() and composes the rich §3.3 planFor() from both halves.
//
// PARITY. Every mapping below reproduces js/app.js start() (the branch conditions at
// what was `fromOv`/`toOv`/`incomingBrowse`). classifyTransition is PURE (no DOM); the
// pane BUILDERS (ghostApp/snapshotHome/overlayEl/appViewEl/npPillClone) and the render
// calls stay in app.js until stage 5 moves them here.
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
  // derived kinds + decorations out. Stage 4 reads only { v } from each descriptor
  // (kinds are kind-level; descriptor identity — authorBooks(A) vs (B) — matters only to
  // the stage-6 stack effect, so `direction`/`navigationRelation` join the signature
  // then). The output exposes ONLY the fields a current-slice consumer reads: `fromKind`/
  // `toKind` (constructionPlanFor) and `decorations` (start()). §3.3 also lists
  // sourceHost/destinationHost/sameBrowseHost, but no stage-4 consumer reads them, so
  // per the no-dead-fields rule they are NOT emitted here — they are reintroduced in the
  // stage that first consumes them (sameBrowseHost with the stage-6 abort re-render;
  // the hosts with the stage-5 pane/mover construction that reads them), each with its
  // consumer and test in the same commit. This is a staging-contract correction, not a
  // behaviour or product-policy change.
  function classifyTransition({ from, to }) {
    const fromKind = kindOf(from.v);
    const toKind = kindOf(to.v);
    requirePayload(from, 'source');
    requirePayload(to, 'destination');
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
    return Object.freeze({ fromKind, toKind, decorations });
  }

  // constructionPlanFor — what start() must BUILD. Immutable. No default branch; an
  // unhandled classification THROWS (plan §3.3).
  //   outgoing         'app-ghost'        freeze the source as a ghost (owned-pane) so
  //                                        the incoming can render into the real #browse
  //                    'real-source'      move the real source element (borrowed-real):
  //                                        an overlay, or an in-flow view when the
  //                                        incoming does not need #browse
  //   incoming         'home-snapshot'    a static Home snapshot at top (owned-pane)
  //                    'real-destination' the real overlay element, or the real #browse
  //                                        with the destination rendered into it
  //   renderDestination 'browse-host'     render the destination INTO #browse mid-drag
  //                    'none'             no #browse render (overlay renders itself; a
  //                                        Home snapshot needs no live render)
  //   decorations       the classification's decoration list, verbatim
  function constructionPlanFor(c) {
    // No default branch on EITHER kind. The toKind else-throws below; the fromKind is
    // read by the outgoing ternary, whose else would silently absorb a bad kind into
    // 'real-source' — so validate it explicitly (plan §3.3: an unhandled classification
    // THROWS, it does not default). Unreachable from classifyTransition (kindOf throws
    // first); this is the pure function's own contract for a direct malformed call.
    if (KINDS.indexOf(c.fromKind) === -1) {
      throw new Error('Swipe.constructionPlanFor: unhandled source kind "' + c.fromKind + '"');
    }
    const outgoing = c.fromKind === 'overlay' ? 'real-source'
      : (c.toKind === 'browse' ? 'app-ghost' : 'real-source');
    let incoming, renderDestination;
    if (c.toKind === 'overlay') { incoming = 'real-destination'; renderDestination = 'none'; }
    else if (c.toKind === 'home') { incoming = 'home-snapshot'; renderDestination = 'none'; }
    else if (c.toKind === 'browse') { incoming = 'real-destination'; renderDestination = 'browse-host'; }
    else throw new Error('Swipe.constructionPlanFor: unhandled destination kind "' + c.toKind + '"');
    return Object.freeze({ outgoing, incoming, renderDestination, decorations: c.decorations });
  }

  return { classifyTransition, constructionPlanFor, BROWSE_FAMILY };
})();

if (typeof window !== 'undefined') window.Swipe = Swipe;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Swipe;
