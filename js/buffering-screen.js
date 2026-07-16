// buffering-screen.js — the Buffering settings sub-screen: the Model-B auto-buffer
// tier (the gray, evictable lines). Owns the two buffer toggles, the shared buffer-
// space budget, and the "clear buffered audio" action — everything about what the
// app pre-loads on its own (distinct from the Downloads screen's pinned/blue tier).
// A filmstrip sub-screen of the Options hub; static #buffering markup in index.html.
//
// Settings owns the two toggles (bufferCurrent/bufferAhead); Downloads owns the
// buffer-space budget + usage (bufMaxBytes/bufferUsage/clearBuffer). app.js injects
// pumpBank (re-drives banking when a toggle flips), modal/fmtGB/GB, and onBack.
const BufferingScreen = (() => {
  // Injected by app.js: { byId, Settings, Downloads, pumpBank, modal, fmtGB, GB, onBack }
  let d = null;
  let bound = false;

  const showing = () => { const el = d.byId('buffering'); return el && !el.classList.contains('hidden'); };

  function bindControls() {
    if (bound) return;
    const S = d.Settings, dl = d.Downloads, $ = d.byId;
    const back = $('bfBack'); if (back) back.addEventListener('click', () => d.onBack());
    // Whole-bank the current chapter (drop-resilience) / prefetch upcoming chapters.
    $('optBufCurrent').addEventListener('click', () => { const on = S.bufferCurrent; S.setBufferCurrent(!on); d.pumpBank(); render(); });
    $('optBufAhead').addEventListener('click', () => { const on = S.bufferAhead; S.setBufferAhead(!on); d.pumpBank(); render(); });
    if (dl) {
      const bsel = $('dlBufMax'), MB = 1024 * 1024;
      [[32 * MB, '32 MB'], [64 * MB, '64 MB'], [128 * MB, '128 MB'], [512 * MB, '512 MB'], [d.GB, '1 GB'], [2 * d.GB, '2 GB'], [3 * d.GB, '3 GB'], [4 * d.GB, '4 GB']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = String(v); o.textContent = l; bsel.appendChild(o); });
      bsel.addEventListener('change', (e) => { dl.setBufMaxBytes(parseInt(e.target.value, 10)); renderUsage(); });
      $('dlClearBuf').addEventListener('click', () => {
        d.modal({ title: 'Clear buffered audio?', body: '<p>This removes auto-buffered chapters (the gray lines). Your downloaded books (blue) are kept.</p>',
          buttons: [{ label: 'Clear buffer', cls: 'danger', run: () => { dl.clearBuffer(); renderUsage(); } }, { label: 'Cancel' }] });
      });
      // Refresh the buffered-usage number while the screen is visible.
      dl.subscribe(() => { if (showing()) renderUsage(); });
    }
    bound = true;
  }

  function init(deps) { d = deps; }

  function render() {
    const S = d.Settings, $ = d.byId;
    bindControls();
    $('optBufCurrent').setAttribute('aria-checked', S.bufferCurrent ? 'true' : 'false');
    $('optBufAhead').setAttribute('aria-checked', S.bufferAhead ? 'true' : 'false');
    const dl = d.Downloads, bsel = $('dlBufMax');
    if (dl && bsel) {
      bsel.value = String(dl.bufMaxBytes());
      const bufMoot = !(S.bufferCurrent || S.bufferAhead);   // no banking enabled → buffer size is moot
      bsel.disabled = bufMoot;
      bsel.closest('.opt-row').classList.toggle('opt-disabled', bufMoot);   // dim the whole row so "disabled" is visible
    }
    renderUsage();
  }

  function renderUsage() {
    const bt = d.byId('dlBufTxt'); const dl = d.Downloads;
    if (bt && dl && dl.bufferUsage) bt.textContent = `${d.fmtGB(dl.bufferUsage())} of ${d.fmtGB(dl.bufMaxBytes())} · auto, evicts oldest`;
  }

  return { init, render };
})();

if (typeof window !== 'undefined') window.BufferingScreen = BufferingScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = BufferingScreen;
