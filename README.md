# Louis’s PS2 portfolio

My personal portfolio, inspired by the PlayStation 2. It starts in a 3D bedroom: turn on the TV, watch the startup sequence, and browse my projects as saves on a memory card.

You can explore with a mouse, touch, or keyboard. Use the arrow keys to move, Enter to open, and Escape to go back. The fullscreen button takes you back into the room, where you can switch the lamps on and off—or knock over the coffee mug.

## How it works

React and TypeScript handle the menus and project pages. Three.js draws the bedroom, TV, and animated save icons. CRT effects and the familiar sounds bring it together.

Everything runs in the browser, with images, video, and audio bundled with the site. There’s no backend. The site respects reduced-motion settings and falls back to a simpler view if WebGL isn’t available.

## Run locally

Use Node.js 22.13 or newer and npm:

```sh
npm ci
npm run dev
```

Open the URL printed in the terminal.

Project descriptions and biography live in [`lib/console/content.ts`](lib/console/content.ts); media lives in [`public/`](public/). Development mode also includes a **Lighting lab** panel for adjusting the room’s lighting.

The unfinished professional-work section is hidden by default. To show it while writing the Arm and Cambridge Intelligence case studies, start the site with:

```sh
VITE_SHOW_PROFESSIONAL_WORK=true npm run dev
```

## Build and deploy

```sh
npm run build
npm start
```

The built site is in `dist/client/`. `npm start` serves it locally on port 4173.

For hosting under a subpath, set it when building and previewing:

```sh
PAGES_BASE_PATH=/ps2folio npm run build
PAGES_BASE_PATH=/ps2folio npm start
```

The [GitHub Pages workflow](.github/workflows/pages.yml) builds and deploys pushes to `main`. Enable GitHub Actions in the repository’s Pages settings to use it.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

See [VALIDATION.md](VALIDATION.md) for browser checks.

## Credits

The original PS2 interface and startup and BIOS sounds belong to Sony Computer Entertainment. This is an independent personal portfolio, unaffiliated with Sony.

See [ASSET_SOURCES.md](ASSET_SOURCES.md) for audio and asset credits, and the [font license](public/font-license.txt) for Nimbus Sans. Third-party assets retain their original ownership and licensing.
