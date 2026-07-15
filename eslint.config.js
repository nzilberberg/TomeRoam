// Flat ESLint config (ESLint 10). Scope: the SHIPPED app code (js/**, sw.js).
//
// Why this exists: every offline-arc bug that a unit test could NOT reach was a
// static-analysis problem in DOM-coupled glue — the `const best` reassignment
// that threw on every same-book tile tap being the worst. `no-const-assign`
// flags that class at lint time with zero false positives and no scenario
// needed. The rule set is deliberately narrow and high-signal so `npm run lint`
// (and test/lint.test.js) stays green on clean code and only fires on real
// defects: const/param/function reassignment, duplicate keys/args, and unused
// locals (dead code). We do NOT enable `no-undef` — these are classic scripts
// sharing cross-file globals (Plex, Store, PBDebug, SWKit…), so it would be all
// noise; the const/unused family is what actually caught real bugs here.
'use strict';

module.exports = [
  {
    ignores: ['js/vendor/**', 'node_modules/**', 'android/**', 'test/**'],
  },
  {
    files: ['js/**/*.js', 'sw.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
    },
    rules: {
      'no-const-assign': 'error',
      'no-func-assign': 'error',
      'no-class-assign': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      // Added one demonstrated-defect class at a time (not a broad style preset):
      // strict equality except the intentional `== null` idiom, and control-flow
      // foot-guns. `checkLoops:false` keeps the intentional streaming `for(;;)`
      // byte-loop (downloads.js fetchAudioBlob) legal. (no-undef still excluded —
      // see above; unhandled-promise detection is a manual audit for now, pending
      // a type-aware parser — see docs/adr if added.)
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-fallthrough': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
    },
  },
];
