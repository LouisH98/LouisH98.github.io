# Louis’s PS2 portfolio

A static React/TypeScript portfolio with a Three.js boot sequence, a blue-orb console menu, bitmap-rendered text, and three project saves. Content and media are bundled locally. The site needs no API, account, database, Worker, or runtime GitHub connection.

## Run locally

Use Node 24 LTS (minimum 22.13) and npm:

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. The site starts in a dim 3D bedroom with an off CRT monitor on a desk; press its red-lit power button to unlock audio and start a 1.15-second CRT ignition (point → horizontal beam → expanded raster), followed by the full 12-second intro. The startup soundtrack begins after ignition. At 9 seconds, the glass expands toward the viewport, reaching fullscreen by 11.7 seconds. The camera starts front-on to the curved glass and moves straight toward it; a composited handoff from the same running picture fills the viewport as the portfolio takes over. The speaker icon toggles sound; **System Configuration → Replay intro** replays the TV entrance. Direct links to portfolio sections still start at the power button but then open the requested section without boot. Reduced-motion preferences skip the intro and zoom after power-on. Reloading returns to the off TV; browser audio rules still apply.

## Static build and GitHub Pages

```sh
npm run build
npm start
```

The deployable site is **`dist/client/`**, including HTML, JavaScript, fonts, images, video, and audio. Publish only that directory. The local static server listens on port 4173 by default.

For repository Pages rather than a root domain:

```sh
PAGES_BASE_PATH=/ps2folio npm run build
PAGES_BASE_PATH=/ps2folio npm start
```

Open `http://127.0.0.1:4173/ps2folio/`. The base path is a build-time value and must match the hosting path. Set it to an empty string for `LouisH98.github.io` or a root custom domain.

The workflow in `.github/workflows/pages.yml` builds and publishes on pushes to `main` or manual dispatch after Pages is configured to use GitHub Actions. It obtains the base path from `actions/configure-pages`. This implementation has not pushed, published, or replaced the existing portfolio.

## Content and behavior

- In the returned room view, the TV power button switches it off: the raster collapses to a beam and lingering phosphor dot, then the camera returns to the opening position. Powering on again starts the intro; room objects retain their state.
- The persistent fullscreen icon toggle zooms out to a closer bedroom view. Menus and project pages remain interactive on the TV; the same toggle returns to fullscreen.
- Before powering on the TV, click either lamp to toggle it. Click the coffee mug once to knock it off the desk. It tumbles under gravity and breaks into bouncing ceramic fragments on the floor; there is no reset interaction. Interactions are unmarked; keyboard focus exposes accessible controls. Reduced motion applies the changes immediately.

- Edit biography and typed project records in `lib/console/content.ts`.
- Hash routes: `#/`, `#/browser`, `#/about`, `#/settings`, and `#/project/<id>`.
- Arrow keys select items; Enter opens them; Escape or Back returns to the parent screen. Tab reaches all controls and links. Touch needs a single tap to open a save.
- WebGL failure falls back to a static console background and project thumbnails. Content and navigation remain available. A no-JavaScript summary links to all projects.
- Reduced motion stops the orbs/save icons, skips boot, and shows video posters. Video playback also pauses when outside its scroll viewport or when the tab is hidden.
- Startup, menu effects, ambient audio, 3D resources, and event listeners are stopped or disposed when appropriate.
- The boot scene and title share a CRT shader for barrel curvature, edge shading, scanlines, subtle RGB separation, and grain. Distortion fades during the zoom; the fullscreen portfolio remains sharp. Portrait phones use a closer-fitting camera view of the physical monitor.
- The 3D monitor, desk, keyboard, controller, cases, mug, notebook, bed, window, desk lamp, and night exterior are authored in `components/console/bedroomScene.ts`; camera framing lives in `lib/console/bedroomCamera.ts`. The boot picture is rendered to a texture using the same WebGL context as the room. Lighting uses linear half-float buffers where supported, with a single final ACES tone-map/sRGB/dither pass for the bedroom; the fullscreen portfolio retains its original output. A static 512px-per-face room reflection is captured once on scene setup and filtered for the curved glass. The static standby view redraws only on resize, and the room stops rendering after fullscreen.
- CRT timing and fallback viewport geometry live in `lib/console/crt.ts`. The earlier generated casing at `public/textures/crt-casing.png` remains the no-WebGL fallback.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Unit tests cover boot phases, route round trips, missing IDs, root/subpath asset URLs, project media, audio opt-in and synchronization, visibility changes, failure handling, and disposal during loading. Browser test scenarios are recorded in `VALIDATION.md`.

The scaffold’s vendored UI catalog is excluded from linting. `react/react-compiler` is disabled because this app does not enable React Compiler and synchronizes imperative WebGL/audio references; normal Rules of Hooks and dependency linting remain enabled. Static image elements are intentional: there is no image-optimization server.

## Credits

The original PlayStation 2 interface and its startup and BIOS sound effects were created by **Sony Computer Entertainment**. Credit for those original assets belongs to Sony. PlayStation and PlayStation 2 are Sony trademarks. This is an independent personal portfolio, not affiliated with or endorsed by Sony.

The bundled startup recording and original BIOS menu sounds are sourced from the recordings and archives listed in [ASSET_SOURCES.md](ASSET_SOURCES.md). The ambient audio was sourced from BlacRyu’s PS2 Menu Wallpaper Engine project. Third-party assets retain their respective ownership; this repository does not claim ownership of them or grant a license to reuse them.

The Three.js scenes, animations, project-save models, and portfolio content were created for this site. The Nimbus Sans font retains its own [license](public/font-license.txt). See [ASSET_SOURCES.md](ASSET_SOURCES.md) for detailed sources and credits.

## Lighting development controls

`npm run dev` shows a collapsible **Lighting lab** panel with live lighting, haze, exposure, and glass controls. Changes persist in this browser. **Copy settings** exports JSON; **Reset** restores the checked-in defaults; **Refresh reflection** updates the captured room environment after light changes; **Restart scene** returns to the off TV. The panel and its styles are excluded from production builds. Defaults live in `lib/console/lighting.ts`; saved browser overrides take precedence in development.
