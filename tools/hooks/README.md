# Pre-commit hooks

Two hooks run the same fast check battery before a commit lands, so a red/incoherent
commit can't be created locally (CI is the server-side backstop; these are the local one).
Both obey **one toggle**.

## The battery (`run-checks.mjs`)
`stamp --check` · lint · typecheck · full test suite (every gate). NOT the mutation sweep —
that's slow and stays in CI (`npm run mutation-sweep -- --affected` is the fast local pre-check).

## The two hooks
- **git `pre-commit`** (`tools/hooks/pre-commit`) — fires on any commit from any tool/terminal.
  Enabled via `core.hooksPath` (see install). Primary enforcer.
- **Claude PreToolUse** (`.claude/settings.json` → `claude-precommit.mjs`) — fires before the
  agent's `git commit`. It *defers* when the git hook is installed (no double-run) and only
  enforces the gap: a clone where the git hook was never installed.

## Toggle & install (easy)
    npm run hooks:install     # enable the git hook (one-time per clone) + record node path + toggle on
    npm run hooks:off         # disable BOTH hooks (git config tomeroam.hooks=false)
    npm run hooks:on          # re-enable BOTH
    npm run hooks:status      # show current state
    npm run hooks:uninstall   # remove the git hook (core.hooksPath unset)
    npm run hooks:check       # run the battery manually

Bypass a single commit: `git commit --no-verify`.

The toggle is one git-config value (`tomeroam.hooks`, default ON) that BOTH hooks read, so
one command turns everything off. The Claude hook lives in committed `.claude/settings.json`;
after it's first added, open `/hooks` once or restart so Claude Code loads it.
