# Plan review — PLAN-swipe-declone.md, Stage 2 (`browse→browse`), round 2

Type: plan-review
Plan: `Claude/Plans/PLAN-swipe-declone.md` — Stage 2 reworked at `735601d`, status "REWORKED after plan review, not reviewed in its reworked form"
Scope: **the rework only.** Stage 1 is shipped and device-confirmed and is not re-opened. Stage A2 and Stage B are separate tracked stages and are not reviewed.
Round: 2
Reviewed at: HEAD `41f2933` (the brief named `735601d`; `41f2933` landed the two cross-plan record reconciliations and touched no `js/`, `css/` or plan text), build `2026-07-31.290`, tree clean
Date: 2026-08-01

<!-- charpy-gate {"review_type":"plan-review","patterns":{"defining_records":true,"boundary_relocation":true,"callee_replacement":true,"contract_shape":true},"project_adapter":"tomeroam-js-dom","source_ranges":["css/app.css:78-91","css/app.css:92-132","css/app.css:172-191","css/app.css:805-814","js/browse.js:60-90","js/browse.js:200-265","js/browse.js:267-319","js/browse.js:480-547","js/browse.js:637-662","js/nav.js:34-42","js/nav.js:104-110","js/app.js:536-556","js/app.js:585-620","js/swipe.js:146-205","js/swipe.js:354-406","js/scrollbar.js:41-62","js/virtuallist.js:240-262"],"callee_ranges":["js/swipe.js:222-261","js/swipe.js:276-333"]} -->

## Applicability

- **defining_records: true** — the rework declares two cross-plan conflicts and re-reconciles five
  ratified records. Both declarations are honest; both have since been discharged. §*Defining records*.
- **boundary_relocation: true** — the browse scroll box relocates from `#browse` to each `.browsepage`,
  taking the virtual controller's measured element with it. Ledger below. Declared ranges cover the
  container/scroller split, the entry-position rule, the reset, the mover resolution and the CSS.
- **callee_replacement: true** — `ghostApp` and its clone-fidelity cluster are retired. Declared ranges
  `js/swipe.js:222-261` and `:276-333`, matching the plan's own declaration. Callee behaviour below.
- **contract_shape: true** — `capture` is removed from `buildConstruction`'s return, `outgoing` collapses
  to one value and `finalizationPlanFor` is deleted. Exact-key gate impact below.

## Verdict

Verdict: TEMPER — the reworked **CSS** mechanism is sound and I measured its central claim true, but the
**JavaScript** half of `browse→browse` was not reworked with it. As written, Stage 2 resolves both
`browse→browse` movers to the same element (`#browse`), and the part A / part B split puts the device
gate on a form that does not ship. Two Structural findings, both in `js/swipe.js` / `js/app.js`
resolution and sequencing; neither touches the CSS mechanism, which should be built as written.

**What survives the strike, and it is most of the rework.** All five round-1 Structural findings are
genuinely resolved, not papered over. I measured the load-bearing claims rather than reasoning about
them, on the real-engine instrument the plan itself designates (`chrome --headless=new`, viewport
744px tall, `--safe-top: 59px`, `--nav-h: 54px`, `--nav-pad: 0`):

| Claim | Measured |
|---|---|
| A transform on `#browse` cannot move an `inset: 0` absolutely-positioned page | **Confirmed.** With `#browse` at `translateX(-37px)`: page `top` delta **0**, height delta **0**, `left` delta −37 — it travels with `#browse` and its box does not resolve anew. The containing block does not flip because it never changes. |
| The parked and active `.browsepage` boxes are identical under the reworked park rule | **Confirmed, three ways.** Border-box height delta **0**, `clientHeight` delta **0**, `scrollHeight` delta **0** (580 / 580 / 4054 both states). This is step 10a's first half, already reading zero. |
| An off-viewport absolutely-positioned mover does not extend `scrollingElement.scrollWidth` | **Confirmed** at `translateX(+innerWidth)` and at `translateX(-101vw)`: 526 → 526 → 526. R2b's first half is answered; the "paints outside the viewport" half is not, and remains owed. |
| The A–Z strip's containing rectangle is vertically unchanged on the new `browse→browse` case | **Confirmed.** Strip under a `#browse` transform (`→home`, ships today) and under a page transform (`browse→browse`, new): `top=235`, `height=385` in **both**. Horizontally they differ by one scrollbar gutter — see F14. |
| A `position: fixed` page would be re-contained and jump | **Confirmed in direction, wrong in magnitude.** Measured `top +110`, `bottom −54`, **height loss 164px** — not the 328px the plan derives. See F13. |

The role split (F3), the park re-derivation (F4), the entry-rule inversion (F7) and the citation
re-derivation (F8) are each correct against HEAD, and the three findings the rework made on its own are
all real. The defect is not in what the rework decided; it is in the half of `browse→browse` it did not
carry across.

---

## Defining records

| Record | Standing | Reconciliation |
|---|---|---|
| `PLAN-swipe-declone.md` §5.1/§5.2 (the two `browse→browse` movers are the two `.browsepage` nodes) vs §6 and §10 (`outgoing: 'real-source'`, `renderDestination: 'browse-host'`, and `appViewEl('books')` still returns `#browse`) | Both governing, same document | **CONFLICT, material and unresolved.** §5.2:220 states "for `browse→browse` both movers are children of the same `#browse` box"; §10:563 states the post-rework outgoing resolution returns `#browse` itself. Only one can be true, and nothing in the plan changes the resolution. This is F11 — the same class as round-1 F1, relocated from the CSS half to the JS half. |
| `js/app.js:541` (`sourceEl`), `js/app.js:544` (`renderDestination` browse-host branch), `js/nav.js:36` (`appViewEl`), `js/swipe.js:354-406` (`buildConstruction`'s mover resolution) | HEAD source, read directly | **CONFLICT with §5.1**, and the proof for F11. Both resolutions return `d.byId('browse')` for a `browse→browse` pair. |
| `Claude/Decisions/DecisionLog.md:1066-1113` — Stage 1's outcome record forecasting a `position: fixed` `.browsepage` | Ratified outcome record | **Declaration HONEST, and now discharged.** The forecast does say "its own fixed inset own-scroll box". The rework's characterisation — Invariant D4 (a page owns its scroll offset natively) untouched, only the positioning scheme changed, and the entry is Stage 1's outcome record rather than a Stage 2 ratification — is a fair reading of that text. The user superseded it in place at `41f2933`. |
| `PLAN-one-screen-type.md:1967-1976` — items 2 and 3 of "how the two plans interact" | Ratified claim | **Declaration HONEST, and now discharged.** Verified against the pre-scrub text at `735601d`: item 3 did say "Stage 2's `#browse` → `display: contents` change" and "dissolves the host". Two precision defects, neither material: item **2** never named the mechanism (it names `js/swipe.js:167`/`:203` and is unaffected), so "items 2 and 3" over-scopes by one; and item 3 also said "its own **fixed** inset own-scroll box", a second falsified claim the declaration did not name. The user's scrub at `41f2933` corrected both. See F16. |
| `css/app.css:98-126` — `#home.parked`'s Invariant P, device- and Blink-measured | Ratified | **AGREE.** The rework extends P to `.browsepage.parked` rather than maintaining a second park geometry, and I measured the resulting equality at zero on three axes. `overflow: hidden` is retained on both recorded grounds. Round-1 F4 is discharged. |
| `css/app.css:172-183` — `#browse` deliberately carries no `will-change`/non-none transform; the `.195`/`.196` A–Z regression | Ratified source comments, gated by `BROWSEFIXED` | **AGREE, and now load-bearing in the other direction.** The rework depends on `#browse` keeping `position: fixed` *and* declaring no persistent transform; `BROWSEFIXED` survives with one assertion migrated. Correct. |
| `PLAN-one-screen-type.md:863-873` (§5.5 — the containment argument, Stage A2's stated ground) | Ratified | **AGREE, restored.** Round-1 F2 was conditional on `#browse` losing its box. A `position: fixed` `#browse` carrying an inline transform does establish a stacking context, so §5.5 is true again and A2 loses no premise. Correctly dissolved. |
| `test/scroll-writer-set.test.js:169-205` — the M1WRITERSET registered baseline | Live gate | **AGREE with the rework's finding.** Verified: entries 3 and 4 are keyed on the source text `o.mount.scrollTop = clampY(` and `scrollTo: (y) => { o.mount.scrollTop = y; },`, both of which Stage 2 rewrites; entry 6's registered `why` says "whose nearest scroll container is `#browse`", which Stage 2 falsifies. The rot check fires on 3 and 4; 6 is invisible to it and must be corrected by hand. Real. |
| `js/nav.js:104-110` — `resetSwipeStyles` | HEAD source | **AGREE with the rework's finding.** Verified: the element set is the literal id list `['home','browse','options','nowplaying',...SETTINGS_SUBS]` plus `#navbar .np-actions`; `js/browse.js:494-495` sets `page.className = 'browsepage'` and nothing else. An interrupted `browse→browse` would strand a page. Real. |
| `js/swipe.js:212`, `js/app.js:540` — `env.scrollY` | HEAD source | **AGREE with the rework's finding.** Verified: the only occurrence of `env.scrollY` in `js/swipe.js` is the module comment at `:212`; no builder reads it (`ghostApp` reads `doc.getElementById('browse').scrollTop` at `:324`, not `env.scrollY`). The producer stands unread at `js/app.js:540`. Real, and §10's prior claim was false at HEAD as the rework says. |
| `js/swipe.js:324` — `ghostApp` reads `#browse.scrollTop` for its `translateY(-ghostY)` compensation | HEAD source | **GAP against §13's part A / part B split.** Part A stops `#browse` being a scroller; the still-live clone then reads 0. Nothing in the plan reconciles the intermediate state. This is F12. |

---

## Value and ownership ledger

Every value crossing the relocated boundary, with its owner after Stage 2. **UNOWNED** rows are the
findings.

| Value | Class | Dir | Producer | Consumer | Owner after Stage 2 | Lifecycle | Verification |
|---|---|---|---|---|---|---|---|
| the `browse→browse` outgoing mover element | identity | out | `env.sourceEl` (`js/app.js:541`) → `Nav.appViewEl` (`js/nav.js:36`) | `buildConstruction`'s outgoing branch (`js/swipe.js:376`), then the drag transform writes (`js/app.js:594`, `:615`, `:654`) | **UNOWNED — F11.** Resolves to `#browse`, the same node the incoming resolves to. | F11 |
| the `browse→browse` incoming mover element | identity | out | `env.renderDestination(dest,'browse-host')` (`js/app.js:544`) | `buildConstruction`'s incoming line (`js/swipe.js:383`) | **UNOWNED — F11.** Returns `$('browse')` literally. | F11 |
| browse page scroll offset across a `display: none` round trip | geometry | inout | the page element's own scrolling box | `positionOnEnter` writing nothing on re-entry (§5.3.4) | the `.browsepage` element, **contingent on the engine preserving it** | page-element lifetime, bounded by `MAX_PAGES = 12` and `clearCache()` | **F15 — open-unknown.** Measured retained in Blink; unobserved on WebKit by any cell or device row. |
| the browse *container* role — append target, `innerHTML` wipe target, `.hidden` carrier | identity | — | `Nav.setView` (`js/nav.js:69`), `Browse.render` | `js/browse.js:80`, `:204`, `:497` | `o.mount` (`#browse`), **retained, not re-pointed** | session | Verified: all three call sites are untouched by the rework. Round-1 F3 discharged. |
| the browse *scroller* role — `scrollTop`, `clientHeight`, rects | geometry | inout | the page element | `js/browse.js:228`, `:252`, `:654-658` | the `.browsepage` element | page lifetime | PAGEOWNSSCROLL. Verified: `virtualView(m, list, …)` already carries `m` as its first parameter and `m._vctl = ctl`, so the per-controller element is in scope with no new injected field. |
| per-controller measured element | identity | in | `virtualView` per page | `captureAnchor` (`js/virtuallist.js:247-250`), `_realize` | the page that controller was built for | controller lifetime | Verified: with `m` closed over, `showPage`'s deactivate loop (`js/browse.js:286-291`) cannot mis-target. Round-1 F3's quiet half closed by construction. |
| parked-page box geometry | geometry | inout | the `.browsepage` base rule cascading into the parked rule | Blink's scroll-anchoring machinery at un-park | the base rule (Invariant P) | gesture-scoped | **Measured 0 on three axes.** Round-1 F4 discharged; step 10a's remaining half is the reveal delta. |
| the scroll surface identity the indicator keys on | identity | out | the scroll event target | `js/scrollbar.js:50` (`t.id === 'browse'`) | the `.browsepage` element | per scroll event | **F17** — the fix is specified but no step performs it. |
| the scrollbar gutter reserved by the new scroller | geometry | out | the `.browsepage` scrolling box | `.alphaindex`'s containing block; the page's content box | the native-scrollbar suppression at `css:811-814` | permanent | **F14** — §5.3.2's and §5.4's equality claims are conditional on this and do not say so. |
| `d.byId` (`js/nav.js:34-42`) | resource | in | `Nav` init | `appViewEl`, `overlayEl`, `viewElFor`, `setView` | unchanged as a lookup | session | Verified. F11 concerns which element it is *asked for*, not the lookup. |
| `d.browseWillHide` (`js/nav.js:60`), `d.isSignedIn` (`:78`), `d.updatePlayerUI` (`:79`) | resource | in | `Nav` init | `setView` | unchanged | session | Verified untouched; §10's dispositions hold. |
| `document.body.classList` token `np-locked` | behavior | inout | `js/app.js:551` (NP render branch), `js/nav.js:72` (`setView`) | the navbar button/pill CSS swap | unchanged — Stage 2 touches no NP path | per NP transition | Verified against both write sites; §10's "UNTOUCHED" holds. |
| inline swipe styling on a `.browsepage` mover | behavior | inout | the drag transform writes | `Nav.resetSwipeStyles`, the settle clear (`js/app.js:816`) | `resetSwipeStyles`, widened | drag start → next `applyScreen` | RESETCOVERSPAGES. Verified the gap is real. |

---

## Callee behaviour — the retired `ghostApp` cluster

Re-checked against the declared ranges, and my round-1 F9 conclusion is unchanged. In
`js/swipe.js:222-261` and `:276-333` the only live-element write is `wrap.className = 'nav-ghost'` on the
builder's **own** newly created wrapper; every other mutation targets the detached clone
(`removeAttribute('id')` ×1 at `:312`, `removeAttribute('data-art')` at `:222`, and the `.hidden, .parked`,
`.alphaindex` and `.carousel` selector sweeps). There is **no `classList` mutation on a live element** and
**no `d.<field>` write** in either range, so retiring the callee assigns no orphaned class or session-state
effect. The one pre-mount data-attribute effect is `data-art`, and §8 assigns it correctly. §8's eleventh
row — the wrapper's clipping and z-order — remains the one effect replaced by an argument rather than a
mechanism, and R2b is the right place for it; its scrollWidth half now measures clean.

## Contract shape

Re-verified against HEAD and I found no defect. `finalizationPlanFor`'s `CONTRACT` registration is at
`test/contract-function-gate.test.js:33` with `keys: ['abortRender']` and must be removed with the
function in the same commit; `buildConstruction`'s `NON_CONTRACT` registration begins at `:42` and is
prose-only, so removing the `capture` key does not trip the **exact-key** gate and the registration's
reason text stays accurate. `constructionPlanFor` keeps all four keys with only the `outgoing` value
domain narrowing, which the exact-key gate does not see. §6's decision to keep the collapsed `outgoing`
field is right and for the reason given. One citation defect: `finalizationPlanFor`'s export is at
`js/swipe.js:408`, not `:407` (`:407` is blank) — F16.

---

## Findings

### F11 — Structural, defect: after the `outgoing` collapse, both `browse→browse` movers resolve to `#browse`

This is the round-1 defect relocated. The rework corrected the CSS half — `#browse` keeps a
transformable box — and left the JS half asserting a resolution that does not exist.

Traced through HEAD:

- `js/swipe.js:167` — Stage 2 rewrites this to `outgoing = 'real-source'` for every pair (§12 item 7).
- `js/swipe.js:376` — `'real-source'` takes the else branch: `outgoing = mover(resolveSource(), 'borrowed-real', 'outgoing')`, and `resolveSource()` calls `env.sourceEl(sourceHost, from.v)`.
- `js/app.js:541` — `sourceEl: (host, v) => (host === 'overlay' ? overlayEl(v) : appViewEl(v))`. A browse source is not an overlay host.
- `js/nav.js:36` — `appViewEl = (v) => (v === 'home' ? d.byId('home') : d.byId('browse'))`. For `from.v === 'books'` this returns **`#browse`**.
- `js/swipe.js:383` — `incoming = mover(env.renderDestination(dest, destinationHost), 'borrowed-real', 'incoming')`.
- `js/app.js:544` — `if (host === 'browse-host') { showAppView(dest, true); return $('browse'); }` — returns **`#browse`**, literally.

Both movers are therefore the same node. `start()` writes `m.el.style.transform` only for the mover with
a non-zero `base`, and `move()` writes for every mover in list order (`js/app.js:594`, `:615`) — so the
second write wins and `#browse` translates by `base + t` with the incoming's `±w` offset. The whole browse
view slides off-screen, nothing arrives, and there is no filmstrip. This is not a paint or timing
question: it is one element in two mover slots.

The plan contradicts itself on it. §5.1 lists `browse→browse` as "real outgoing `.browsepage` / real
incoming `.browsepage`"; §5.2:220 states "for `browse→browse` both movers are children of the same
`#browse` box"; §10:563 states that after the rework `appViewEl('books')` still returns `#browse` and
calls that correct. No section of the plan — not §5.3.4 (the JavaScript change), not §6 (the contract),
not §9 (ordering), not §12 (deletions), not §13 (the steps) — changes how the two elements are resolved.

**The invariant, not the implementation.** For a `browse→browse` pair the outgoing and incoming movers
must be **two distinct `.browsepage` nodes**: the source page and the destination page. Whatever supplies
them, the two mover slots must never resolve to the same element, and the source page must be resolved
before `renderDestination` runs (§9 item 1 already requires this and it becomes load-bearing again).
**Recommendation, not a requirement, and the builder may satisfy the invariant otherwise:** `Browse`
already holds both nodes — the cache entry for `keyOf(from)` and the entry for `keyOf(dest)` — so a
browse-scoped page accessor injected into `env` is the smallest construction that does it; a
`browse-page` destination host alongside `'browse-host'` is another. The choice is the planner's. What
the plan cannot do is leave the resolution unstated while §5.1 asserts its outcome.

`MOVERHASBOX` does not catch this — it asserts that every resolvable mover host *generates a box*, which
`#browse` does. `NOGHOSTATALL` does not catch it either: it asserts no mover carries `owned-pane` and no
`capture` key, both of which are true of a construction whose two movers are the same node. A cell that
asserts the two `browse→browse` mover elements are distinct and are both `.browsepage` nodes is missing
from §14.

### F12 — Structural, defect: the part A / part B split breaks the still-live clone, and puts the device gate on a form that does not ship

§13 splits Stage 2 into part A (step 10 — the CSS relocation, the role split, the `sy` deletion, the
entry rule, the reset) and part B (step 11 — the `outgoing` collapse and the §12 deletions), with the
device gate at step 10b **between** them. Two consequences, neither recorded.

**One: part A breaks the clone it leaves running.** `ghostApp` computes its vertical compensation as
`const ghostY = doc.getElementById('browse').scrollTop || 0;` (`js/swipe.js:324`) and applies
`translateY(-ghostY)` to the clone. Part A removes `overflow-y: auto` from `#browse`, so `#browse` stops
being a scroll container and its `scrollTop` is permanently 0 — while the real scroll offset now lives on
the `.browsepage`. At step 10b the `browse→browse` clone therefore renders from the top of the list
regardless of where the user is scrolled. The device gate would report a `browse→browse` failure that is
an artifact of the split, not of the design, and the plan gives the tester no way to know that.

**Two: the mover change lands after the only device gate.** Step 10b's checklist exercises
`browse→browse` in both directions, commit and abort — but at step 10b `browse→browse` still clones, so
the gate observes the *old* mover with the *new* scroll model. The real mover change arrives at step 11,
and no step after 11 puts it in front of a device. This is the plan's own standing scar, quoted in §15:
"the form that is device-tested is the form that ships." As sequenced, the shipped form of the one
transition Stage 2 exists to change is never device-tested.

**The invariant:** no intermediate HEAD may leave a live consumer reading a scroll surface the same
commit has retired, and the device gate must run on the mover configuration that ships.
**Recommendation, not a requirement:** the two conditions are both satisfied by moving the
`outgoing`/`abortRender` collapse and the `ghostApp` deletion into part A — the §9 item 4 "one commit"
argument (two scroll authorities, a half-migrated tree) applies to the clone's `#browse.scrollTop` read
for exactly the same reason — and leaving part B as the pure subtraction of the now-dead machinery.
Splitting some other way is equally admissible provided no intermediate HEAD carries a clone that reads
a dead scroller and the device gate follows the mover change.

### F13 — Weak, defect: the derived cost of the rejected `position: fixed` route is wrong by a factor of two

§5.3.2 derives, and §18 F1a repeats, that a `position: fixed` page re-contained by a transformed
`#browse` loses height "by `2·(T + B)`" — "≈328px height loss on a notched iPhone". The top and bottom
edge derivations are correct; the height one is not.

Original height `= viewportH − T − B`. Re-contained height `= (viewportH − T − B) − T − B`. The loss is
therefore `T + B`, not `2·(T + B)`.

**Measured, not argued.** On the real-engine instrument at `viewportH = 744`, `T = 110`, `B = 54`:
rest `top=110 bottom=690 height=580`; under a transformed `#browse` `top=220 bottom=636 height=416`.
Deltas: `top +110` ✓, `bottom −54` ✓, **height loss 164px**, which is `T + B`. The published figure of
328px is twice the true one.

The conclusion is unaffected — 164px is still a disqualifying jump and `position: absolute` is still the
right choice — so this is a Weak, not a Structural. It matters because the plan advertises this
paragraph as "derived, not asserted" and the same figure is in the rework's commit message; a later
device or engine measurement of the rejected route would read 164 and the model would be doubted rather
than the arithmetic.

### F14 — Weak, defect: §5.3.2's and §5.4's geometry-equality claims are conditional on F6's scrollbar suppression, and do not say so

An absolutely-positioned descendant resolves against its containing block's **padding box**, which
excludes a reserved classic-scrollbar gutter. At HEAD the scroller is `#browse` and `css:811-814`
suppresses its native scrollbar by id. After Stage 2 the scroller is the `.browsepage`, which that
selector list does not cover (round-1 F6, folded but see F17).

**Measured.** With a classic scrollbar present on the page, the `.alphaindex` strip's containing
rectangle during a `browse→browse` drag sits at `left=454`; during the `browse→home` drag that ships
today it sits at `left=469`. Vertically the two are identical (`top=235`, `height=385` in both), exactly
as §5.4 claims. The 15px horizontal difference is the gutter.

On iOS the scrollbar is an overlay and reserves nothing, so the shipping delta is 0 — which is why this
is Weak. But §5.3.2's "a content box identical to HEAD's `#browse` content box" and §5.4's "the same
rectangle the `→home` drag already produces today" are stated unconditionally, and both are true only
while the new scroller reserves no gutter. That makes F6's CSS half a **precondition of §5.4's
derivation**, not an independent cosmetic fix, and the plan treats the two as unrelated.

Separately, §5.4's stated reason for the `→home` row being unchanged — "because `#browse` keeps the same
border box and its padding is now zero, so its padding box is the same rectangle" — is a confused
justification for a correct conclusion. `#browse` has no border, so its padding box equals its border box
whether or not it has padding; removing the padding is irrelevant to that row. Worth correcting so the
next reader does not infer that an abs child's `inset: 0` is affected by its containing block's padding.

### F15 — Weak, open-unknown: D4's native retention across `display: none` is unnamed, and no gate observes it on the shipping engine
**The decision the plan must make:** whether a `.browsepage`'s `scrollTop` survives the `display: none`
its own hide path applies, on iOS WebKit — and, if it does not, whether the `sy` deletion stands.

The rework inverts the entry rule so that `positionOnEnter` writes **nothing** for a list page (§5.3.4).
That is the correct fix for round-1 F7, and it makes engine-level retention the *only* thing positioning
a returning page. Every non-swipe re-entry path goes through `display: none`: `showPage` sets `.hidden`
on every page but one, and `Nav.setView` sets `.hidden` on `#browse` itself when you leave browse —
destroying the boxes of the whole subtree, the active page included. The project already records that a
hidden box is destroyed ("a hidden box measures zero", `js/nav.js:53-59`, `js/virtuallist.js:255-258`).

**Measured on the instrument: retention holds in Blink.** Page hidden and re-shown → `scrollTop` 500 →
500; host hidden and re-shown → 700 → 700; transform park → 900 → 900; and the HEAD-shaped host scroller
→ 600 → 600. So the expected outcome is that the assumption is true.

It is filed anyway because nothing in the plan would catch it being false on WebKit. §14's `ENTRYNOZERO`
fixture reads "leave to home and return and assert the offset is unchanged" — in jsdom `scrollTop` is a
plain settable property with no box to destroy, so that half of the cell passes on any engine behaviour.
The matrix's own claim that every cell asserts "a source fact, a class-state fact, a call-count fact or a
written-property fact — never a rendered geometry" is breached by that one clause; the legitimate,
jsdom-decidable subject of the cell is the **absence of a write**, and it should say so. Step 10b's
device checklist never names the observation either.

**Recommendation, not a requirement:** name the assumption in §15 as its own device row, and add one line
to step 10b — scroll a long browse list, go to Home, return, confirm the position is where you left it.
Both the mechanism and the fixture wording, not just the checklist, need the correction.

### F16 — Note, defect: three small citation and scoping defects in the reworked text

The §12 re-derivation is otherwise clean — I spot-checked twenty-four citations across `js/swipe.js`,
`js/app.js`, `js/browse.js` and `css/app.css` and all but one land exactly. The exceptions:

- `finalizationPlanFor`'s export is `js/swipe.js:408`; §12 item 8 says `:407`, which is blank.
- §1's `PLAN-one-screen-type.md` row says "items 2 and 3 … name Stage 2's mechanism as `display: contents`". Verified against the pre-scrub text at `735601d`: only item 3 did. Item 3 also carried a second falsified claim the declaration did not name — "its own **fixed** inset own-scroll box".
- §1's two CONFLICT rows and §13 step 14's "includes surfacing the `PLAN-one-screen-type.md:1967-1976` mechanism correction to the user" are **stale in HEAD**: both reconciliations landed at `41f2933`. The declarations were honest when written; they are now discharged and the plan should record them as such rather than as open obligations. Note also that `41f2933` inserted lines into `PLAN-one-screen-type.md`, so the cited range `1967-1976` now spans item 3's heading through the middle of the correction.

### F17 — Weak, defect: no step performs the production fix `BROWSESURFACE` requires

§18 F6 specifies both halves of the scroll-indicator fix (`js/scrollbar.js:50`'s classifier and
`css:811-814`'s suppression list) and §14 authors `BROWSESURFACE` with a mutant on each. But §9 item 4
and §13 step 10 both enumerate the part-A commit set — "the CSS relocation (§5.3.1), the `o.mount` role
split, the `sy`/restore deletion, the entry-position rule, the widened `resetSwipeStyles`, and the
M1WRITERSET re-derivation" — and neither includes the scrollbar surface change; §5.3.1's CSS block does
not carry `css:811-814` either, and step 11 is the deletion pass. The enumeration is presented as
complete ("The set is: …"), which is the failure class: an incomplete list stated as exhaustive.

The consequence is bounded — `BROWSESURFACE` is authored red at step 9, so the builder cannot ship part A
green without it — which is why this is Weak rather than Structural. It should still be in the list,
because F14 makes one half of it a precondition of §5.4's derivation rather than a cosmetic fix.

### F18 — Note: round-1 findings F3, F4, F7, F8, F9, F10 and the three self-found findings, re-checked and confirmed resolved

Recorded so the checks are not repeated. **F3** — the split is real: `js/browse.js:80`, `:204`, `:497`
keep `o.mount`, and `virtualView(m, list, …)` already carries the page node as its first parameter with
`m._vctl = ctl`, so each controller measures its own page with no second injected field and `showPage`'s
deactivate loop cannot mis-target. **F4** — the park rule mirrors Invariant P by declaring no position
and no insets; the specificity analysis is correct (`body.has-player .browsepage` 0-2-1 beats
`.browsepage.parked` 0-2-0 and they set disjoint properties; `.browsepage.parked` beats `.browsepage`
0-1-0 on `overflow`), and I measured the park/un-park box equality at zero on three axes. **F7** — both
call sites are named and correct (`js/browse.js:489` cache hit, `:546` fresh page), and inverting the rule
is a better fix than threading a replacement value; `playingTrackY` and `anchorEntryY` are correctly
preserved with the right reason. **F8** — re-derived, and the double-occurrence trap is now handled by
line number with `NPPILLIDS` as the catch; verified `js/swipe.js:312` and `:339` both carry the exact
text and `:339` is inside `npPillClone`. **F9/F10** — unchanged. The three findings the rework made on
its own — `resetSwipeStyles`'s id-only element set, M1WRITERSET's rotting entries 3, 4 and 6, and
`env.scrollY`'s dead consumer — are each verified real against HEAD, as recorded in *Defining records*.

---

## The sequencing ruling and step 10a — ruled on

**The ruling is right and its reasoning is sound.** Stage 2 before the abort-repaint defect is correct,
and the strongest of the three reasons is the second, not the first: the defect's surviving mitigation is
`.browsepage.parked`, and Stage 2 re-derives that rule, so attacking the defect first attacks a moving
target. The third reason is the one that answers what I actually filed — the objection was a variable
count, and reducing the count is a better answer than reordering.

**Step 10a is adequate as a gate.** It measures the right quantity (park versus un-park box equality plus
the reveal delta on a mid-park content mutation), it sets an unambiguous threshold (both read 0), it runs
on an instrument this project has used before, and it **stops the sequence** on a non-zero result rather
than recording a caveat — "do not proceed to 10b". That is a gate, not a hope, and it is the correct
shape. Its first half already reads zero: I measured border-box height, `clientHeight` and `scrollHeight`
all at delta 0 across the `.parked` toggle under the reworked rule. The reveal-delta half remains owed and
is properly Blink-owed rather than device-owed.

One qualification, and it is F12's not the ruling's: step 10a gates step 10b, and step 10b is not the
gate the shipped `browse→browse` needs, because the mover configuration it exercises is replaced at step
11. The attribution argument is sound; the step it protects is pointed at the wrong build.

---

## Coverage

Every blocking finding, mapped to what would verify it.

| Finding | Verification | Layer |
|---|---|---|
| **F11** | A unit cell over `buildConstruction` against a fake env for the `browse→browse` case, asserting the outgoing and incoming mover elements are **distinct nodes** and that each carries the `browsepage` class — decidable in jsdom, since it is a DOM-identity fact and not a geometry one. Add it to §14 alongside `NOGHOSTATALL`, whose assertions are all true of the defective construction. The filmstrip itself is device-owed. | unit (construction seam) + device |
| **F12** | No cell — this is a sequencing obligation on §13. It is discharged by the step list itself: no intermediate HEAD may leave `js/swipe.js:324`'s `#browse.scrollTop` read live after `#browse` stops being a scroller, and the device gate must follow the mover change rather than precede it. A coverage pass finding step 10b ahead of the `outgoing` collapse has found this defect. | records (step sequence) + device |
| F13 | No runtime surface — an arithmetic correction to §5.3.2 and §18 F1a. The measurement in this review is the evidence; it needs no cell because the route is rejected. | records |
| F14 | Folded into `BROWSESURFACE`'s second mutant (the native-scrollbar suppression selector), plus a sentence in §5.3.2 and §5.4 stating the dependency. The gutter itself is engine-owed and measured here. | unit (css) + records |
| F15 | A device row in §15 and one line in step 10b's checklist. `ENTRYNOZERO`'s fixture wording is narrowed to what jsdom can witness — that `positionOnEnter` performs no write for a list page — rather than to retention. | device + records |
| F16 | Records only, discharged when the Stage 2 commit is authored. | records |
| F17 | The scrollbar surface change is added to §9 item 4's and §13 step 10's enumerated commit set. `BROWSESURFACE` already exists as the cell. | records |
| F18 | No surface owed — verifications, not defects. | none (verified) |

**§14's matrix is otherwise sound and I found no vacuous cell in it**, with the two exceptions above:
`ENTRYNOZERO`'s retention clause (F15) and the missing distinct-movers assertion (F11). `MOVERHASBOX` and
`PARKBOXEQUAL` are correctly reasoned as textual cells, and `PARKBOXEQUAL` comparing the two park rules
against each other rather than against a hardcoded list is the right construction.

---

## Device- and engine-owed, after this round

The instrument answered more than the plan expected it to. What remains:

- **WebKit, device.** The two `browse→browse` movers animating as a filmstrip once F11 is resolved, in
  the form that ships (F12). The A–Z strip's horizontal position during a `browse→browse` drag once F14's
  suppression is in place. Browse re-entry retaining its scroll position (F15). R3, R4, R5, R6 as the plan
  states them.
- **Blink, instrument.** R2b's second half — whether the off-viewport absolutely-positioned mover *paints*
  outside the viewport (the `scrollWidth` half is answered: it does not extend it, at `+w` or at
  `-101vw`). Step 10a's reveal-delta half (the box-equality half reads 0).

## Prediction — where this breaks in execution if built as written

The builder executes step 10, and part A goes green: the CSS cells assert exactly what is now true, the
role split is clean, and the entry rule inverts correctly. Then step 10b puts it on a device and
`browse→browse` is visibly wrong — the clone renders from the top of the list on every swipe — because
`ghostApp` is reading a `scrollTop` that part A made permanently zero. Nothing in the plan names this, so
it reads as a failure of the per-page scroller model. The likely response is to chase the scroll model
that is in fact correct, and the cheapest available repair is to put `overflow-y: auto` back on `#browse`
"temporarily", which reinstates the two scroll authorities §9 item 4 exists to prevent.

If that is survived, step 11 collapses `outgoing` and the transition stops animating altogether, because
both movers are `#browse` and the second transform write wins. That failure lands after the only device
gate, with the clone deleted in the same commit, so there is no working form to compare against — and the
symptom (a view sliding off with nothing arriving) points at the settle path and the transform clear
order, neither of which is the cause. The cause is that `js/nav.js:36` returns the host for a transition
whose two ends are pages, and the plan states the correct outcome in §5.1 while stating the wrong
resolution in §10 four hundred lines later.

**The single untested assumption that fails late and expensively** is the one §5.2 states in a subordinate
clause and never checks: that for `browse→browse` "both movers are children of the same `#browse` box."
Round 1 found `#browse` was a container, a scroller *and* a mover, and the rework correctly stopped it
being the second while preserving the third. What it did not do is give the `browse→browse` pair the two
movers it needs — because the element that was the mover on that transition was always the clone, and
deleting the clone leaves the slot empty rather than filled by the pages.

## What I could not test

- Anything requiring WebKit specifically: overlay-scrollbar behaviour, iOS scroll anchoring at the
  park/un-park edge, `display: none` retention on the shipping engine. Blink measurements are named as
  Blink measurements above and are not asserted for WebKit.
- Whether an off-viewport absolutely-positioned mover *paints* outside the viewport. `scrollWidth` is
  measurable headless; paint escape is not, from a DOM dump.
- Whether the open abort-repaint symptom survives de-cloning. I did not predict it in round 1 and I do
  not predict it now; F12 is a finding about which build the gate observes, not a claim about the symptom.
