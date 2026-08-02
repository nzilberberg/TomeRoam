#!/usr/bin/env node
// revert-cites-evidence.mjs — commit-msg gate: a revert of APP CODE must state its evidence basis.
//
// THE INCIDENT (2026-08-01). A device report arrived as three screenshots: "Books arrives empty".
// I inferred the cause from *"it appeared after the de-clone shipped"*, reverted eight hours of
// fully reviewed work, pushed, and reported it fixed. The symptom reproduced on the reverted build.
// The device log — one command away the whole time (`node tools/tail-log.mjs --reports`) — named the
// real mechanism in one line, and the failing gesture was distinguishable from five successful ones
// in the same six-second burst by a single field.
//
// The revert commit's own message is the artifact that shows the mistake: it cites screenshots and
// a build number, and NOWHERE states what evidence established causation — because there wasn't
// any. Correlation with a deploy is a hypothesis with a sample size of one, and it is the most
// expensive kind to act on, since acting means discarding work a later reading may exonerate.
//
// THE RULE. If the commit is a revert (subject matches `Revert "…"` or begins "Revert ") and it
// touches app code (js/ or css/), the message must state its evidence basis. Any one of:
//   * a device-log citation — a `HH:MM:SS.mmm` timestamp, or the words "device log"/"log line"
//   * a named artifact — a Claude/ path, a probe, a reproduction
//   * an explicit negative declaration — "no device log", "no log available", "reverting without
//     log evidence" — which is allowed, because sometimes that IS the honest position and saying so
//     out loud is the point.
//
// The gate does not judge whether the evidence is GOOD. It forces the author to answer "on what
// basis?" at the moment the answer is cheapest and the omission most costly.
//
// ⚠️ SCOPE IS APP CODE ONLY. Reverting a doc, a plan, a test or a tool is routine and carries none
// of this risk; gating those would make the check noise, and a noisy gate gets switched off.
//
// ⛔ HONEST RESIDUAL. `git revert --no-edit` fires NO hooks at all (measured directly: a plain
// `git commit` in the same repo fires both pre-commit and commit-msg, a `--no-edit` revert fires
// neither). So this catches the `--no-commit` + `git commit` workflow — which is the one actually
// used here, and the one that produced the incident — and cannot see a one-shot `--no-edit` revert.
// See tools/hooks/pre-push and revert-keeps-records.mjs for the same measured limitation.
//
//   node tools/hooks/revert-cites-evidence.mjs <commit-msg-file>
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Subject line = first non-blank, non-comment line.
export function subjectOf(text) {
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    return line;
  }
  return '';
}

export const isRevert = (text) => /^Revert\b/i.test(subjectOf(text));

// Does the message state an evidence basis for the DEVICE OBSERVATION?
//
// ⚠️ TIGHTENED AFTER FAILING ON THE REAL ARTIFACT. The first version also accepted a `Claude/…`
// path or the word "repro". Run against the actual incident commit (`0474185`) it returned TRUE —
// because that message names the persona artifacts it is preserving, while citing no evidence
// whatsoever for its causal claim. Naming an artifact is not citing evidence about what the device
// did, and a gate that accepts it passes the exact commit it exists to stop. Only a log citation,
// or an explicit admission that there is none, counts.
export function citesEvidence(text) {
  const t = String(text || '');
  return /\b\d{1,2}:\d{2}:\d{2}\.\d{3}\b/.test(t)             // a log timestamp
    || /device log|log line|log shows|from the log|tail-log|log names|the log said/i.test(t)
    || /no (device )?log|without (the )?log|no log evidence|log unavailable/i.test(t); // honest no
}

export function stagedAppCode(cwd = ROOT) {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACMD', { cwd, encoding: 'utf8' })
      .split('\n').map((s) => s.trim())
      .filter((f) => /^(js|css)\//.test(f));
  } catch { return []; }                                      // fail OPEN
}

// null = allow; string = blocking reason.
export function check(text, cwd = ROOT) {
  if (!isRevert(text)) return null;
  const app = stagedAppCode(cwd);
  if (app.length === 0) return null;                          // not app code — routine, not gated
  if (citesEvidence(text)) return null;
  return [
    '✗ revert-cites-evidence FAILED — this reverts APP CODE without stating an evidence basis:',
    ...app.slice(0, 8).map((f) => '    ' + f),
    '',
    '  On 2026-08-01 a revert was made because a symptom "appeared after the change shipped".',
    '  That is correlation with a sample size of one. Eight hours of reviewed work were discarded,',
    '  and the symptom reproduced on the reverted build. The device log named the real mechanism in',
    '  one line and had been one command away the whole time.',
    '',
    '  Get the log first:   node tools/tail-log.mjs --reports',
    '  Then compare the FAILING event against SUCCEEDING events of the same kind in the same',
    '  session — the discriminator is usually a single field.',
    '',
    '  Then say the basis in this message: a log timestamp, a filed Claude/ artifact, a',
    '  reproduction — or, if you genuinely have none, say "no device log" out loud. That is a',
    '  legitimate answer and this gate accepts it. What it will not accept is silence.',
  ].join('\n');
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isCli) {
  let text = '';
  try { text = readFileSync(process.argv[2], 'utf8'); } catch { process.exit(0); }   // fail OPEN
  const reason = check(text);
  if (reason) { console.error(reason); process.exit(1); }
  process.exit(0);
}
