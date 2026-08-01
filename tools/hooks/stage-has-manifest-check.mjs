#!/usr/bin/env node
// stage-has-manifest-check.mjs — pre-commit gate: a stage BUILD LOG may not be committed unless a
// campaign manifest exists that binds that stage to its gate list.
//
// THE DEFECT THIS MECHANIZES (found 2026-07-31, before it shipped). Stage A1b of the
// one-screen-type campaign reached the front of the build queue having NEVER been plan-reviewed:
// Charpy's review of that plan is commit e979a41 (07-30) and §5.3 Stage A1b was added afterwards
// in 8e9b4b6 (07-31), while the plan's header still read "PLAN_READY — reviewed (TEMPER)". The
// stale header was believable because nothing bound the stage to a gate list — the whole campaign
// had NO manifest. `stage-gate-check.mjs` enforces a manifest's gates faithfully, but it can only
// enforce a manifest that exists, and nothing required one to exist.
//
// A manifest IS the gate list. Missing, every gate is optional by default and skipping one leaves
// no trace; present, `campaign-complete-check.mjs` refuses to mark the stage COMPLETE until every
// required gate carries a filed, accepted verdict. So the manifest must exist by the time there is
// a build to gate — which is the moment a Brunel build log is committed.
//
// THE RULE. If this commit stages `Claude/Brunel/*-build.md`, some `Claude/Campaigns/*.json` must
// carry a `build` gate whose `verdictArtifactGlob` matches that file. Otherwise: block.
//
// ⚠️ NOT CIRCULAR — the companion change that makes this possible. Committing a manifest used to
// DECLARE the stage complete, so a manifest could only land after every gate cleared, including
// the build. Requiring one AT the build would then have been unsatisfiable. `"status":
// "IN_PROGRESS"` (campaign-complete-check.mjs) lets the DoD be committed up front with its gates
// uncleared; flipping to COMPLETE is the assertion that gets gated. Author the manifest when the
// stage is planned — that is the point.
//
// SCOPE. Only `*-build.md` under Claude/Brunel/. Other artifacts there (`*-apply.md`,
// `*-holddiag.md`, dated one-off notes) are not stage builds and are deliberately untouched — the
// gate must not fire on a builder's working note.
//
// PRE-EXISTING UNGATED STAGES, recorded rather than silently grandfathered: at the time this gate
// was written, `home-shift-fix-build.md`, `mutation-anchor-uniqueness-build.md` and the three
// `one-screen-type-stageA1*-build.md` logs had no manifest. They are untouched history, so they
// only surface if one is re-committed — at which point authoring the missing manifest is right.
//
//   node tools/hooks/stage-has-manifest-check.mjs   # exit 1 if a staged build log is unbound
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { gateResults } from '../campaign/stage-gate-check.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// What counts as a stage build log. Deliberately narrow: other Brunel artifacts (`*-apply.md`,
// `*-holddiag.md`, dated one-off notes) are working notes, not stage builds, and firing on those
// would make the gate noise — a noisy gate gets switched off.
export const BUILD_LOG_RX = /^Claude\/Brunel\/.+-build\.md$/;

// Build logs staged in this commit, as repo-relative POSIX paths.
export function stagedBuildLogs(repoRoot = ROOT) {
  let out = '';
  try { out = execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: repoRoot, encoding: 'utf8' }); }
  catch { return []; }                              // fail OPEN: no diff readable is not a violation
  return out.split('\n').map((s) => s.trim()).filter((f) => BUILD_LOG_RX.test(f));
}

// Every manifest that declares a `build` gate, with its parsed body and that gate's glob.
// A manifest that fails to parse is skipped — it cannot bind anything, which is the safe
// direction: an unparseable manifest must not silently satisfy the requirement.
export function manifestsWithBuildGlobs(repoRoot = ROOT) {
  const dir = join(repoRoot, 'Claude', 'Campaigns');
  let names;
  try { names = readdirSync(dir); } catch { return []; }
  const out = [];
  for (const n of names) {
    if (!n.endsWith('.json')) continue;
    let m;
    try { m = JSON.parse(readFileSync(join(dir, n), 'utf8')); } catch { continue; }
    for (const g of m.gates || []) {
      if (g && g.gate === 'build' && typeof g.verdictArtifactGlob === 'string') {
        out.push({ path: 'Claude/Campaigns/' + n, manifest: m, glob: g.verdictArtifactGlob });
      }
    }
  }
  return out;
}

// Every `build`-gate glob declared by any manifest, as repo-relative POSIX patterns.
export function buildGlobs(repoRoot = ROOT) {
  return manifestsWithBuildGlobs(repoRoot).map(({ path, glob }) => ({ manifest: path, glob }));
}

// Same glob semantics as stage-gate-check.mjs: `*` is a wildcard, `.` is literal, anchored, and
// only the BASENAME is wildcarded (the directory is compared literally) — so a glob for one
// campaign cannot accidentally claim another campaign's build log.
function globMatches(glob, file) {
  if (dirname(glob) !== dirname(file)) return false;
  const rx = new RegExp('^' + basename(glob).replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$');
  return rx.test(basename(file));
}

// Gates that must be CLEARED BEFORE a build log may land.
//
// ⚠️ `adversary` IS a pre-build gate, and reading it as a post-build one cost a real out-of-order
// run. `SCHEME.md` is explicit: "Loki and Poirot are the seats that must be cleared to proceed —
// **Loki against a ratified promise BEFORE work is built on it**, Poirot against the code before it
// ships." Loki's own spec names its moments the same way: before a campaign opens, **before a
// flagship rung builds**, on any ratified promise shaped like "and then it works."
//
// The mistake that earned this line: a campaign manifest lists its gates in a fixed order for
// READABILITY — plan-review, red-suite, build, code-review, coverage-audit, adversary — and that
// list was mistaken for the sequence. It is a definition-of-done checklist, not an ordering. The
// de-clone Stage 2 build ran with its adversary gate unstruck because the dispatcher took the order
// off the manifest instead of off the scheme. Encoding it here means the manifest's presentation can
// never again be read as its order.
//
// So: plan-review, red-suite and adversary precede the build. code-review and coverage-audit judge
// the built code and cannot exist yet.
//
// WHY THIS HALF EXISTS. Requiring a manifest stops a stage having no gate list, but a manifest
// alone does not stop a stage being BUILT before its review — campaign-complete-check only fires
// when the manifest is flipped to COMPLETE, which is after the fact. Stage A1b was one dispatch
// away from being built on a plan section that had never been reviewed, under a header claiming it
// had been (Charpy F1). The review then returned TEMPER with six Structural findings, one of them
// that the stage's central premise was false against the very probe the user's decision
// incorporates. Building first would have meant building the wrong thing and discovering it in
// code review — the expensive place. "Review before build" is an ORDER, and orders are checkable.
export const PRE_BUILD_GATES = ['plan-review', 'red-suite', 'adversary'];

// For each staged build log, the manifest binding it and any pre-build gate not yet cleared.
export function unclearedPreBuildGates(repoRoot = ROOT, logs = null) {
  const manifests = manifestsWithBuildGlobs(repoRoot);
  const out = [];
  for (const f of (logs ?? stagedBuildLogs(repoRoot)).filter((x) => BUILD_LOG_RX.test(x))) {
    for (const { path, manifest, glob } of manifests) {
      if (!globMatches(glob, f)) continue;
      const results = gateResults(manifest, repoRoot);
      const blocking = results.filter((r) => PRE_BUILD_GATES.includes(r.gate) && !r.ok);
      if (blocking.length) out.push({ log: f, manifest: path, blocking });
    }
  }
  return out;
}

// Staged build logs with no manifest binding them. Data, so a test can assert it.
// ⚠️ The scope filter is applied HERE, not only in stagedBuildLogs. It first lived only in the
// git-staging path, so an injected list bypassed it entirely — the scope rule was a property of
// where the list came from rather than of the rule itself, and the test asserting scope could
// never have held. Filtering here makes it intrinsic for every caller.
export function unboundBuildLogs(repoRoot = ROOT, logs = null) {
  const globs = buildGlobs(repoRoot);
  return (logs ?? stagedBuildLogs(repoRoot))
    .filter((f) => BUILD_LOG_RX.test(f))
    .filter((f) => !globs.some((g) => globMatches(g.glob, f)));
}

function main() {
  const unbound = unboundBuildLogs();
  if (unbound.length === 0) {
    // Bound — now check the ORDER: the gates that precede a build must already be cleared.
    const early = unclearedPreBuildGates();
    if (early.length === 0) return 0;
    console.error('✗ stage-has-manifest FAILED — a stage is being BUILT before the gates that precede it are cleared:');
    for (const e of early) {
      console.error('  — ' + e.log + '   (' + e.manifest + ')');
      for (const b of e.blocking) console.error('      ✗ ' + b.gate + ' [' + b.owner + '] — ' + b.status);
    }
    console.error('');
    console.error('  The scheme\'s order is plan-review → red-suite → build. Building first means building the');
    console.error('  wrong thing and finding out in code review, the expensive place. Stage A1b was one dispatch');
    console.error('  from exactly that: its plan section had never been reviewed, under a header claiming it had,');
    console.error('  and the review then returned TEMPER with six Structural findings.');
    console.error('  Clear the gate above, or record an explicit `"waived": {"reason": "..."}` on it.');
    return 1;
  }
  console.error('✗ stage-has-manifest FAILED — a stage build log is being committed with no campaign manifest binding it:');
  for (const f of unbound) console.error('  — ' + f);
  console.error('');
  console.error('  A manifest IS the stage\'s gate list. Without one, every gate is optional by default and');
  console.error('  skipping one leaves no trace — that is how Stage A1b reached the build queue never having');
  console.error('  been plan-reviewed, while the plan header still claimed it was reviewed.');
  console.error('');
  console.error('  Add Claude/Campaigns/<campaign>.json with a `build` gate whose verdictArtifactGlob matches');
  console.error('  the file above, listing every gate this stage owes (plan-review, red-suite, build,');
  console.error('  code-review, coverage-audit, adversary). Commit it with "status": "IN_PROGRESS" — that is');
  console.error('  legal with gates uncleared, and campaign-complete-check enforces them when you flip it to');
  console.error('  COMPLETE. Model: Claude/Campaigns/swipe-stage6i.json.');
  return 1;
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) process.exit(main());
