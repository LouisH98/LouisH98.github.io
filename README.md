# Louis’s PS2 portfolio

A static React/TypeScript portfolio with a Three.js boot sequence, a blue-orb console menu, bitmap-rendered text, and three project saves. Content and media are bundled locally. The site needs no API, account, database, Worker, or runtime GitHub connection.

## Run locally

Use Node 24 LTS (minimum 22.13) and npm:

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. The intro runs once per tab session. Sound defaults to a quiet level; if the browser blocks autoplay, it unlocks on the first click or keypress. The speaker icon in the top-right corner toggles sound. **System Configuration → Replay intro** replays it. Direct hash links bypass boot, and reduced-motion preferences skip it. A reload restores the default quiet sound preference; browser autoplay rules still apply.

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

- Edit biography and typed project records in `lib/console/content.ts`.
- Hash routes: `#/`, `#/browser`, `#/about`, `#/settings`, and `#/project/<id>`.
- Arrow keys select items; Enter opens them; Escape or Back returns to the parent screen. Tab reaches all controls and links. Touch needs a single tap to open a save.
- WebGL failure falls back to a static console background and project thumbnails. Content and navigation remain available. A no-JavaScript summary links to all projects.
- Reduced motion stops the orbs/save icons, skips boot, and shows video posters. Video playback also pauses when outside its scroll viewport or when the tab is hidden.
- Startup, menu effects, ambient audio, 3D resources, and event listeners are stopped or disposed when appropriate.

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
