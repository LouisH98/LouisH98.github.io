# Loading benchmark — 6 September 2026

Three fresh browser contexts per build; Chrome headless, 1440×900 DPR 1, cache disabled, 10 Mbps download, 40 ms latency, local production server without HTTP compression. Browser/GPU process reused between runs; this is not a cold GPU or production CDN benchmark.

| Metric | Before | After |
|---|---:|---:|
| Median first room frame / loader dismissal | 1577 ms | 1463 ms |
| Startup resource bodies | 4,887,254 bytes | 1,744,210 bytes |
| Entire shipped build | 13752993 bytes | 8921244 bytes |
| CSS | 197,376 bytes | 40,164 bytes |

Changes: WebP poster at quality 85, original resolution retained; lossless WebP for all other PNG images; source PNGs retained under references/asset-originals outside public; Tailwind scans the shipped app rather than unused UI components; WebP media references and video poster fallbacks updated.

Audio remains deferred until power-on. Videos remain visibility-driven and are not preloaded. JavaScript remains about 1.11 MB raw / 345 KB gzip; splitting the required Three.js code would not remove the startup dependency. An image preload was tested and removed because it delayed the first room frame.

The first frame does not mean every texture has loaded. Resource totals are collected after network idle. Raw machine-readable inventories and runs are in load-baseline.json and load-optimized.json. Run scripts/benchmark-load.mjs against the production server to repeat.

Validation: production build, type checking, lint, 24 tests, browser error checks and scene screenshot.
