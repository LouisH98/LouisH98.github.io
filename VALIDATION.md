# Validation — 5 September 2026

## Automated checks

- TypeScript and Oxlint pass.
- Eight Node tests pass: boot phases and continuous ring endpoint, hash routes, invalid IDs, base paths, local media/posters, sound opt-in/synchronization, visibility, audio failure, and disposal during loading.
- Vite static builds succeed for `/` and `/ps2folio/`. Both HTML entry points and their referenced local assets were checked. The repository-path build was also exercised in Chrome.

## Browser checks

- Updated 7.6-second replay starts in the tower scene and completes at the main menu. Audio opt-in loads successfully; replay with sound completes; reload returns to the menu muted.
- Desktop tower composition was compared with the supplied screenshot. The downloaded no-disc video was sampled at one-second intervals; see `references/boot-keyframes.jpg` and `ASSET_SOURCES.md` for timing and source details.
- The same eight sprites persist from colored drift through the blue menu ring. Route changes fade the outgoing screen, reveal the next screen, and interpolate ring position/size.
- Browser opens The Screen at `/ps2folio/#/project/the-screen`; its local MP4 decodes (readyState 4), while offscreen clips remain paused. Escape returns focus to The Screen’s save. Earlier checks covered Print Scheduler, LovePrint, About, menu arrow keys, Enter, and Back.
- Portrait 390×844 and landscape 844×390 layouts checked. Landscape Browser retains all three selections in a scrollable panel. Portrait uses stacked save selections.
- With WebGL deliberately unavailable, Browser retains all three loaded project thumbnails, including The Screen’s PNG poster.
- With reduced motion forced, The Screen uses three loaded posters and creates no video elements.
- At 200% text size and 390px width, About has no horizontal overflow; all three menu controls remain within the viewport with heights above 44px.

## Limits

The visuals are an authored Three.js recreation, not pixel-identical BIOS emulation. The reference capture has fewer towers than the supplied screenshot, so the screenshot informs density while the video informs timing. The startup sound is extracted from the same console video; it is not synthesized. Audio decoding and scheduling were checked, but subjective loudness/listening quality still warrants the owner’s review on their speakers.

Responsive checks used browser viewport emulation rather than physical phones. Local QA fixtures in `scripts/serve-static.mjs` require `QA_ENABLED=1` and are never included in the static export. No site was published and the existing portfolio was not replaced.

## Animation refinement

Removed the 32 ms boot clock and now advance it on requestAnimationFrame, allowing display-refresh-paced updates. Trails sample timestamped rendered positions through intro morphs and page movement. The intro now lasts 7.6 seconds with a full black interval, and menu lights have white cores, depth-dependent halos, and a tilting ring. Type checks, lint, timeline/audio tests, and the static build pass; updated replay and menu appearance were checked in the browser. Actual frame rate depends on the display and device; no measured FPS guarantee is implied.

## Camera approach refinement

The camera now begins at height 52 (previously 38), eases toward the scene center over 4.8 seconds, and the tower field rotates clockwise at 0.045 radians/second. The final quarter of the approach (3.6–4.8 seconds) fades only the background to black. Orb and trail rendering stays above that fade, followed by the existing 4.8–7.6-second ring morph. Opaque tower surfaces are faded together as a completed image rather than made individually transparent. Timeline checks cover the fade start/end and morph boundary.

## Definitive video timing

The owner selected `y9Ln-qyvX_I` as the definitive reference. Downloaded and inspected its opening at 0.5-second intervals, with individual frames at 0, 2, 4, 6, 7, 7.5, 8, 8.5, and 9 seconds. This supersedes the shorter timing above: the tower scene now lasts 9.05 seconds, followed by the authored orb-menu transition through 12 seconds. The later PlayStation disc-launch screen is omitted. Audio uses the same clip, cut at 12 seconds before the disc-launch section.

Fixed-time browser review at 0 and 8.6 seconds checked wide opening composition, clockwise rotation, the late dive, and visible colored orbs over the background fade. Feathered the cloud textures to remove rectangular tile edges, and added low central towers to avoid an empty shaft dominating the final dive. The camera curve is fitted from reference images, not an exact recovered BIOS camera.

## Memory-card browser and original menu audio

Replaced the old cue mappings with original BIOS global cursor (#13), confirm/cancel (#14 at their documented pitches), memory-card select, and settings scroll samples, verified against the labeled BIOS-sound demonstration. Sound preference now defaults on at quiet gain; blocked autoplay returns immediately and unlocks on a later trusted pointer/key interaction. Muting suppresses later automatic unlocks. The ghost speaker control remains usable while loading. Added tests for blocked autoplay and muting during unlock; all ten tests pass.

Removed archive branding, project-count decorations, menu taglines, the PS2 logo, and filler headings/prose. Boot title is Louis Computer Entertainment. Browser uses a dark gray adaptation of the supplied screenshot, a yellow selected title, white selection glow, original authored 3D project icons with titles, and Enter/Back/Options controls. Options provides working project/external links and Escape restores save focus. The three actual projects are retained rather than inserting fictional game saves.

The original long-running preview had its WebGL context blocked by the browser. A fresh preview successfully renders all three models. Save models now share one offscreen WebGL renderer, copied to 2D display canvases; route changes no longer create three new GPU contexts. Model geometry/materials and animation callbacks are still released on unmount. Background orbs move to the page center with blur and dimming, with longer time-sampled trails in the menu.

Follow-up browser checks at 390×844: all three 3D display canvases render, each save target is 117×181 px, and model titles fit. Muting then opening The Screen keeps audio off. Returning to Browser restores all three 3D models with zero fallback images. The fresh preview remains open; temporary viewport sizing was reset. The owner requested a darker background and visible titles after the initial screenshot-based layout; both are included.

## Final shared chrome

Removed the Browser-only gradient and restored the shared console haze/background. Removed its special sound-toggle/footer positioning. Enter, Back, and Options now use fixed footer slots on all screens. Browser and The Screen detail were checked at 1280×720: Back remains at x=210.8, y=632.8 on both. The final type check, lint, ten tests, and production build pass.

## CRT power-on entrance — 5 September 2026

Added a power-gated intro, generated transparent CRT casing, adaptive portrait enclosure, and a continuous screen expansion from 9 to 11.7 seconds. The boot scene and title share a barrel-distortion shader with subtle scanlines, vignette, RGB separation, and grain. The same Three.js scene continues into the fullscreen menu. Reduced motion, skip, and WebGL fallback bypass the zoom; deep links open their destination after power-on.

TypeScript, lint, all 11 Node tests, and the production build pass. New geometry checks cover 1440×900, 390×844, 844×390, 320×568, and 2560×1080: the TV starts inside the viewport, grows monotonically, and its aperture exactly reaches viewport bounds before boot ends. A local HTTP check returns 200 and the preview has been queued in Codex. These are automated geometry/static checks, not browser or physical-device visual verification of the new shader. No publication was requested or performed.

## CRT ignition and raster correction

Added a 1.15-second phosphor ignition before the full intro: centre point, horizontal beam, expanding raster, and a short black settle. Replay includes ignition. The same visibility-aware clock drives both phases; reduced motion bypasses them. Audio unlocks on the original power gesture but cannot start the soundtrack or navigation cues during ignition. Added tests for audio handoff and ignition phases; all 13 tests, type checks, lint, and the production build pass.

Corrected scanline sampling: cosine at half-pixel centres had produced a constant value across raster rows. The shader now samples a sine wave in warped screen coordinates, with stronger scanline contrast, RGB phosphor columns, edge shading, and colour separation. Effects still fade to zero during the zoom. Visual browser review of the revised treatment remains pending.

## 3D bedroom entrance

Replaced the primary flat casing with a real Three.js CRT on a wooden desk in a dim bedroom. The monitor has an extruded bevelled aperture, subdivided convex glass with UVs, cabinet depth, pedestal, vents, speaker grooves, and a projected accessible power target. The running intro and ignition are rendered to the emissive screen texture in the same WebGL context. The room includes a keyboard, bed with draped geometry, window, warm bedside lamp, procedural surface textures, environment reflections, and static shadows. The camera aligns and approaches the monitor, then composites the same running picture across the viewport for the final handoff. The old casing remains a no-WebGL fallback.

All 14 Node tests, TypeScript, lint, and production build pass. Added camera checks cover desktop, ultrawide, phone portrait, and phone landscape: initial perspective, alignment before handoff, monotonic approach, and final glass coverage. Browser visual and physical-device performance checks remain pending; no publication was requested or performed.

## Front-on composition, atmosphere, and practical lighting

The camera now starts centred at screen height and approaches straight-on. The desk occupies an alcove against a wall, with cases, a wired controller, mug, notebook, pencil, speaker, and shelf. The left wall has a real window opening so the exterior spotlight passes through its frame. Lower environment, hemisphere, and fill lighting preserve a dim interior; a warm bedside practical, subtle warm bounce, and powered screen light provide local illumination.

Added a 24-step depth-aware window-scattering pass. Rays trace through a four-pane window mask, accumulate a soft bounded haze, and stop at the opaque room surface reconstructed from its depth texture. The pass renders only while the bedroom is visible; standby remains static. Updated front-on camera assertions, all 14 tests, type checks, lint, and the production build pass. The new lighting has not been visually verified in a browser or profiled on physical devices.

## Corrected window-to-bed light direction

The physical spotlight and volumetric pass now share a single light-path definition in `lib/console/windowLight.ts`. It travels backward into the room toward the bed, rather than forward across the monitor. Removed the intervening alcove partitions that would block that path, retained low storage behind the desk, and moved the shelf to the actual rear wall. Reduced haze density and the CRT's oversized environment reflection. A new geometry test checks that the entire beam remains behind the monitor face and that its centre reaches the bedding. All 15 tests, type checks, lint, and production build pass; the updated rendered appearance has not been browser-verified.

## Linear HDR pipeline and black-level correction

Replaced the room, CRT source, and processed television-picture buffers with linear-sRGB half-float targets when EXT_color_buffer_float is available. Unsupported devices retain an 8-bit fallback. The room and depth-aware atmosphere composite in linear light; only the final bedroom output applies ACES filmic tone mapping (exposure 1.05), sRGB encoding, and dithering. Renderer tone-mapping state is restored before the fullscreen portfolio renders. Removed blanket room fog and prevented CRT grain from adding light to black source pixels. Selected the current PCF shadow mode rather than its deprecated alias.

Browser review used the existing in-app preview, including before/after desktop screenshots, power-on ignition, fullscreen menu completion, and 390×844 standby/intro screenshots. The previously visible coloured contours on the glass and lamp falloff no longer appear in the checked images; shadows are deeper and the intro remains readable. No renderer/shader errors were returned by the browser log check; the observed shadow-mode deprecation was corrected. Physical-device performance and display-specific banding remain unmeasured. All 16 tests, type checks, lint, and production build pass. The new test covers HDR target precision, linear colour space, and the supported fallback. Models were not changed in this pass.

## Task lamp, night exterior, and captured reflections

Added a shaded metal desk lamp with a warm, shadow-casting spotlight aimed at the keyboard and a restrained local bounce. Replaced the opaque window panel with lightly tinted transparent glazing. The exterior contains a clouded procedural night sky, dimensional rooftops, and selected illuminated apartment windows. Shortened the rear wall to the room's actual width so it no longer blocks the exterior sightline.

Removed the generic RoomEnvironment studio reflection. A static 512px-per-face cube probe captures the completed room with the screen hidden, then PMREM prefilters that capture for the convex glass and material roughness. The probe is captured once at scene setup; it does not dynamically reflect changing screen illumination. Glass uses a sharper clear coat with a subtler room-based reflection.

Browser screenshots checked the warm desk pool, visible exterior windows/rooftops, removal of the glass blob, and the powered-on intro. No renderer errors were returned. Type checks, lint, all 16 tests, and the production build pass. The probe's setup cost has not been profiled on physical phones.

## Lighting lab and selected preset

Added development-only live lighting controls, local persistence, JSON export, reset, scene restart, and explicit reflection refresh. Slider interactions cannot trigger portfolio keyboard navigation. Browser checks confirmed live value changes, persistence after reload, reset, and reflection refresh without renderer errors. Production output was checked to exclude the panel, its CSS, and the development storage key.

Applied the owner's supplied preset as the checked-in defaults: ambient .45, environment 2, fill .42, desk 17.3, bedside 6, window 60, haze .045, exposure 1.68, screen .7, reflection 1.48, roughness .13, clear-coat roughness .055, and lamp colour #ffb66d. The desk shade, diffuser, spotlight, and local bounce now point toward the keyboard centre. Applied these defaults in the review browser and visually verified the illuminated keys. All 17 tests, type checks, lint, and build pass; the new settings test covers malformed stored values and bounds.
