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

// Every `build`-gate glob declared by any manifest, as repo-relative POSIX patterns.
export function buildGlobs(repoRoot = ROOT) {
  const dir = join(repoRoot, 'Claude', 'Campaigns');
  let names;
  try { names = readdirSync(dir); } catch { return []; }
  const globs = [];
  for (const n of names) {
    if (!n.endsWith('.json')) continue;
    let m;
    try { m = JSON.parse(readFileSync(join(dir, n), 'utf8')); } catch { continue; }
    for (const g of m.gates || []) {
      if (g && g.gate === 'build' && typeof g.verdictArtifactGlob === 'string') {
        globs.push({ manifest: 'Claude/Campaigns/' + n, glob: g.verdictArtifactGlob });
      }
    }
  }
  return globs;
}

// Same glob semantics as stage-gate-check.mjs: `*` is a wildcard, `.` is literal, anchored, and
// only the BASENAME is wildcarded (the directory is compared literally) — so a glob for one
// campaign cannot accidentally claim another campaign's build log.
function globMatches(glob, file) {
  if (dirname(glob) !== dirname(file)) return false;
  const rx = new RegExp('^' + basename(glob).replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$');
  return rx.test(basename(file));
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
  if (unbound.length === 0) return 0;
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
