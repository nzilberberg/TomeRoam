<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":false,"callee_replacement":false,"contract_shape":false},"project_adapter":"tomeroam-js-dom","source_ranges":["css/app.css:103-127"],"callee_ranges":[]} -->

<!-- NOTE: source_ranges holds only the single production change site (css/app.css). The plan
     relocates no code and replaces no callee (both false above), so no ownership ledger is owed.
     js/app.js and js/nav.js were READ for verification, not changed as code. -->

Type: plan-review

# Charpy — PLAN-swipe-stage6g r2 (keep `#home` a stable compositing layer through the reveal)

Target: `Claude/Plans/PLAN-swipe-stage6g.md`, frozen at git HEAD **97cc5aa** (r2: TEMPER-close of F1/F2).
Prior review: `Claude/Charpy/PLAN-swipe-stage6g-331f5f1.md` (TEMPER). Reviewed: 2026-07-27. Read-only.

## Applicability

- **defining_records: true** — same seven records as r1; the reconciliation is unchanged in substance
  and only the promise wording tightened. Confirmed in `## Defining records`.
- **boundary_relocation: false** — one CSS declaration replaced in place; no ownership seam. No ledger owed.
- **callee_replacement: false** — no indirection replaces a callee. Pure CSS + a comment scrub.
- **contract_shape: false** — no schema changes.

Project adapter `tomeroam-js-dom`: no `d.<field>` crossing, no `document.body.classList` mutation, no
callee `classList` token, no contract key set is introduced — the adapter has no live subject on a
pure-CSS + comment slice, verified.

## The claim (unchanged since r1, re-confirmed)

Replace the live `.256` diagnostic probe (`css/app.css:115`, `#home { will-change: transform; }`) with a
permanent production rule `#home { transform: translateZ(0); }`. `#home` keeps a real, layer-promoting
transform across the parked↔un-parked cascade, so removing `.parked` at a reveal cannot demote `#home`'s
compositing layer — the `.256`-device-confirmed mechanism of the home→books **abort** flash. NEW POLICY
(EC §4.19), scoped to `#home`. Pure CSS; one comment scrubbed; PROMO (source-text gate) + REVEAL
(integration) cells; the flash is device-verified, not CI-verified.

The r1 verdict (TEMPER) verified the fix itself sound — the CSS form, stylesheet-not-inline compatibility
with I5/6f, containing-block safety, and the two design decisions. None of that changed in r2; only the
promise wording was tightened. I re-checked that nothing in the tightening regressed a previously-verified
element, and it did not.

## Defining records

**AGREE.** The record set is unchanged from r1 and reconciles cleanly; the r2 edits touched only the
promise's scope wording (F1) and a stale citation (F2). No new conflict introduced.

## Verdict

**FORGE.** Both blocking findings from r1 are genuinely closed. F1's load-bearing promise (§3) is now
correctly scoped to the un-park/reveal transition, explicitly disavows the false absolute, and hands the
`nav-in` animation path to a blind Loki as an accounted-for benign non-reveal path — so the adversary can
neither false-clear (it verifies the correct reveal-scoped promise) nor bounce on the animation frame (it
is pre-declared out of scope). All the r1-named siblings were swept. F2's stale `364` citation is gone.
One residual (F3, Weak) remains — a loose absolute intensifier in the §2 scope-description — but it does
not re-open the blocking harm: the load-bearing artifact and the Loki handoff are correct, and the
sentence's operative conclusion is already reveal-scoped. Build it; F3 is a wording tighten, not a gate.

## Findings

### F1 — Note (defect) — [CLOSED at 97cc5aa] The §3 promise is now correctly scoped and the nav-in path is handed to Loki as accounted-benign

Struck against HEAD 97cc5aa, verified closed:

- **Promise re-scoped (no residual absolute in the promise itself).** §3 (109-116) now reads: *"No
  un-park / REVEAL transition … leaves `#home` on `transform: none`. The base `translateZ(0)` holds across
  the parked↔un-parked cascade."* The old "impossible by construction / non-none in every state" is gone
  from the promise. §3 (118-128) explicitly states *"The promise is NOT 'non-none in every state' — that
  absolute is false, and stating it would mis-aim the blind Loki,"* and the Basis (130-136) frames
  certification as *"epistemic, not absolute."* Correct calibration (D4).
- **nav-in path handled so a blind strike neither false-clears nor bounces.** The concrete reachable path
  I raised in r1 — `goBack()` (app.js:151, unconditional) / `navTo(…,anim)` (app.js:144) →
  `slideInView(#home)` → `.nav-in-left`/`.nav-in-right` keyframes (app.css:123-124) ending at
  `to { transform: none }`, fill-`both`, reverting to `translateZ(0)` at `animationend` (nav.js:151) — is
  now named in §3 (119-128) and handed to Loki explicitly (148-152): *"A strike that lands on the nav-in
  end frame has found the accounted-for benign path, not a fracture of the reveal promise."* The fracture
  set (138-146) is correctly reveal-scoped: (a) an inline `none` write at the reveal, (b) a more-specific
  static rule — verified against HEAD that neither exists (only inline writes on `#home` are
  `translateX(...)` and `''`; no un-parked `#home` rule sets `none`). This is the precise handoff that
  prevents both bad gate outcomes.
- **All r1-named siblings swept — each re-scoped, none still asserting the absolute:**
  - §1 js/app.js row (54): carves out the nav-in path (*"benign, non-reveal — §3"*). ✓
  - §4 (198-203): *"cannot demote on the reveal path … The guarantee is over the un-park cascade only; a
    nav-in slide animation still drives `#home` to `none` transiently … benign, non-reveal."* ✓
  - §5 HOLD/MUTATE (225-231): scoped to parked→drag→un-park, with an explicit *"Exception, out of scope:
    a nav-in slide animation drives the transform to `none` at its end frame."* ✓
  - §7 Composition (273): now **four** states, the fourth being the nav-in animation, *"which DOES resolve
    to `none` at its end frame but is a benign non-reveal path."* ✓ (My r1 step 4, "four states not three,"
    is done.)
  - §8 PROMO (288): scoped to *"the STATIC `#home` rule cascade `{#home, #home.parked}`"* with *"it does
    NOT cover transient animation-added classes like nav-in, which are non-reveal and out of scope."* ✓

### F2 — Note (defect) — [CLOSED at 97cc5aa] The stale "364" citation is dropped

Grep of the plan for `364` returns nothing. The js/app.js references now read `552-554` in §1 (54),
§2 (81), and §9 (306). At HEAD the "no-promotion / navbar-pop" warning lives only at `js/app.js:552-554`
(364 is `disposeOwnedPanes`), so the plan now cites the correct and sole scrub target. Closed.

### F3 — Weak (defect) — §2's "persistent non-`none` value at all times" is a residual absolute intensifier that contradicts §3's carve-out

§2 (76) still reads: *"`#home`'s computed `transform` is a persistent non-`none` value **at all times** —
`translateX(-101vw)` while parked …, `translateZ(0)` when un-parked … — so there is no reveal path on
which it becomes `none`."* The phrase "at all times" is the old unconditional intensifier; §3 (118, 135)
now explicitly states that absolute is false because the `nav-in` animation resolves `#home` to `none` at
its end frame. Read literally, §2 and §3 disagree (StandardsDocument §7: a contradiction must be resolved,
not both kept).

**Why Weak, not blocking.** The sentence describes the *net effect of the static `#home` rule cascade*
and enumerates only the two static states (parked/un-parked); its operative conclusion — *"no reveal path
on which it becomes `none`"* — is already correctly reveal-scoped and true. The load-bearing promise (§3),
the Loki handoff, and the coverage cells are all correct, so the r1 blocking harm (a blind Loki
false-clearing or bouncing) does not re-open through this sentence — Loki is handed §3, not §2. The
residual is a doc-consistency imprecision in a scope-description line, not a defect the build or the gate
inherits.

**Recommended tighten (non-blocking, next touch / maker discretion).** Replace "at all times" with a
static-cascade qualifier, e.g. *"a persistent non-`none` value across the static `#home` cascade"* — so §2
matches §3's carve-out and no section reads as an unconditional guarantee. Not a re-plan; a five-word edit.

## Coverage — blocking findings

**None.** F1 and F2 are closed; F3 is Weak (non-blocking). The verdict FORGE rests on: the CSS fix
verified sound in r1 (unchanged), the promise now correctly reveal-scoped, the nav-in path handed to Loki
as accounted-benign, and the PROMO/REVEAL cells intact and correctly scoped. The one open item, F3, is a
wording tighten with no execution, gate, or coverage dependency.

## Prediction (where it goes from here if built as written)

Built as written, the CSS ships and the confirmed abort flash goes clean on device — the fix will not
fail. The one thing a downstream reader could stumble on is F3: a reader who quotes §2's "at all times" in
isolation, without §3's carve-out, could mis-state the guarantee as unconditional. That is a records-clarity
snag, not an execution failure — §3 is authoritative and §2's own conclusion is reveal-scoped. The Loki
gate now has exactly what it needs: a correctly-scoped promise plus the pre-declared benign path, so its
strike lands on the reveal cascade, not the animation frame.

---

Verdict: **FORGE**
