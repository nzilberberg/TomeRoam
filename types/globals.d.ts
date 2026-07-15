// Ambient type declarations for the app's cross-file globals.
//
// These are classic <script> files (no bundler, no module graph) that publish
// their public surface on window/self — e.g. `window.Plex = Plex`. TypeScript's
// DOM lib doesn't know about those custom properties, so a `// @ts-check` file
// that reads `window.Plex` or assigns `window.SWKit = …` would otherwise error
// "Property does not exist on Window". Declaring them here (loosely, as `any`
// for now) lets modules opt into type-checking one at a time; tighten a given
// global's type when its owning module is itself annotated.
//
// This file is intentionally NOT shipped — it only feeds `npm run typecheck`.

interface Window {
  // Pure/util kernels
  PBLogic: any;
  SWKit: any;
  SpeedControl: any;
  Settings: any;
  // Data + connectivity layer
  Plex: any;
  Store: any;
  Net: any;
  SyncQueue: any;
  Progress: any;
  Presence: any;
  Warmer: any;
  // UI/feature modules
  Browse: any;
  Downloads: any;
  DownloadsScreen: any;
  OptionsScreen: any;
  ArtLoader: any;
  HandoffController: any;
  LogPipe: any;
  // Debug + native bridge
  PBDebug: any;
  PBHardReset: any;
  TomeRoamNative: any;
  __tomeroamUpdateReady: any;
}

// Most modules are ALSO read by bare identifier (not `window.X`) from app.js and
// sibling modules — the historical convention here — and in the Node test /
// service-worker contexts they arrive via require()/globalThis. Declaring them as
// ambient vars covers those call sites the same way the Window interface covers
// `window.X`.
declare var PBLogic: any;
declare var SWKit: any;
declare var SpeedControl: any;
declare var Settings: any;
declare var Plex: any;
declare var Store: any;
declare var Net: any;
declare var SyncQueue: any;
declare var Progress: any;
declare var Presence: any;
declare var Warmer: any;
declare var Browse: any;
declare var Downloads: any;
declare var DownloadsScreen: any;
declare var OptionsScreen: any;
declare var ArtLoader: any;
declare var HandoffController: any;
declare var LogPipe: any;
declare var PBDebug: any;
