// Lint gate — the single highest-ROI guard we were missing.
//
// Every offline-arc bug a unit test could NOT reach was a static-analysis
// problem in DOM-coupled glue (the `const best` reassignment that threw on every
// same-book tile tap being the worst). `no-const-assign` flags that whole class
// at lint time — guaranteed, no scenario needed — and this test makes the lint
// pass a hard part of `npm test` so a reassigned const / dead local can never
// merge green again. The rule set lives in eslint.config.js (deliberately narrow
// and high-signal). We run ESLint via its Node API so there's no shell/path
// dependency and the failing lines show up right in the assertion message.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { ESLint } = require('eslint');

test('eslint: no errors in shipped app code (js/**, sw.js)', async () => {
  const eslint = new ESLint({ cwd: path.join(__dirname, '..') });
  const results = await eslint.lintFiles(['js', 'sw.js']);
  const errors = results.flatMap((r) =>
    r.messages
      .filter((m) => m.severity === 2)
      .map((m) => `${path.relative(path.join(__dirname, '..'), r.filePath)}:${m.line}:${m.column} ${m.ruleId || 'syntax'} — ${m.message}`),
  );
  assert.deepEqual(errors, [], errors.length ? '\n' + errors.join('\n') : 'clean');
});
