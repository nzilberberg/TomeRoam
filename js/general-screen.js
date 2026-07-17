// general-screen.js — the General settings sub-screen: this device's identity plus
// app-lifecycle bits (auto-update, sign out) and the DEVICE LIST. A filmstrip
// sub-screen of the Options hub; static #general markup in index.html.
//
// The App-update BUTTON (#optUpdate) is deliberately NOT owned here — it's driven by
// app-update lifecycle from OUTSIDE settings (native OTA events / the SW), so app.js
// keeps binding it by id wherever it lives. This screen owns the device rename, the
// "Auto update on launch" toggle (a Settings value, mirrored to the native boot pref),
// Sign out, and the device list (Adopt / Delete / Ignore — see Progress.devices()).
// app.js injects Settings/Presence/Progress/toast and the onSignOut teardown + onBack.
const GeneralScreen = (() => {
  // Injected by app.js: { byId, Settings, Presence, Progress, toast, onSignOut, onBack }
  let d = null;
  let bound = false;
  let showIgnored = false;

  // Ignore is the DEFAULT safe action (an unrecognized peer may be a live device
  // whose data must be left alone) and it must PERSIST or the list nags forever.
  const IGN_KEY = 'pb_devIgnored';
  const ignored = () => { try { return JSON.parse(localStorage.getItem(IGN_KEY) || '{}'); } catch { return {}; } };
  function setIgnored(key, on) {
    const m = ignored();
    if (on) m[key] = Date.now(); else delete m[key];
    try { localStorage.setItem(IGN_KEY, JSON.stringify(m)); } catch {}
  }

  const agoStr = (ts) => {
    if (!ts) return 'never seen recording';
    const s = Math.max(0, Date.now() - ts) / 1000;
    if (s < 90) return 'just now';
    if (s < 5400) return Math.round(s / 60) + ' min ago';
    if (s < 129600) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  };

  // Render the device list. `refresh` pulls a fresh poll first (screen open);
  // action handlers re-render from the already-updated local inventory.
  async function renderDevices(refresh) {
    const list = d.byId('devList'), foot = d.byId('devFoot');
    if (!list || !d.Progress || !d.Progress.devices) return;
    if (refresh) { try { await d.Progress.refresh(); } catch { /* offline — render what we know */ } }
    const ign = ignored();
    const all = d.Progress.devices();
    const vis = all.filter((x) => showIgnored || !ign[x.key]);
    list.textContent = '';
    if (!vis.length) {
      const p = document.createElement('div');
      p.className = 'statusline';
      p.textContent = all.length ? 'All other devices are ignored.' : 'No other devices have recorded progress.';
      list.appendChild(p);
    }
    for (const dev of vis) {
      const row = document.createElement('div');
      row.className = 'opt-row';
      const label = document.createElement('span');
      label.className = 'opt-label';
      label.innerHTML = '<span></span><div class="opt-sub"></div>';
      label.firstChild.textContent = (dev.name || '(unnamed device)') + (ign[dev.key] ? ' · ignored' : '');
      label.lastChild.textContent = agoStr(dev.lastSeen) + (dev.quiet ? '' : ' · active');
      const ctl = document.createElement('span');
      ctl.className = 'opt-ctl';
      const btn = (txt, fn) => {
        const b = document.createElement('button');
        b.className = 'textbtn'; b.textContent = txt;
        b.addEventListener('click', async () => {
          for (const x of ctl.querySelectorAll('button')) x.disabled = true;
          try { await fn(); } finally { renderDevices(false); }
        });
        ctl.appendChild(b);
        return b;
      };
      // Adopt: always offered when the identity is known — the reinstall case it
      // exists for happens MINUTES after the ghost's last activity, so no timer
      // gates it. An apparently-active device just gets a louder warning.
      if (dev.id) {
        btn('Adopt', async () => {
          const activeWarn = dev.quiet ? '' : '\n\n⚠ This device looks ACTIVE right now — if it is another live device (not your old self), adopting it will mislabel its listening as yours.';
          if (!confirm(`Adopt "${dev.name || dev.key}"?\n\nIts listening positions become this device's own (green turns orange) and its old boards are removed. Only do this if that device was YOU — e.g. this phone, before it was reinstalled.${activeWarn}`)) return;
          const r = await d.Progress.adoptIdentity(dev);
          d.toast(r.ok ? `Adopted ${r.adopted} position(s)` : 'Adopt failed: ' + r.error);
        });
      }
      btn('Delete', async () => {
        if (!confirm(`Delete "${dev.name || dev.key}"?\n\nIts recorded positions are DELETED everywhere and its boards removed from Plex. Books you also played on other devices keep their newer progress. A live device you delete keeps playing and re-registers itself.`)) return;
        const r = await d.Progress.deleteDevice(dev);
        d.toast(r.ok ? 'Device deleted' : 'Delete failed: ' + r.error);
      });
      btn(ign[dev.key] ? 'Unignore' : 'Ignore', async () => { setIgnored(dev.key, !ign[dev.key]); });
      row.appendChild(label); row.appendChild(ctl);
      list.appendChild(row);
    }
    const nIgn = all.filter((x) => ign[x.key]).length;
    foot.textContent = '';
    if (nIgn && !showIgnored) {
      const a = document.createElement('button');
      a.className = 'textbtn'; a.textContent = `${nIgn} ignored — show`;
      a.addEventListener('click', () => { showIgnored = true; renderDevices(false); });
      foot.appendChild(a);
    } else if (showIgnored && nIgn) {
      const a = document.createElement('button');
      a.className = 'textbtn'; a.textContent = 'hide ignored';
      a.addEventListener('click', () => { showIgnored = false; renderDevices(false); });
      foot.appendChild(a);
    }
  }

  // "This device: <name>  (rename)". Also called by app.js when presence inits.
  function renderDeviceName() {
    const el = d.byId('deviceName');
    if (!el) return;
    el.textContent = 'This device: ' + d.Presence.name() + '  (rename)';
    el.onclick = () => {
      const n = prompt('Name this device (shows on your other devices):', d.Presence.name());
      if (n) { d.Presence.setName(n); renderDeviceName(); }
    };
  }

  function bindControls() {
    if (bound) return;
    const S = d.Settings, $ = d.byId;
    const back = $('gnBack'); if (back) back.addEventListener('click', () => d.onBack());
    // Auto update on launch (APK): also push the new value into the native boot pref.
    $('optAutoUpdate').addEventListener('click', () => {
      const on = S.autoUpdate;
      S.setAutoUpdate(!on);
      $('optAutoUpdate').setAttribute('aria-checked', on ? 'false' : 'true');
      try { if (window.TomeRoamNative && TomeRoamNative.setAutoUpdate) TomeRoamNative.setAutoUpdate(!on); } catch { /* PWA: no native bridge */ }
    });
    $('signout').addEventListener('click', () => { if (!confirm('Sign out of Plex?')) return; d.onSignOut(); });
    bound = true;
  }

  function init(deps) { d = deps; }

  function render() {
    const S = d.Settings, $ = d.byId;
    bindControls();
    renderDeviceName();
    $('optAutoUpdate').setAttribute('aria-checked', S.autoUpdate ? 'true' : 'false');
    renderDevices(true);   // async — refreshes boards, then fills #devList
  }

  return { init, render, renderDeviceName };
})();

if (typeof window !== 'undefined') window.GeneralScreen = GeneralScreen;
if (typeof module !== 'undefined' && module.exports !== undefined) module.exports = GeneralScreen;
