// Apply ONE mutation by index to js/app.js in the cwd. `--restore` puts the file back.
// Fails loudly if the anchor is not found, so a silently-unapplied mutation can never
// be mistaken for "the test did not catch it".
import fs from 'fs';

const MUTATIONS = [
  { name: 'MS pause -> audio.pause() direct (bypasses userPause)',
    from: "ms.setActionHandler('pause', () => userPause());",
    to: "ms.setActionHandler('pause', () => audio.pause());" },
  { name: 'MS seekbackward -> element direct (bypasses skipBy/onManualSeek)',
    from: "ms.setActionHandler('seekbackward', () => skipBy(-getSkipBack()));",
    to: "ms.setActionHandler('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - getSkipBack()); });" },
  { name: 'MS seekforward -> wrong direction',
    from: "ms.setActionHandler('seekforward', () => skipBy(getSkipFwd()));",
    to: "ms.setActionHandler('seekforward', () => skipBy(-getSkipFwd()));" },
  { name: 'MS previoustrack -> nextTrack (wrong handler)',
    from: "ms.setActionHandler('previoustrack', prevTrack);",
    to: "ms.setActionHandler('previoustrack', nextTrack);" },
  // The open resume-kill bug's shape: foregrounding re-drives restore mid-flight.
  { name: 'foreground re-drives restoreLastPlayed (resume-kill shape)',
    from: "        Playback.onVisible();   // recover a lock-screen wedge deferred while backgrounded (js/playback.js)",
    to: "        Playback.onVisible();\n        restoreLastPlayed();" },
  // The ownership guard the superseded-startup test depends on.
  { name: 'playReqGen supersede guard removed',
    from: "    if (myReq !== playReqGen) return;   // a newer explicit play superseded this one mid-fetch",
    to: "    if (false) return;" },
  // The .95 shape exactly: restore re-fires on foreground AND the same-track guard
  // regresses, so a live element is emptied and reloaded. #4 alone is benign because
  // shouldReloadOnRestore correctly returns false — it takes both.
  { name: 'foreground restore + same-track guard regressed (the .95 resume-kill)',
    from: "      const reload = PBLogic.shouldReloadOnRestore(saved.book, saved.track, prev && prev.book, prevT && prevT.ratingKey, elementLive);",
    to: "      const reload = true;",
    also: {
      from: "        Playback.onVisible();   // recover a lock-screen wedge deferred while backgrounded (js/playback.js)",
      to: "        Playback.onVisible();\n        restoreLastPlayed();",
    } },
];

const FILE = 'js/app.js';
const BAK = 'js/app.js.mutbak';

if (process.argv.includes('--restore')) {
  fs.copyFileSync(BAK, FILE);
  console.log('restored');
  process.exit(0);
}
if (process.argv.includes('--list')) {
  MUTATIONS.forEach((m, i) => console.log(i + ': ' + m.name));
  process.exit(0);
}

const i = Number(process.argv[2]);
const m = MUTATIONS[i];
if (!m) { console.error('no mutation #' + i); process.exit(1); }
if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

let src = fs.readFileSync(BAK, 'utf8');          // always mutate from the PRISTINE copy
for (const part of [m, m.also].filter(Boolean)) {
  if (!src.includes(part.from)) { console.error('ANCHOR NOT FOUND for #' + i + ' — mutation NOT applied'); process.exit(1); }
  src = src.replace(part.from, part.to);
}
fs.writeFileSync(FILE, src);
console.log('applied #' + i + ': ' + m.name);
