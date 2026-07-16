// scrollbar.js — a custom scroll indicator confined to the band BETWEEN the fixed
// title bar and the transport (or nav bar). WHY: the main content uses DOCUMENT
// scroll (required so the iOS-26 fixed bars seat at the true bottom — an inner
// scroller / viewport-sized document displaced them, the reverted build .28 dead
// end), and the native viewport scrollbar runs the full window height, behind both
// fixed bars, with no way to inset it. So we hide the native scrollbars (see app.css)
// and draw our own thin indicator here: a fixed element positioned in the gap, whose
// thumb tracks whichever surface is scrolling — the document (Home) or a settings
// overlay (Options sub-screens, which have their own overflow). Self-contained +
// self-initializing (no app.js wiring), like debug.js / logpipe.js.
//
// Browse screens (Books/Authors) already carry the A-Z .alphaindex on the right edge
// as their scroll affordance, so the indicator suppresses itself while that's shown.
const ScrollBar = (() => {
  let el = null, thumb = null, hideT = null;
  const MIN_THUMB = 26;   // px — never a dot you can't see

  function ensure() {
    if (el || typeof document === 'undefined') return;
    el = document.createElement('div');
    el.id = 'scrollind';
    thumb = document.createElement('i');
    el.appendChild(thumb);
    document.body.appendChild(el);
  }

  const isDoc = (t) => t === document || t === document.documentElement || t === document.body || t === window;

  function metrics(t) {
    if (isDoc(t)) {
      const se = document.scrollingElement || document.documentElement;
      return { top: window.scrollY || se.scrollTop || 0, total: se.scrollHeight, view: window.innerHeight, doc: true };
    }
    return { top: t.scrollTop, total: t.scrollHeight, view: t.clientHeight, doc: false };
  }

  function show() {
    el.classList.add('on');
    clearTimeout(hideT);
    hideT = setTimeout(() => el.classList.remove('on'), 900);   // fade out when idle
  }

  // The A-Z index (browse screens) is the right-edge scroll affordance there.
  function alphaShown() {
    const a = document.querySelector('.alphaindex');
    return !!(a && a.offsetParent !== null);
  }

  function update(t) {
    ensure();
    if (!el) return;
    if (alphaShown()) { el.classList.remove('on'); return; }
    const m = metrics(t);
    const maxScroll = m.total - m.view;
    // The document keeps a ~12vh scroll runway (iOS-26 fixed-bar seating) even when
    // content fits, so ignore that much for the document surface (overlays have none)
    // — otherwise the indicator would appear on screens with nothing to scroll.
    const ignore = m.doc ? Math.round(window.innerHeight * 0.14) : 4;
    if (maxScroll <= ignore) { el.classList.remove('on'); return; }
    const band = el.clientHeight;   // the gap between the bars (CSS-positioned)
    if (band <= 0) return;
    const th = Math.max(MIN_THUMB, Math.round(band * (m.view / m.total)));
    const y = Math.max(0, Math.min(band - th, (m.top / maxScroll) * (band - th)));
    thumb.style.height = th + 'px';
    thumb.style.transform = 'translateY(' + Math.round(y) + 'px)';
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

  return { init, update };
})();

if (typeof window !== 'undefined') window.ScrollBar = ScrollBar;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = ScrollBar;
