// scrollbar.js — a custom scroll indicator confined to the band BETWEEN the fixed
// title bar and the transport (or nav bar). WHY: the main content uses DOCUMENT
// scroll (required so the iOS-26 fixed bars seat at the true bottom — an inner
// scroller / viewport-sized document displaced them, the reverted build .28 dead
// end), and the native viewport scrollbar runs the full window height, behind both
// fixed bars, with no way to inset it. So we hide the native scrollbars on the
// surfaces THIS indicator supports (the document + the settings overlays — see the
// SCOPED rule in app.css) and draw our own thin indicator here.
//
// SCOPE (important): the indicator only covers surfaces whose scroll fits the
// title-bar→transport band: the DOCUMENT (Home/Books/Authors) and the settings
// overlays (#options + subs). Higher, differently-shaped scrollers — Now Playing
// (z60), the speed popover (z50), the track-info sheet (z80), the book menu (z85) —
// sit ABOVE this indicator and have their OWN geometry, so they KEEP their native
// scrollbars and this module ignores their scroll events (surfaceKind → null).
//
// Browse screens (Books/Authors) carry the A-Z .alphaindex on the right edge as the
// document-scroll affordance, so the indicator suppresses itself for DOCUMENT scroll
// while the ACTIVE (non-hidden cached) browse page's index is shown. Element
// scrollers (settings overlays) are NEVER suppressed by that — an unrelated A-Z index
// mounted underneath a settings overlay must not blank the overlay's indicator.
const ScrollBar = (() => {
  let el = null, thumb = null, hideT = null;
  const MIN_THUMB = 26;   // px — never a dot you can't see
  // The surfaces this indicator supports (their scroll fits the band). Matches the
  // native-scrollbar-hiding scope in app.css. `document` is handled via isDoc().
  const OVERLAY_SEL = '#options,#general,#playback,#buffering,#downloads,#diagnostics';

  function ensure() {
    if (el || typeof document === 'undefined') return;
    el = document.createElement('div');
    el.id = 'scrollind';
    thumb = document.createElement('i');
    el.appendChild(thumb);
    document.body.appendChild(el);
  }

  const isDoc = (t) => t === document || t === document.documentElement || t === document.body || t === window;

  // 'doc' = the window/document scroll; 'overlay' = a settings sub-screen's own
  // scroll; null = anything else (NP / sheet / popover / modal / stray element) →
  // NOT ours, leave its native scrollbar alone.
  function surfaceKind(t) {
    if (isDoc(t)) return 'doc';
    if (t && typeof t.matches === 'function' && t.matches(OVERLAY_SEL)) return 'overlay';
    return null;
  }

  function metrics(t) {
    if (isDoc(t)) {
      const se = document.scrollingElement || document.documentElement;
      return { top: window.scrollY || se.scrollTop || 0, total: se.scrollHeight, view: window.innerHeight, doc: true };
    }
    return { top: t.scrollTop, total: t.scrollHeight, view: t.clientHeight, doc: false };
  }

  // Is the browse A-Z index ACTUALLY on screen? It's a descendant of the #browse
  // container (o.mount). Three things must all hold: #browse itself is showing (it
  // gets `.hidden` when you leave browse for Home/Options — but the cached
  // `.browsepage` inside it KEEPS its non-hidden class, so checking the page alone
  // left the index "shown" forever and permanently suppressed the Home indicator),
  // the active cached page isn't `.hidden`, and it has an index. Purely class-based
  // so it's testable (no layout / offsetParent).
  function activeAlphaShown() {
    return !!document.querySelector('#browse:not(.hidden) .browsepage:not(.hidden) .alphaindex');
  }

  // Pure: only DOCUMENT scroll defers to the browse A-Z index; element (overlay)
  // scrollers never do (their affordance is this indicator, native is hidden).
  function suppressedFor(kind, activeAlpha) { return kind === 'doc' && activeAlpha; }

  // Pure: given the scroll metrics + band height, decide whether/where to draw the
  // thumb. `ignore` skips near-empty scroll (the document's ~12vh iOS-26 runway).
  function computeThumb(suppress, m, band, ignore, minThumb) {
    if (suppress) return { show: false };
    const maxScroll = m.total - m.view;
    if (maxScroll <= ignore || band <= 0) return { show: false };
    const th = Math.max(minThumb, Math.round(band * (m.view / m.total)));
    const y = Math.max(0, Math.min(band - th, (m.top / maxScroll) * (band - th)));
    return { show: true, thumbH: th, thumbY: Math.round(y) };
  }

  function show() {
    el.classList.add('on');
    clearTimeout(hideT);
    hideT = setTimeout(() => el.classList.remove('on'), 900);   // fade out when idle
  }

  function update(t) {
    ensure();
    if (!el) return;
    const kind = surfaceKind(t);
    if (!kind) { el.classList.remove('on'); return; }   // unsupported surface — keeps its native scrollbar
    const m = metrics(t);
    const ignore = kind === 'doc' ? Math.round(window.innerHeight * 0.14) : 4;
    const activeAlpha = kind === 'doc' ? activeAlphaShown() : false;
    const r = computeThumb(suppressedFor(kind, activeAlpha), m, el.clientHeight, ignore, MIN_THUMB);
    if (!r.show) { el.classList.remove('on'); return; }
    thumb.style.height = r.thumbH + 'px';
    thumb.style.transform = 'translateY(' + r.thumbY + 'px)';
    show();
  }

  function init() {
    ensure();
    // Capture phase catches scroll from ANY surface (scroll events don't bubble).
    document.addEventListener('scroll', (e) => update(e.target), { capture: true, passive: true });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  return { init, update, _test: { surfaceKind, activeAlphaShown, suppressedFor, computeThumb } };
})();

if (typeof window !== 'undefined') window.ScrollBar = ScrollBar;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = ScrollBar;
