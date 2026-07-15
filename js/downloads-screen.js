// downloads-screen.js — the "Manage downloads" screen, extracted from app.js so it
// owns its own DOM element, listeners, rendering, and the live-refresh subscription
// in one place (was ~75 lines interleaved with app.js's other UI).
//
// It's a VIEW, not logic: it renders the Downloads module's state and forwards user
// actions to it. app.js keeps the shared bits this leans on (toast/modal/format
// helpers, the DLICO icon set, and confirmRemoveDownload — which the book menu and
// download buttons also use) and injects them via init(), so there's exactly one
// copy of each. No globals beyond what init() provides; nothing to unit-test here
// (pure DOM glue) — the size-cap/eviction logic it drives lives in downloads.js.
const DownloadsScreen = (() => {
  // Injected by app.js: { Downloads, toast, modal, fmtGB, GB, DLICO, confirmRemove, byId }
  let d = null;
  let el = null;      // the screen's root element (built once, then shown/hidden)
  let unsub = null;   // Downloads.subscribe handle (re-render while open)

  function init(deps) { d = deps; }

  function open() {
    const dl = d.Downloads;
    if (!dl || !dl.available()) return d.toast('Downloads unavailable on this device');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dlscreen';
      el.className = 'dlscreen';
      el.innerHTML =
        `<div class="dlscreen-bar"><button class="dlscreen-close" aria-label="Close">‹ Back</button><b>Downloads</b><span></span></div>
         <div class="dlscreen-body">
           <div class="opt-row"><span class="opt-label" id="dlWifiLabel">Wi‑Fi only</span><span class="opt-ctl"><button id="dlWifi" class="toggle" role="switch"></button></span></div>
           <div class="opt-row"><span class="opt-label">Max download space</span><span class="opt-ctl"><select id="dlMax"></select></span></div>
           <div class="opt-row"><span class="opt-label">Max buffer space<div class="opt-sub">Auto-buffered chapters (gray); evicts oldest</div></span><span class="opt-ctl"><select id="dlBufMax"></select></span></div>
           <div id="dlUsage" class="dlusage"></div>
           <div class="opt-row"><span class="opt-label">Buffered audio<div id="dlBufTxt" class="opt-sub"></div></span><span class="opt-ctl"><button id="dlClearBuf" class="textbtn">Clear buffer</button></span></div>
           <div class="section-title">Downloaded books</div>
           <div id="dlList" class="dllist"></div>
         </div>`;
      document.body.appendChild(el);
      el.querySelector('.dlscreen-close').addEventListener('click', close);
      const sel = el.querySelector('#dlMax');
      [1, 2, 4, 8, 16].forEach((g) => { const o = document.createElement('option'); o.value = String(g * d.GB); o.textContent = g + ' GB'; sel.appendChild(o); });
      sel.addEventListener('change', (e) => { dl.setMaxBytes(parseInt(e.target.value, 10)); renderUsage(); });
      const bsel = el.querySelector('#dlBufMax'), MB = 1024 * 1024;
      [[32 * MB, '32 MB'], [64 * MB, '64 MB'], [128 * MB, '128 MB'], [512 * MB, '512 MB'], [d.GB, '1 GB'], [2 * d.GB, '2 GB'], [3 * d.GB, '3 GB'], [4 * d.GB, '4 GB']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = String(v); o.textContent = l; bsel.appendChild(o); });
      bsel.addEventListener('change', (e) => { dl.setBufMaxBytes(parseInt(e.target.value, 10)); renderUsage(); });
      el.querySelector('#dlClearBuf').addEventListener('click', () => {
        d.modal({ title: 'Clear buffered audio?', body: '<p>This removes auto-buffered chapters (the gray lines). Your downloaded books (blue) are kept.</p>',
          buttons: [{ label: 'Clear buffer', cls: 'danger', run: () => { dl.clearBuffer(); renderUsage(); } }, { label: 'Cancel' }] });
      });
      const wifiBtn = el.querySelector('#dlWifi');
      wifiBtn.addEventListener('click', () => { const on = dl.wifiOnly(); dl.setWifiOnly(!on); wifiBtn.setAttribute('aria-checked', on ? 'false' : 'true'); });
    }
    el.classList.add('open');
    // iOS can't detect Wi-Fi vs cellular, so the same toggle is relabeled
    // "Confirm downloads" there (ON = show a carrier-charges prompt before each).
    el.querySelector('#dlWifiLabel').textContent = dl.wifiDetectable() ? 'Wi‑Fi only' : 'Confirm downloads';
    el.querySelector('#dlWifi').setAttribute('aria-checked', dl.wifiOnly() ? 'true' : 'false');
    el.querySelector('#dlMax').value = String(dl.maxBytes());
    const bufSel = el.querySelector('#dlBufMax');
    bufSel.value = String(dl.bufMaxBytes());
    const bufMoot = !(window.Settings && (Settings.bufferCurrent || Settings.bufferAhead));   // no banking enabled → buffer size is moot
    bufSel.disabled = bufMoot;
    bufSel.closest('.opt-row').classList.toggle('opt-disabled', bufMoot);   // dim the whole row so "disabled" is visible
    renderList(); renderUsage();
    if (!unsub) unsub = dl.subscribe(() => { if (el && el.classList.contains('open')) { renderList(); renderUsage(); } });
  }

  function close() { if (el) el.classList.remove('open'); }

  // Add a "Downloads" row to the Options screen (guarded so it appears once).
  function injectOptionRow() {
    const opt = d.byId('options');
    if (!opt || !d.Downloads || !d.Downloads.available() || document.getElementById('optDownloads')) return;
    const row = document.createElement('div');
    row.className = 'opt-row';
    row.innerHTML = '<span class="opt-label">Downloads</span><span class="opt-ctl"><button id="optDownloads" class="textbtn">Manage</button></span>';
    const firstBtn = opt.querySelector('.opt-row');
    opt.insertBefore(row, firstBtn ? firstBtn.nextSibling : null);
    row.querySelector('#optDownloads').addEventListener('click', open);
  }

  async function renderUsage() {
    const box = el && el.querySelector('#dlUsage'); if (!box) return;
    const info = await d.Downloads.storageInfo();
    const pct = info.max ? Math.min(100, Math.round((info.used / info.max) * 100)) : 0;
    const q = info.quotaSupported ? ` · device free ≈ ${d.fmtGB(Math.max(0, info.quota - info.quotaUsage))}` : '';
    box.innerHTML = `<div class="dlbar"><i style="width:${pct}%"></i></div><div class="dlusage-txt">${d.fmtGB(info.used)} of ${d.fmtGB(info.max)}${q}</div>`;
    const bt = el.querySelector('#dlBufTxt');
    if (bt && d.Downloads.bufferUsage) bt.textContent = `${d.fmtGB(d.Downloads.bufferUsage())} of ${d.fmtGB(d.Downloads.bufMaxBytes())} · auto, evicts oldest`;
  }

  async function renderList() {
    const host = el && el.querySelector('#dlList'); if (!host) return;
    const rows = await d.Downloads.listDownloaded();
    if (!rows.length) { host.innerHTML = '<div class="empty">No downloaded books yet.</div>'; return; }
    host.innerHTML = '';
    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'dlrow';
      row.innerHTML = `<div class="dlrow-meta"><div class="dlrow-title"></div><div class="dlrow-sub"></div></div><button class="dlrow-del" aria-label="Remove">${d.DLICO.trash}</button>`;
      row.querySelector('.dlrow-title').textContent = r.title || 'Book';
      row.querySelector('.dlrow-sub').textContent = `${r.author || ''}${r.author ? ' · ' : ''}${d.fmtGB(r.size || 0)}`;
      row.querySelector('.dlrow-del').addEventListener('click', () => d.confirmRemove(r.book, r.title));
      host.appendChild(row);
    }
  }

  return { init, open, close, injectOptionRow };
})();

if (typeof window !== 'undefined') window.DownloadsScreen = DownloadsScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = DownloadsScreen;
