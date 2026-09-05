# Asset provenance

This is an independent personal portfolio recreation of the PS2 interface. It is not affiliated with Sony. Third-party assets retain their original ownership; their presence in public archives is not a grant of ownership of those assets.

## Portfolio content

- Original portfolio: https://github.com/LouisH98/LouisH98.github.io (main).
- Source greeting: `components/Greeting/Greeting.tsx`.
- Project order, destinations, and summaries: `components/Projects/Projects.tsx`.
- Original write-ups are retained in `references/original-content/`. The displayed versions are edited for reading, preserve factual distinctions between implemented features and planned work, and omit setup commands.
- Print Scheduler and LovePrint hero media come from the source portfolio’s `public/project-images` directory.
- LovePrint detail images come from https://github.com/LouisH98/loveprint-web-client/tree/master/images.
- The Screen animations come from https://github.com/LouisH98/the-screen/tree/master/images.
- Displayed GIF animations were transcoded to silent H.264 MP4 (CRF 23, yuv420p, fast-start) to reduce transfer size. PNG posters are their first frames. Reduced-motion users see the stills unless they choose to play a clip. Unused imported media are omitted from the build.

## Console assets

- Original BIOS menu effects: https://sounds.spriters-resource.com/playstation_2/systembios/asset/430102/page-1/
  - Archive: https://sounds.spriters-resource.com/media/assets/427/430102.zip?updated=1755546878
  - Cue identities and pitches verified against the labeled demonstration https://www.youtube.com/watch?v=3mvb9d-PASU (“Sony PlayStation & PlayStation 2 BIOS Sounds With Respective Pitches”), especially 258–270 seconds.
  - `cursor.wav`: `SCPH-10000_00021.wav`, 22050 Hz, original global menu scrolling sample (#13).
  - `confirm.wav`: `SCPH-10000_00022.wav`, 22050 Hz, global menu selection (#14).
  - `cancel.wav`: `SCPH-10000_00024.wav`, 9270 Hz, global menu exit (#14 at its exit pitch).
  - `save-select.wav`: `SCPH-10000_00023.wav`, 14716 Hz, memory-card selection (#14 at its memory-card pitch).
  - `setting.wav`: `SCPH-10000_00026.wav`, 13890 Hz, system-configuration scrolling (#15).
  - These are unmodified archive WAVs, with playback gain 0.14. They replace the incorrect startup samples previously mapped to menu actions. No synthesized cues or invented pitch shifts are used.
- Startup recording: https://www.youtube.com/watch?v=y9Ln-qyvX_I — the owner’s definitive “Playstation 2 Startup Intro (PS2)” reference.
  - Downloaded the 540×360 picture and Opus stereo audio for keyframe comparison. Extracted the first 12 seconds to stereo 44.1 kHz PCM16 WAV, with a 0.2-second end fade. No synthesis, pitch changes, or time stretching. Site gain: 0.12.
  - Bundled as `public/audio/startup-reference.wav`. Replaces the earlier no-disc capture so the long tower sequence and sound share one timeline.
  - The later disc-launch logo/sound section is excluded. The complete video is development-only and is not bundled. A half-second contact sheet is retained in `references/definitive-keyframes.jpg` (left-to-right, top-to-bottom, starting at 0 s).
- Ambient layer: https://github.com/BlacRyu/PS2-Menu-Wallpaper-Engine/blob/master/sounds/noise_low_100.ogg
  - Decoded to stereo 44.1 kHz PCM16 WAV, 9.999 seconds. Loops at gain 0.035.
  - Bundled as `public/audio/ambience.wav`. The reference’s `scene.json` identifies this file as the continuous low ambience layer.
- Console UI font: https://github.com/BlacRyu/PS2-Menu-Wallpaper-Engine/blob/master/fonts/NimbusSanL-Reg.ttf
  - Bundled as `app/fonts/console-ui.ttf`, with the supplied license retained at `public/font-license.txt`.
  - The font is rasterized to a small canvas backing store with quantized alpha coverage. Accessible DOM labels accompany every bitmap label.

## Visual references and authored work

- Console boot reference: https://www.youtube.com/watch?v=6hVTocP054g
- Sony PS2 manual: https://www.playstation.com/content/dam/global_pdc/en/corporate/support/manuals/ps2-docs/scph-90004/SCPH-90002CB_90003CB_PS2_UG_EN.pdf
- Tower geometry, camera choreography, mist, particles, orbiting lights, save icons, and layout are authored in this repository. Save icons represent Louis’s projects; they are not extracted game-save models.
- The tiny ring favicon is an authored geometric mark.

## Definitive animation reference

The owner selected https://www.youtube.com/watch?v=y9Ln-qyvX_I after reviewing earlier iterations. Its tower sequence is materially longer than the earlier no-disc recording. The current camera uses nine fitted keyframes with continuous cubic interpolation: near-wide framing for 0–7 s, a rapid dive at 7–9.05 s, and a background fade at 8.15–9.05 s. The title appears at approximately 0.45 s and fades out at 2.5–2.95 s.

At the owner’s request, the colored orbs and trails remain visible above the background fade. Their transition into the menu at 9.05–12 s replaces the reference’s subsequent disc-launch screen; no final PlayStation logo screen is shown. Camera depth is fitted to apparent tower growth, not recovered from original BIOS data. Geometry and orb choreography remain authored approximations.

`references/animation.html?time=0` is a development-only fixed-time scene viewer, served by Vite on port 3000. Change `time` to inspect the same camera timestamp as a reference frame. It is not included in the Pages build.

## Latest interface reference

Memory-card Browser layout follows the owner-supplied screenshot: gray gradient, outlined white memory-card label, yellow selected-save title at top right, free-standing icon grid, white selection glow, and controller prompts along the bottom. Only the three actual portfolio projects are shown; no fictional game saves or free-space count are inserted. The PS2 logo has been removed and the boot title is “Louis Computer Entertainment”.
