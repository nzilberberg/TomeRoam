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

### Item 1 — the accumulation itself is gone. **OWED.**

The defect A1b exists to fix, device-photographed as three-or-more screens rendering through each
other. Loki executed it on glass (one un-hidden screen every time) but on Blink, not the device.

- **Gesture:** open Now Playing from Home, from Books, and from a settings screen; close each one
  both ways — by swipe and by the back control. Six combinations.
- **Observable:** at no point may more than one screen be visible beside Now Playing. The failure
  looks like text or cards from another screen showing *through* the current one.

### Item 2 — aborted NP gestures do not accumulate. **OWED.**

- **Gesture:** abort an NP-back swipe (start it, release it back) and abort an NP→chapter-list swipe;
  then swipe again for real.
- **Observable:** same as item 1 — the second swipe must not reveal a stack. Screens left un-hidden
  by the abort are what accumulated before A1b.

### Item 3 — the three R-H honest questions. **OWED.** *(plan §15 R-H)*

⭐ **R-H hazard 3 predicts a COMPOUNDING cost, not a first-pass one.** The mid-drag render is paid
today and is unchanged by A1b; what A1b adds is a teardown that dematerializes the rows the *next*
swipe's render must rebuild. So a single try proves nothing here — the repetition is the test.

- **Gesture:** on a long Books list, half-swipe back from Now Playing and abort, repeatedly and as
  fast as is comfortable — ten or more times. Then, separately, close NP back to Books once and watch
  the moment it appears.
- **Observable:** three distinct failures. (1) On closing back to Books the covers visibly
  **re-decode** — a blank-then-fill of the grid rather than covers already present. (2) The restore
  **flashes**. (3) Across the repeats the list gets progressively **slower or emptier** — rows
  arriving late or missing, worse on the tenth than on the first. Only (3) needs the repetition;
  (1) and (2) show on a single close.

---

## Status

- **Item 4: PASS** (user-reported).
- **Items 1, 2, 3: OWED.**
- Stage A1b's other three gates: **cleared.** This device gate is the only thing outstanding.
