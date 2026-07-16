// downloads-screen.js — the Downloads settings sub-screen: the pinned/blue tier
// (books you explicitly download). Owns Wi-Fi gating, the download-space budget, the
// storage-usage bar, and the downloaded-books list. The auto/gray BUFFER tier lives
// on the separate Buffering screen (js/buffering-screen.js). A filmstrip sub-screen
// of the Options hub; static #downloads markup in index.html.
//
// A VIEW, not logic: it renders the Downloads module's state and forwards user
// actions to it. app.js injects the shared bits (toast/modal/format helpers, DLICO,
// confirmRemove) plus the nav actions (onBack/openDownloads).
const DownloadsScreen = (() => {
  // Injected by app.js: { Downloads, toast, modal, fmtGB, GB, DLICO, confirmRemove,
  //                       byId, onBack, openDownloads }
  let d = null;
  let bound = false;  // controls wired once (also guards the single subscription)

  const showing = () => { const el = d.byId('downloads'); return el && !el.classList.contains('hidden'); };

  function bindControls() {
    if (bound) return;
    const $ = d.byId, dl = d.Downloads;
    const back = $('dlBack'); if (back) back.addEventListener('click', () => d.onBack());
    const sel = $('dlMax');
    [1, 2, 4, 8, 16].forEach((g) => { const o = document.createElement('option'); o.value = String(g * d.GB); o.textContent = g + ' GB'; sel.appendChild(o); });
    sel.addEventListener('change', (e) => { dl.setMaxBytes(parseInt(e.target.value, 10)); renderUsage(); });
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
    renderList(); renderUsage();
  }

  // Add a "Downloads" row to the Options screen (guarded so it appears once).
  // NOTE: the Options HUB now provides the Downloads row directly (index.html); this
  // stays for the app-only-if-available guard but is effectively a no-op when the
  // static hub row exists. Kept minimal so nothing double-adds.
  function injectOptionRow() { /* hub row is static now; nothing to inject */ }

  async function renderUsage() {
    const box = d.byId('dlUsage'); if (!box) return;
    const info = await d.Downloads.storageInfo();
    const pct = info.max ? Math.min(100, Math.round((info.used / info.max) * 100)) : 0;
    const q = info.quotaSupported ? ` · device free ≈ ${d.fmtGB(Math.max(0, info.quota - info.quotaUsage))}` : '';
    box.innerHTML = `<div class="dlbar"><i style="width:${pct}%"></i></div><div class="dlusage-txt">${d.fmtGB(info.used)} of ${d.fmtGB(info.max)}${q}</div>`;
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
