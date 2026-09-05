# Intro performance pass — 5 September 2026

## Evidence and scope

Analyzed the user-supplied `Trace-20260905T212208.json.gz`: 698,352 events, approximately 17.8 seconds, including power-on and the complete intro. Timings below are relative to the click event. This is a development build with DevTools profiling enabled, so React instrumentation is included.

Verified the changes separately in the Codex in-app browser at 818 × 538 CSS pixels, DPR 2. These are different recording environments, not a controlled percentage-speedup benchmark. No mobile-hardware or production-browser benchmark was performed.

## Findings in the supplied trace

| Event | Duration | Attribution |
| --- | ---: | --- |
| First animation callback after power-on | 37.8 ms | 30.8 ms sampled under Three.js program setup; 21.3 ms in `getProgramInfoLog`. First-use shader work. |
| Animation callback at +11.743 s | 97.3 ms | 85.1 ms sampled in `WebGLRenderer.setSize`, followed by program creation/initialization. |
| React during +1.15–9 s | ~632 ms sampled inclusive | `performWorkUntilDeadline`; per-frame state updates rebuild the console tree. Includes development/DevTools overhead; nested totals must not be added. |
| Layout after click | 1.07 ms total | Small compared with the shader and resizing stalls. |
| Paint after click | 3.64 ms total | Not the principal bottleneck. |

The 113.9 ms task at trace start is primarily CPU-profiler startup, not an intro regression. Garbage collection was comparatively small: the longest recorded minor collection was 1.5 ms and major collection 3.6 ms.

## Changes

- Keep the WebGL presentation canvas at room resolution. Render PS2 content into its existing low-resolution texture and present that texture through the CRT pass; no drawing-buffer resize at the zoom boundary.
- Keep the screen's emissive texture bound while off, with zero emissive intensity. Power-on no longer changes the material's shader configuration.
- Exercise the source and final-display render paths during initialization, so driver first-use work happens before the interaction. A compile-only attempt still hit first-use initialization on this driver, so the warmup uses real draws.
- Give WebGL and audio the live animation clock; update React's UI state at 10 Hz instead of every animation frame.
- Instance the 99 towers with the same geometry and six face materials. Tower draw calls drop from 594 to 6; a typical complete intro frame drops from 901 to 313 calls without reducing tower geometry.
- Add an opt-in development profiler: `?profileIntro=1` records CPU/frame intervals and render calls, while `?profileIntro=gpu` adds asynchronous per-pass GPU queries. Results appear in the console and `#intro-profile` after the intro plus 2.5 seconds of menu time.

## Final in-app verification, GPU queries disabled

CPU figures measure the scene render callback, not all browser main-thread work. Frame intervals include scheduling/presentation pacing.

| Phase | Mean CPU | P95 CPU | Max CPU | Mean frame interval | Max frame interval |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ignition | 1.19 ms | 1.60 ms | 2.50 ms | 8.40 ms | 17.40 ms |
| Intro | 1.26 ms | 1.70 ms | 3.90 ms | 8.33 ms | 9.40 ms |
| Zoom | 1.39 ms | 2.20 ms | 4.10 ms | 8.90 ms | 17.60 ms |
| Menu | 0.58 ms | 1.00 ms | 1.70 ms | 8.36 ms | 15.80 ms |

No frame intervals exceeded 33.4 ms from power-on through the measured menu period. No console rendering errors were reported; fullscreen menu output was inspected.

## Remaining costs and limitations

- Volumetric atmosphere and bloom were the largest GPU-query candidates. The queries themselves materially changed pacing (roughly 14.5 ms average intro intervals with queries versus 8.33 ms without). Their absolute per-pass numbers are not a trustworthy additive GPU frame budget, so no GPU speedup is claimed.
- Initialization/probe capture still has visible CPU spikes before power-on; shader warmup moves work earlier rather than eliminating it. Standby intentionally renders at approximately 24 fps and should not be scored against a 60/120 Hz frame budget.
- Keeping the presentation canvas at full resolution retains a larger default framebuffer after the zoom and adds a simple fullscreen texture pass. The PS2 source resolution remains unchanged.
- A fresh DevTools trace on the same browser/settings as the supplied recording would confirm the before/after under matched conditions.

Validation: TypeScript, lint, 19 existing tests, production build, and diff whitespace checks pass. The existing large-JavaScript-bundle build warning remains.
