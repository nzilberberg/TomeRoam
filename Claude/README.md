# Claude/ — project records (persona scheme)

This tree is the project's records under the persona scheme. It is **committed** to the
repo on purpose: committed artifacts are the channel through which separate, deliberately
blind sessions hand work to each other. A reviewer session and an implementation session
share no conversation — they stay adversarial — so the file in git is how one reaches the
other. A gitignored record cannot cross that boundary.

## What lives here

- `Decisions/DecisionLog.md` — the append-only decision log. One entry per settled
  decision, dated, so a later session does not re-open it. Read on-demand, never at
  startup.
- `Poirot/` — the code-reviewer casebook. Each code review is filed here.

No separate tactical board is kept in this tree; the cross-session memory serves that
view for the implementation sessions.

## The review handoff — how a review reaches the implementer

1. The review runs in its own session, blind to the implementer's rationale (this is what
   keeps it adversarial).
2. That session writes its findings to `Poirot/<build-or-topic>.md` — the verbatim review
   plus a verdict.
3. That session commits and pushes the casebook file.
4. The implementation session runs `git pull`, reads the committed casebook, and processes
   it: reproduce each finding before accepting it, fix under the builder's craft red-first,
   mutation-verify, then record each finding's disposition in the commit message and any
   settled decision in the decision log.

The commit that carries the fixes references the casebook it answered, so the review and
its resolution are both findable from git without the conversation that produced either.
