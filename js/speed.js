// @ts-check
// speed.js — modular playback-speed control (button + pop-up option list).
//
// SELF-CONTAINED + PORTABLE. SpeedControl.create() returns { el, getRate,
// setRate }; `el` is a ready-to-mount element. Its current home is the
// now-playing bar's control cluster (see app.js), but that is TEMPORARY — to
// relocate, just append `el` somewhere else. No other code needs to change:
// speed changes are surfaced only through the onChange callback, so the host
// (app.js) owns what a rate change actually does (here: audio.playbackRate).
window.SpeedControl = (() => {
  const MIN = 10, MAX = 25;                      // tenths → 1.0× … 2.5×
  const rates = [];
  for (let t = MIN; t <= MAX; t++) rates.push(t / 10);
  // Whole numbers show as "1×" / "2×"; the rest as one decimal ("1.3×").
  const label = (r) => (Number.isInteger(r) ? String(r) : r.toFixed(1)) + '×';

  /** @param {{ onChange?: (rate: number) => void, initial?: number }} [opts] */
  function create({ onChange, initial = 1.0 } = {}) {
    let rate = initial;

    const wrap = document.createElement('div');
    wrap.className = 'speedwrap';

    const pop = document.createElement('div');
    pop.className = 'speedpop hidden';
    for (const r of rates) {
      const o = document.createElement('button');
      o.type = 'button';
      o.className = 'speedopt';
      o.textContent = label(r);
      o.dataset.rate = r;
      o.addEventListener('click', (e) => { e.stopPropagation(); setRate(r); close(); });
      pop.appendChild(o);
    }

    const btn = document.createElement('button');
    btn.className = 'speedbtn';
    btn.type = 'button';
    btn.title = 'Playback speed';

    // pop-up first so it stacks above the button when positioned upward.
    wrap.appendChild(pop);
    wrap.appendChild(btn);

    const renderLabel = () => { btn.textContent = label(rate); };
    const markActive = () => /** @type {NodeListOf<HTMLElement>} */ (pop.querySelectorAll('.speedopt')).forEach(
      (o) => o.classList.toggle('active', Number(o.dataset.rate) === rate));
    const isOpen = () => !pop.classList.contains('hidden');
    const onDoc = (e) => { if (!wrap.contains(e.target)) close(); };
    function open() { markActive(); pop.classList.remove('hidden'); document.addEventListener('click', onDoc, true); }
    function close() { pop.classList.add('hidden'); document.removeEventListener('click', onDoc, true); }

    btn.addEventListener('click', (e) => { e.stopPropagation(); isOpen() ? close() : open(); });

    // setRate(r, true) updates the UI without firing onChange (host-driven sync).
    function setRate(r, silent) {
      rate = r; renderLabel(); markActive();
      if (!silent && onChange) onChange(rate);
    }

    renderLabel();
    return { el: wrap, getRate: () => rate, setRate };
  }

  return { create };
})();
