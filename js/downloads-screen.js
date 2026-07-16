// downloads-screen.js — the "Downloads" screen. A sub-screen of Options: it owns
// its controls' listeners, rendering, and the live-refresh subscription. The MARKUP
// is static in index.html (#downloads) — same as #options — so the nav/swipe system
// can filmstrip it in and out like any other overlay (setView/applyScreen own show/
// hide; this module only renders + binds). Was a bespoke body-appended slide-over
// (#dlscreen) outside the nav system, which is why it didn't filmstrip back.
//
// A VIEW, not logic: it renders the Downloads module's state and forwards user
// actions to it. app.js keeps the shared bits this leans on (toast/modal/format
// helpers, DLICO, confirmRemove) plus the nav actions (goBack/openDownloads) and
// injects them via init(), so there's one copy of each. Pure DOM glue — nothing to
// unit-test; the size-cap/eviction logic it drives lives in downloads.js.
const DownloadsScreen = (() => {
  // Injected by app.js: { Downloads, toast, modal, fmtGB, GB, DLICO, confirmRemove,
  //                       byId, goBack, openDownloads }
  let d = null;
  let bound = false;  // controls wired once (also guards the single subscription)

  const showing = () => { const el = d.byId('downloads'); return el && !el.classList.contains('hidden'); };

  // Wire the static #downloads controls once. Safe to call before Downloads exists —
  // the elements are static, and render() reflects live state each time it's shown.
  function bindControls() {
    if (bound) return;
    const $ = d.byId, dl = d.Downloads;
    const back = $('dlBack'); if (back) back.addEventListener('click', () => d.goBack());
    const sel = $('dlMax');
    [1, 2, 4, 8, 16].forEach((g) => { const o = document.createElement('option'); o.value = String(g * d.GB); o.textContent = g + ' GB'; sel.appendChild(o); });
    sel.addEventListener('change', (e) => { dl.setMaxBytes(parseInt(e.target.value, 10)); renderUsage(); });
    const bsel = $('dlBufMax'), MB = 1024 * 1024;
    [[32 * MB, '32 MB'], [64 * MB, '64 MB'], [128 * MB, '128 MB'], [512 * MB, '512 MB'], [d.GB, '1 GB'], [2 * d.GB, '2 GB'], [3 * d.GB, '3 GB'], [4 * d.GB, '4 GB']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = String(v); o.textContent = l; bsel.appendChild(o); });
    bsel.addEventListener('change', (e) => { dl.setBufMaxBytes(parseInt(e.target.value, 10)); renderUsage(); });
    $('dlClearBuf').addEventListener('click', () => {
      d.modal({ title: 'Clear buffered audio?', body: '<p>This removes auto-buffered chapters (the gray lines). Your downloaded books (blue) are kept.</p>',
        buttons: [{ label: 'Clear buffer', cls: 'danger', run: () => { dl.clearBuffer(); renderUsage(); } }, { label: 'Cancel' }] });
    });
    const wifiBtn = $('dlWifi');
    wifiBtn.addEventListener('click', () => { const on = dl.wifiOnly(); dl.setWifiOnly(!on); wifiBtn.setAttribute('aria-checked', on ? 'false' : 'true'); });
    // Re-render while the screen is visible (progress, added/removed books).
    dl.subscribe(() => { if (showing()) { renderList(); renderUsage(); } });
    bound = true;
  }

  function init(deps) { d = deps; }

  // Fill the controls from live state — run by applyScreen whenever the screen shows.
  function render() {
    const dl = d.Downloads, $ = d.byId;
    if (!dl || !dl.available()) return;
    bindControls();
    // iOS can't detect Wi-Fi vs cellular, so the same toggle is relabeled
    // "Confirm downloads" there (ON = show a carrier-charges prompt before each).
    $('dlWifiLabel').textContent = dl.wifiDetectable() ? 'Wi‑Fi only' : 'Confirm downloads';
    $('dlWifi').setAttribute('aria-checked', dl.wifiOnly() ? 'true' : 'false');
    $('dlMax').value = String(dl.maxBytes());
    const bufSel = $('dlBufMax');
    bufSel.value = String(dl.bufMaxBytes());
    const bufMoot = !(window.Settings && (Settings.bufferCurrent || Settings.bufferAhead));   // no banking enabled → buffer size is moot
    bufSel.disabled = bufMoot;
    bufSel.closest('.opt-row').classList.toggle('opt-disabled', bufMoot);   // dim the whole row so "disabled" is visible
    renderList(); renderUsage();
  }

  // Add a "Downloads" row to the Options screen (guarded so it appears once).
  function injectOptionRow() {
    const opt = d.byId('options');
    if (!opt || !d.Downloads || !d.Downloads.available() || document.getElementById('optDownloads')) return;
    const row = document.createElement('div');
    row.className = 'opt-row';
    row.innerHTML = '<span class="opt-label">Downloads</span><span class="opt-ctl"><button id="optDownloads" class="textbtn">Manage</button></span>';
    const firstBtn = opt.querySelector('.opt-row');
    opt.insertBefore(row, firstBtn ? firstBtn.nextSibling : null);
    row.querySelector('#optDownloads').addEventListener('click', () => d.openDownloads());
  }

  async function renderUsage() {
    const box = d.byId('dlUsage'); if (!box) return;
    const info = await d.Downloads.storageInfo();
    const pct = info.max ? Math.min(100, Math.round((info.used / info.max) * 100)) : 0;
    const q = info.quotaSupported ? ` · device free ≈ ${d.fmtGB(Math.max(0, info.quota - info.quotaUsage))}` : '';
    box.innerHTML = `<div class="dlbar"><i style="width:${pct}%"></i></div><div class="dlusage-txt">${d.fmtGB(info.used)} of ${d.fmtGB(info.max)}${q}</div>`;
    const bt = d.byId('dlBufTxt');
    if (bt && d.Downloads.bufferUsage) bt.textContent = `${d.fmtGB(d.Downloads.bufferUsage())} of ${d.fmtGB(d.Downloads.bufMaxBytes())} · auto, evicts oldest`;
  }

  async function renderList() {
    const host = d.byId('dlList'); if (!host) return;
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

  return { init, render, injectOptionRow };
})();

if (typeof window !== 'undefined') window.DownloadsScreen = DownloadsScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = DownloadsScreen;
