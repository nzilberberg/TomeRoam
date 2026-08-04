# Device gate verdict — Stage A1b, build `2026-08-03.305`

Filed by Zelda, 2026-08-03, from the user's report on their phone. This is plan step 9 of
`PLAN-one-screen-type.md`. **Partial: one of four items answered.** The stage's other three gates
are cleared (Loki HELD_STONE, Poirot PASS, Mendeleev ADEQUATE r2); this is the last one.

⚠️ **`.305` is behaviourally identical to `.304` for this stage** — the bump was a label repair
(comment-only `css/app.css` drift). A result reported on either build applies to both.

---

### Item 4 — scroll position across the new `#browse` `display:none`. **ANSWERED — PASS.**

The adversary's addition, not in the plan's original list. A1b newly `display:none`s `#browse` under
Now Playing, and a classic browse page has **no scroll-restore mechanism** — so the position survives
only if the engine preserves it. Loki executed the round trip on a Blink bench (900 → 900, primitive
and full path); **the device is WebKit and that was untested there.**

- **Gesture:** scroll the Books list well down, open Now Playing, close it.
- **Observable:** the list is where it was; a jump back toward the top is the failure.
- **Result — the user's words, quoted because the hedge is theirs and is kept:**
  > *"Scroll books + open close NP seem fine"*

**What this establishes:** WebKit preserves `scrollTop` across A1b's new `display:none` of `#browse`
on the path the strike could only prove in Blink. That closes the one residual the adversary named.

**What it does not establish:** nothing about items 1–3. The user reported on the check they were
given and no other.

---

### Item 1 — the accumulation itself is gone. **ANSWERED — PASS.**
### Item 2 — aborted NP gestures do not accumulate. **ANSWERED — PASS.**

> *"1 and 2 pass."* — the user, 2026-08-03, on build `.305`.

Both run on the device across the six open/close combinations and the abort paths below. **This is
the defect A1b exists to fix** — the device-photographed three-or-more-screens render — and it is gone
on the device, not merely on a Blink bench. Loki's on-glass result (exactly one un-hidden screen every
time) now holds on WebKit too.

Scope kept: the user reported on items 1 and 2. Item 3 is a different question — a *performance*
hazard, not a correctness one — and was re-issued separately below after the first wording proved
unusable.

<details><summary>The gestures as run (retained for re-runs)</summary>

### Item 1 (passed)

The defect A1b exists to fix, device-photographed as three-or-more screens rendering through each
other. Loki executed it on glass (one un-hidden screen every time) but on Blink, not the device.

- **Gesture:** open Now Playing from Home, from Books, and from a settings screen; close each one
  both ways — by swipe and by the back control. Six combinations.
- **Observable:** at no point may more than one screen be visible beside Now Playing. The failure
  looks like text or cards from another screen showing *through* the current one.

### Item 2 (passed)

- **Gesture:** abort an NP-back swipe (start it, release it back) and abort an NP→chapter-list swipe;
  then swipe again for real.
- **Observable:** same as item 1 — the second swipe must not reveal a stack. Screens left un-hidden
  by the abort are what accumulated before A1b.

</details>

---

### Item 3 — the three R-H performance questions. **ANSWERED — PASS.**

> *"3a and 3b pass, 3c seems fine too"* — the user, 2026-08-03, on build `.306`.

**3a (covers re-decode on close) and 3b (restore flash): PASS.** Both are single-close observations
with a sharp failure mode; a clean report is a clean result.

**3c (the compounding cost): PASS, and the hedge is kept — "seems fine too", not "is fine".**
R-H hazard 3 is therefore **not observed**, which is not the same as disproven: the test is a human
judgement of *progressive* degradation across repeats, so it rules out a degradation large enough to
notice, not a small one. That is the honest ceiling of this instrument and no stronger claim is
recorded. **No further work is owed on it** — the hazard was a predicted cost of A1b's teardown, and
the prediction did not materialise at a visible scale.

**With this, every item of plan step 9 is answered and Stage A1b is fully gated.**

---

<details><summary>The item as re-issued (retained for re-runs)</summary>

**Was: OWED — re-issued 2026-08-03 after the first wording proved unusable.**

⛔ **The first version of this item was not runnable, and the user said so: *"I need clearer
instructions for 3."*** It said *"half-swipe back from Now Playing and abort, repeatedly and as fast
as is comfortable"* — jargon (`half-swipe`), no edge named, no release behaviour, and **actively
misleading on the one detail that decides whether the gesture is an abort at all.** It passed the
`device-gate-check` format gate because it carried `Gesture:` and `Observable:` fields; the fields
were present and the content was still unusable. **Recorded as the gate's honest limit: it checks
that the fields exist, not that a stranger could act on them.**

**The constants that make the gesture work, read from `js/app.js:198` and `:496-500`:**
`EDGE = 44` px — a back swipe is only armed if the finger starts within 44px of the **left** edge.
`THRESH = 0.42` — releasing before ~42% of the screen width **aborts** (snaps back).
⭐ `FLICK_V = 0.4` px/ms — **a fast release COMMITS even a short drag.** So flicking and letting go
completes the swipe, which is the opposite of the test. The release must be slow.

⛔⛔ **SECOND unusable instruction, same cause.** The re-issue above still said *"tap a book so Now
Playing covers it."* The user: ***"another nonsense instruction. what is the step to follow?"***
Tapping a book opens its **chapter list**, not Now Playing. Derived properly this time:
**Now Playing is opened ONLY by tapping the mini-player bar** — `js/app.js:2837`, a click on
`$('player')` that is not inside `.controls` or `.seekrow` — and only when a book is loaded
(`js/app.js:2225` toggles `body.has-player`). **There is no Now Playing navbar button**; the navbar
holds Home, Authors, Books, Options (`index.html:176-193`), and while NP is open CSS swaps those out
for the `.np-actions` pill (`index.html:194-203`).

**Source:** `js/app.js:2837` (the only opener), `js/app.js:2225` (when the bar exists),
`index.html:133` (`#player`, the tap target: cover thumbnail + title + `.controls`),
`index.html:176-193` (the navbar has no NP button), `js/app.js:198` (`EDGE`, `THRESH`, `FLICK_V`),
`js/app.js:496-500` (a back swipe arms only from the left edge; its destination is the previous
screen).

**Setup — the exact steps:**
1. Start a book playing, so the **mini-player bar** appears at the bottom, just above the navbar
   (cover thumbnail, title, transport buttons).
2. Tap **Books** in the navbar. You are now on the Books list with the mini-player bar below it.
3. Tap the **mini-player bar** — on the cover thumbnail or the title text. **Not** the play/pause or
   skip buttons, and **not** the seek slider; those are excluded by the listener and do something
   else. Now Playing opens over Books.

Because the back destination is the previous screen (`js/app.js:500`), a back swipe from here returns
to **Books** — which is what items 3a–3c need.

**3a and 3b — one close each, no repetition needed.**
- **Gesture:** close Now Playing back to Books, once, by completing the back swipe (or the back
  control). Watch the instant Books reappears.
- **Observable:** (a) the covers **re-decode** — the grid appears blank/grey and fills in, instead of
  the covers already being there; (b) the restore **flashes** — a visible blink or flicker at the
  moment Books returns.

**3c — the compounding one. This is the item that needs repetition, and the reason is specific.**
R-H hazard 3 predicts a cost that *accumulates*: the mid-drag render is paid today and is unchanged by
A1b, but A1b adds a teardown that dematerializes the rows the **next** swipe's render must rebuild. A
single try therefore proves nothing — a first pass looks fine whether the hazard is real or not.
- **Gesture:** with Now Playing over Books — (1) put a finger on the far **left** edge, within about a
  thumb's width; (2) drag **right** roughly a quarter to a third of the screen, no further than
  halfway — Books is revealed behind as you drag; (3) **hold still for a moment, then lift** — do not
  flick, or it will complete instead of snapping back; (4) let it snap back to Now Playing. Repeat
  **ten to fifteen times**, as briskly as is comfortable.
- **Observable:** watch the Books list *in the sliver revealed during each drag*, comparing late
  repeats against the first two or three. The failure is **progressive**: rows blank, grey, or
  placeholder where they were populated early on; rows arriving visibly late; the list stuttering or
  jumping. Worse on the tenth than on the first is the signal. **Steady across all fifteen — even if
  each individual peek is imperfect — is a pass**, because the hazard is the compounding, not the
  first-pass cost.

---

</details>

---

## Status — COMPLETE

- **Item 1: PASS** — the accumulation defect is gone on the device.
- **Item 2: PASS** — aborted NP gestures leave no stack.
- **Item 3: PASS** — no cover re-decode, no restore flash, no visible compounding cost (hedged).
- **Item 4: PASS** — scroll survives the new `#browse` `display:none` on WebKit.

**Stage A1b is fully gated:** plan-review FORGE, red-suite RED_SUITE_READY, build BUILD_GREEN,
adversary HELD_STONE, code-review PASS, coverage-audit ADEQUATE (r2), **device gate PASS**.

⚠️ **One thing this does NOT close.** `PLAN-parked-page-rides-home.md` risk **R1** — whether the
park-distance fix cleared *all* of the reported swipe garbage — remains open on its own terms. It is
a separate change with its own device gate, and the user's report there was likewise bounded
(*"the bugs I was able to easily reproduce last round seem fixed"*). Nothing here speaks to it.

## The lesson this record earned twice

The `device-gate-check` hook (built 2026-08-02, after a fabricated gesture) enforces that an OWED item
carries `Gesture:` and `Observable:` fields. **Item 3 had both and was still unusable** — it used
jargon, named no edge, and got the release behaviour backwards relative to `FLICK_V`. A format gate
cannot check that a stranger could act on the instruction. **The honest residual: write the gesture
from the SOURCE CONSTANTS that decide whether it does what it claims** — here `EDGE`, `THRESH` and
`FLICK_V`, all three of which the first wording ignored. That is a discipline, not a gate, because no
cheap check can tell a runnable instruction from a plausible-sounding one.
