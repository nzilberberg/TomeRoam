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
// SCOPE — CONSTRUCTION ONLY (plan §7.4, phase-split). classifyTransition() normalizes a
// transition into kinds + decorations; constructionPlanFor() says what start() must
// BUILD: which representation the outgoing/incoming movers take, whether the destination
// is rendered into the #browse host, and the Now Playing decoration. That is every field
// start() consumes today and nothing more. The FINALIZATION half — commit/abort/scroll/
// stackEffect/paneRemovalPolicy/reveal — is deliberately NOT here: nothing consumes it
// until finalization centralizes in stage 6, and this project forbids dead fields (the
// stage-3 review removed unreachable guards for exactly this reason). Stage 6 adds
// finalizationPlanFor() and composes the rich §3.3 planFor() from both halves.
//
// PARITY. Every mapping below reproduces js/app.js start() (the branch conditions at
// what was `fromOv`/`toOv`/`incomingBrowse`). classifyTransition is PURE (no DOM). The
// pane BUILDERS and the render dispatch stay in app.js today; stage 5 (boundary B,
// ratified 2026-07-22 — Claude/Plans/PLAN-swipe-stage5.md) moves the two capture recipes
// (ghostApp/snapshotHome), the real overlayEl/appViewEl source resolution, and the
// npPillClone decoration builder here behind an injected env, while the destination render
// dispatch (renderScreen/renderNowPlaying/Browse.render) and the Browse hold stay in
// app.js until stages 6/7.
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
  // host — plan §3, F1-r), and `decorations` (start()). §3.3 also lists sameBrowseHost, but
  // its only consumer is the stage-6 abort re-render, so per the no-dead-fields rule it is
  // NOT emitted here — it is reintroduced in that stage with its consumer and test.
  function classifyTransition({ from, to }) {
    const fromKind = kindOf(from.v);
    const toKind = kindOf(to.v);
    requirePayload(from, 'source');
    requirePayload(to, 'destination');
    // The kind→host projection (plan §3, F1-r), the single place the kind→host mapping
    // policy lives. sourceHost picks overlay vs in-flow source resolution; destinationHost
    // picks the render host. Pinned per structural case in the frozen spec (expectedHosts).
    const sourceHost = fromKind === 'overlay' ? 'overlay' : 'in-flow';
    const destinationHost = toKind === 'overlay' ? 'overlay'
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
    const outgoing = c.fromKind === 'overlay' ? 'real-source'
      : (c.toKind === 'browse' ? 'app-ghost' : 'real-source');
    let incoming, renderDestination;
    if (c.toKind === 'overlay') { incoming = 'real-destination'; renderDestination = 'none'; }
    else if (c.toKind === 'home') { incoming = 'home-snapshot'; renderDestination = 'none'; }
    else if (c.toKind === 'browse') { incoming = 'real-destination'; renderDestination = 'browse-host'; }
    else throw new Error('Swipe.constructionPlanFor: unhandled destination kind "' + c.toKind + '"');
    // Independently immutable: CLONE the caller's decorations and freeze the copy, so the
    // plan's "Immutable" contract holds on a DIRECTLY-built classification too — it does not
    // ride on classifyTransition having frozen the input first (the composed path shares no
    // ref now). Clone, not freeze-in-place, so a caller-owned array is never mutated
    // (Engineering Contract item 14: clone caller-owned arrays/objects before freezing).
    const decorations = Object.freeze((c.decorations || []).map((d) => Object.freeze({ ...d })));
    return Object.freeze({ outgoing, incoming, renderDestination, decorations });
  }

  // ── STAGE 5 (plan §3/§7) — the pane BUILDERS, private to the L1 seam ────────────────
  // The two capture recipes (app-ghost / home-snapshot), the shared helper cluster, and
  // the NP decoration builder, relocated from js/app.js start() behind an injected `env`.
  // They read the world ONLY through env (env.document / env.scrollY / env.navPill), never
  // an ambient document/window/Element/getComputedStyle — so the module stays DOM-free at
  // load and the recipes are drivable against a fake env (plan §7; the require() no-DOM gate
  // and test/swipe-construction.test.js). Each returns its built element plus the capture
  // data the L3 adapter records onto the session; no builder touches the session itself.
  function paneBuilders(env) {
    const doc = env.document;
    const win = doc.defaultView;
    // The page background, resolved FRESH per gesture (never cached at module load), so a
    // mid-session theme change cannot leave it stale (plan §7, F8). Same try/catch →
    // var(--bg) fallback as the original app-side reader.
    const GHOST_BG = (() => {
      try { return win.getComputedStyle(doc.documentElement).getPropertyValue('--page-bg').trim() || 'var(--bg)'; }
      catch { return 'var(--bg)'; }
    })();
    // Clones must NOT re-trigger the art loader: strip data-art so loaded covers still show
    // via their copied src while unloaded ones stay as the skeleton.
    const freezeArt = (root) => root.querySelectorAll('img[data-art]').forEach((i) => i.removeAttribute('data-art'));
    // cloneNode does not copy carousel scrollLeft. Copy it across (after the clone is in the
    // DOM), preferring the saved dataset.sl (survives display:none, where scrollLeft reads 0).
    function copyScroll(src, dst) {
      const s = src.querySelectorAll('.carousel'), c = dst.querySelectorAll('.carousel');
      s.forEach((el, i) => { if (c[i]) c[i].scrollLeft = (+el.dataset.sl || el.scrollLeft || 0); });
    }
    // …nor animation PHASE. A clone restarts every cover animation at t=0; seek each clone
    // animation to its live twin's currentTime so the ghost is not out of phase at the swap.
    // Pair covers that SURVIVE the .hidden/.parked prune (walk up to the root, never test the
    // root — snapshotHome's source IS #home.parked) so index `i` cannot pair covers in two
    // differently-shaped trees. Reads Element through env's window, never a global one (F4b).
    // Returns { synced, residual }: residual is the max gap measured AT the seek (0 = it took).
    function copyAnimPhase(src, dst) {
      const El = win && win.Element;
      if (!El || !El.prototype.getAnimations) return { synced: 0, residual: 0 };
      const kept = (root) => (el) => {
        let n = el;
        while (n && n !== root) {
          if (n.classList && (n.classList.contains('hidden') || n.classList.contains('parked'))) return false;
          n = n.parentElement;
        }
        return true;
      };
      const s = Array.from(src.querySelectorAll('.cover, .authoravatar, .np-art')).filter(kept(src));
      const c = Array.from(dst.querySelectorAll('.cover, .authoravatar, .np-art')).filter(kept(dst));
      let synced = 0, residual = 0;
      s.forEach((el, i) => {
        const twin = c[i];
        if (!twin) return;
        try {
          const a = el.getAnimations(), b = twin.getAnimations();
          if (!a.length || !b.length || a[0].currentTime == null) return;
          b[0].currentTime = a[0].currentTime;
          residual = Math.max(residual, Math.abs((b[0].currentTime || 0) - (a[0].currentTime || 0)));
          synced++;
        } catch { /* an unsynced cover is the old behaviour, never a broken ghost */ }
      });
      return { synced, residual: Math.round(residual) };
    }
    // The fixed full-viewport pane both snapshot builders mount into (beneath the persistent
    // bars, clipped, non-interactive, transform-capable — the .nav-ghost contract, navGhost).
    function ghostWrap() {
      const wrap = doc.createElement('div');
      wrap.className = 'nav-ghost';
      wrap.style.cssText = 'position:fixed;inset:0;z-index:28;overflow:hidden;background:' + GHOST_BG + ';pointer-events:none;will-change:transform;';
      return wrap;
    }
    // A ghost of the current app-view (minus the shared topbar), shifted up by the current
    // scroll to match what's on screen. Used app-view↔app-view (the real view is re-rendered
    // for the destination). Returns { wrap, capture:{ ghostY, animSync, animRes } }.
    function ghostApp() {
      const clone = doc.querySelector('.app').cloneNode(true);
      const lib = clone.querySelector('#library'); if (lib) lib.style.paddingTop = '46px';
      clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      const tb = clone.querySelector('.topbar'); if (tb) tb.remove();
      clone.querySelectorAll('.hidden, .parked').forEach((n) => n.remove());
      freezeArt(clone);
      clone.style.margin = '0 auto';
      const ghostY = env.scrollY() || 0;
      clone.style.transform = 'translateY(' + (-ghostY) + 'px)';
      const wrap = ghostWrap();
      wrap.appendChild(clone);
      doc.body.appendChild(wrap);
      copyScroll(doc.querySelector('.app'), clone);
      // AFTER insertion: a detached clone has no CSS animations to seek.
      const { synced, residual } = copyAnimPhase(doc.querySelector('.app'), clone);
      return { wrap, capture: { ghostY, animSync: synced, animRes: residual } };
    }
    // A fixed snapshot of HOME at its TOP, the incoming pane for back-to-home. Pinned at top
    // with no scroll freeze, so its capture carries NO ghostY (plan §3, F2-r) — only the two
    // animation fields. Returns { wrap, capture:{ animSync, animRes } }.
    function snapshotHome() {
      const clone = doc.getElementById('home').cloneNode(true);
      clone.removeAttribute('id'); clone.classList.remove('hidden', 'parked');
      freezeArt(clone);
      const lib = doc.createElement('div'); lib.style.paddingTop = '46px'; lib.appendChild(clone);
      const box = doc.createElement('div'); box.className = 'app'; box.style.margin = '0 auto'; box.appendChild(lib);
      const wrap = ghostWrap();
      wrap.appendChild(box);
      doc.body.appendChild(wrap);
      copyScroll(doc.getElementById('home'), clone);
      const { synced, residual } = copyAnimPhase(doc.getElementById('home'), clone);
      return { wrap, capture: { animSync: synced, animRes: residual } };
    }
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
    return { ghostApp, snapshotHome, npPillClone };
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
    const { ghostApp, snapshotHome, npPillClone } = paneBuilders(env);
    const mover = (element, ownership, slot) => ({ element, ownership, slot });

    // Resolve the real source element at most once (for a borrowed-real outgoing mover
    // and/or the clobber check). env.sourceEl selects overlay vs in-flow by sourceHost.
    let realSource, sourceResolved = false;
    const resolveSource = () => {
      if (!sourceResolved) { realSource = env.sourceEl(sourceHost, from.v); sourceResolved = true; }
      return realSource;
    };

    // ── OUTGOING — built to completion FIRST, before any destination render can clobber the
    // source #browse (plan §6 step 5, F7a). Exactly one owned pane produces capture per
    // transition (app-ghost XOR home-snapshot), so `capture` is a single object or null.
    let capture = null, outgoing, incoming, decoration = null;
    if (plan.outgoing === 'app-ghost') {
      const g = ghostApp();
      outgoing = mover(g.wrap, 'owned-pane', 'outgoing');
      capture = g.capture;
    } else {
      outgoing = mover(resolveSource(), 'borrowed-real', 'outgoing');
    }

    // ── INCOMING ──
    let sourceWasClobbered = false;
    if (plan.incoming === 'home-snapshot') {
      const s = snapshotHome();
      incoming = mover(s.wrap, 'owned-pane', 'incoming');
      capture = s.capture;
    } else if (plan.renderDestination === 'browse-host') {
      const hostEl = env.renderDestination(dest, destinationHost);   // renders dest into #browse
      incoming = mover(hostEl, 'borrowed-real', 'incoming');
      // browse→browse: the mid-drag render overwrote the resolved source #browse, so an abort
      // must re-render the source (plan §3, F6). True iff the real source IS the render host.
      sourceWasClobbered = resolveSource() === hostEl;
    } else {                                                          // real-destination overlay
      incoming = mover(env.renderDestination(dest, destinationHost), 'borrowed-real', 'incoming');
    }

    // ── DECORATIONS — the NP pill; zero or one (plan §3). Its np-locked unlock stays in L3.
    for (const deco of plan.decorations) {
      if (deco.kind !== 'now-playing-pill') continue;
      decoration = mover(npPillClone(), 'owned-decoration', deco.base);   // slot: outgoing | incoming
    }

    return { classification, plan, movers: { outgoing, incoming, decoration }, capture, sourceWasClobbered };
  }

  return { classifyTransition, constructionPlanFor, buildConstruction, BROWSE_FAMILY };
})();

if (typeof window !== 'undefined') window.Swipe = Swipe;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = Swipe;
