# Screen-light readback stall

Source: `/Users/louis/Downloads/Trace-20260906T082234.json.gz`.

The CPU profile attributes approximately 4,553 ms of sampled wall time to
`getBufferSubData`. The rendering thread has 86 microtask executions longer than
16 ms, including 43 over 50 ms, with a maximum of 82.74 ms. Long timer tasks run
Three.js's async readback fence probe, followed by the blocking buffer copy.
The separate 130 ms animation callback overlaps profiler startup and should not
be treated as ordinary rendering cost.

`screenLightSampler.ts` previously averaged the screen to one GPU pixel, then
called `readRenderTargetPixelsAsync` every 125 ms to drive a RectAreaLight.
That API still uses `getBufferSubData`, which stalls on the captured driver.

The replacement keeps the average and exponential smoothing in two alternating
1×1 GPU textures. Room materials sample that texture to colour the TV's existing
area light, preserving its geometry, brightness cap and attenuation. The glass
reflection shader hook is composed with the new hook. No CPU pixel reads or
readback polling timers remain. The room currently has exactly one area light;
adding another requires distinguishing it in the shader hook.

Validation:
- All 24 existing tests pass.
- Type checking, lint and production build pass (existing large-chunk advisory).
- `node scripts/check-screen-light.mjs` runs isolated real WebGL checks with no
  app UI or external network. Set CHROME_PATH when needed outside macOS.
- HDR and RGBA8 fallback: red/blue response, off/on, zero brightness, glass hook
  composition, no GL errors, and zero readPixels/getBufferSubData calls during
  updates all pass. Test-only pixel reads inspect the output outside updates.
- Isolated test update/render CPU p95 was 0.5 ms for each format. This is not an
  end-to-end application frame-time benchmark; a fresh matching app trace is
  required to quantify the overall improvement.
