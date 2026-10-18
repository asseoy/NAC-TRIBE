# NAC FIGHTERS — BATTLE FOR HANASI · progress

Status (2026-10-18): playable and tested. Each item below was checked in an automated browser (Playwright/Chromium).

## Works and tested
- Main menu: PLAY / PLAYER VS PLAYER / PLAYER VS COMPUTER / HOW TO PLAY / SETTINGS / BACK TO TRIBE WEBSITE.
- Menus work with both keyboard and mouse.
- Character select:
  - P1 and P2 cursors, lock with READY!.
  - Animated preview, stats and moves.
  - Pick one of 3 arenas or random.
  - Fits on a landscape phone.
- VS screen, ROUND 1 / FIGHT!, 99 timer, best of 3, K.O. with slow motion, TIME OVER.
- Victory screen: REMATCH / CHANGE CHARACTER / MAIN MENU (REMATCH tested).
- PvP on one keyboard:
  - P1: A/D/W/S + F/G/H/R.
  - P2: arrows + K/L/;/O.
  - Tested: walking, attacks, specials, jumping.
- Keys can be remapped in SETTINGS (saved in localStorage).
- PvC: Easy / Normal / Hard.
  - The AI uses delayed perception (a history buffer) and never reads inputs.
  - AI vs AI tested to a K.O. with no errors.
- 5 fighters, each with:
  - 7 normal moves, 4 specials and 1 ultimate.
  - A skeletal IK rig with real animation (no sliding images).
  - Physics for cape, hair and tail.
  - Cel shading.
- 5 ultimates:
  - HELL MODE, RED RAGE, CRIMSON STORM, CHAOS COMBO, SHADOW DIMENSION.
  - Each has a freeze, a face zoom, a cut-in with the portrait and name, and unblockable damage of about 25–35%.
  - All 5 tested with no errors.
- Combat systems:
  - Hitboxes and hurtboxes.
  - High/low blocking.
  - Hitstun, hitstop and knockback.
  - Juggle limit.
  - Combo scaling, plus COMBO counter text.
  - Health bar with a delayed-damage bar.
  - Meter showing ULTIMATE READY!.
- Arenas: Inferno, Tribal Battleground (with the tribe logo) and Shadow Temple, each with parallax.
- Audio (WebAudio, fully synthesized, no external files):
  - SFX and 4 music tracks.
  - Separate volume controls.
- Pause with Esc/P.
- Mobile:
  - Joystick, 4 buttons and a pause button; touch tested.
  - Portrait mode shows a "rotate your phone" message.
- Linked from the main site with a separate banner above the arcade (not inside it).

## Known limits / honesty
- The fighters are drawn in code (a vector rig) based on the supplied character image. They are not hand-drawn sprite sheets.
- The original image appears in portraits, the VS screen, the victory screen and the ultimate cut-ins.
- Headless software rendering (no GPU) is slow during ultimates. A normal browser with a GPU should hold 60fps, but this has not been measured on a real phone.

## Files
- `index.html`
- `css/style.css`
- `js/`: util, audio, input, rig, chars, fx, arenas, fighter, ultimates, ai, match, ui, main
- `assets/*.webp`: the 5 character art cut-outs
