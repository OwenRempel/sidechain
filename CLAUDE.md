# Sidechain

An EDM groovebox and theory lab, built toward an AI-assisted song builder. The owner is a videographer/dev who wants to make music that blends **Matthew Parker** (cinematic piano, hopeful builds), **TheFatRat** (bright plucky/chiptune leads, glitch-hop bounce) and **Marshmello** (future-bass sidechained supersaw chords, chime leads, vocal chops).

**Core philosophy:** learn music by *relationships and feel* first (what connects, why it works, what emotion it creates), then frequencies, and note names last. Every teaching feature should be hearable with one tap.

## Run

```
node server.js          # http://localhost:5173 (Node 18+, zero dependencies)
npm run check           # syntax-check all JS
npm test                # node:test suite in test/ (theory helpers + server smoke tests)
```
Run `npm run check && npm test` before committing. PR CI only runs `npm run check` (Node 22) to stay light; the Pages deploy runs check + tests before publishing.
`.github/workflows/pages.yml` deploys `public/` to GitHub Pages on every push to main, so keep asset paths relative (the site lives under `/sidechain/`).
Cloud sessions run `.claude/hooks/session-start.sh`, which checks the Node version and syntax (and runs `npm ci` if a lockfile ever appears).
Copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY` to enable `/api/arrange`.

## Structure

```
server.js              static server + /api/arrange (Claude API proxy; key stays server-side)
public/index.html      Groovebox page
public/synth.html      Synth page: the lead synth full-size, pictures pinned on top, playable keyboard (touch, computer keys, Web MIDI) pinned at the bottom
public/lab.html        Theory Lab page (Harmony + Rhythm tabs)
public/css/app.css     shared tokens and components (dark hardware look, single theme)
public/css/lab.css     lab-only styles
public/js/groovebox.js sequencer, Web Audio synth engine, style generators (monolithic prototype)
public/js/leadvoice.js startLead(ctx, dest, params, t, hz, vel) -> {release(at)}: the lead voice, shared by both pages
public/js/synthpanel.js createSynthPanel(root, hooks): the lead synth panel UI + pictures, shared by both pages
public/js/synthpage.js Synth page keyboard + audio; reads/writes only .synth/.synthId of localStorage['sidechain-v1'] and follows the Groovebox via the storage event
public/js/synth.js     lead synth params, presets (with categories), Simple-view macros, and the maths behind the synth pictures (wave, spectrum, envelope); pure + tested. leadvoice.js plays it
public/js/midi.js      Standard MIDI File export (type 1, drums ch10)
public/js/theory.js    pure theory data and helpers (no DOM/audio, unit-testable)
public/js/lab.js       Theory Lab UI and preview audio
test/                  node:test suites; theory.js exports via module.exports when loaded in Node
```

Plain ES scripts, no build step. Keep it that way until a feature needs a bundler. If you add one, use Vite.

## Data model (shared by Groovebox, Lab, MIDI, arranger)

- `key`: tonic pitch class 0-11. `scale`: `major | minor | dorian | phrygian`.
- `prog`: array of **scale-degree indices** (0 = home), one chord per bar. Chord = degrees r, r+2, r+4.
- `pat`: 16-step patterns. Drums are numbers (0 off, 0.5 soft, 1 full). `bass`/`lead` are `{d, len, v, w?}`, with `d` a scale degree relative to the current chord root and `w` the wobble rate multiplier.
- The Lab hands a progression to the Groovebox via `localStorage['sidechain-handoff'] = {key, scale, prog}`.
- Groovebox state persists in `localStorage['sidechain-v1']`. `S.synth` holds the lead synth params (keys in `Synth.PARAMS`), `S.synthId` the preset it came from (`u:<name>` for a saved one). Saved lead sounds live in `localStorage['sidechain-presets']`.

## Status

Done (v0.1, untested in a real browser session, so verify audio first):
- Groovebox: 7 styles incl. **Future Bass** (half-time, IV-V-vi-I, pumping chord stabs, sine "chime" lead with pitch blip), arrange mode (intro/build/drop), macros, MIDI export.
- Theory Lab / Harmony: key family with roles + emotions, circle of fifths highlighting the key family, progressions by feeling (→ sends to Groovebox), movement moves (borrowed iv, ♭VI-♭VII-I, ♭VII, secondary dominant, relative minor, key change), overtone visualizer (shared vs near-miss harmonics).
- Theory Lab / Rhythm: drum jobs, 6 genre beats, circular beat clock, busy/syncopated/driving meters, swing and tempo.
- Server: `/api/arrange` endpoint drafted, **not yet wired to the UI**.

## Roadmap (next tasks, in priority order)

1. **Engine refactor:** move instruments out of groovebox.js into `engine.js` as `createEngine(ctx)` so it works with an `OfflineAudioContext`. Unlocks:
2. **WAV export:** render N bars offline (and stems per track).
3. **Synth layer (M1):** lead synth panel done (osc + unison, layer osc, FM bell, filter + env, ADSR, LFO, 11 presets, save/load your own). It has a Simple view (Brightness, Thickness, Pluck ↔ Swell, Movement, Octave) and All controls, plus pictures of the wave (live while the lead plays), overtones vs. filter, and the note's volume/brightness over time. Keep envAt() in synth.js in step with leadvoice.js when changing the voice. 28 presets in 5 categories; Drive and Air (noise) controls; pop-out Synth page with keyboard. Still to do: same panel for bass and chords. Originally: per-track synth panel with oscillator type, unison/detune, filter, ADSR, LFO, plus an FM bell layer for Marshmello-style chimes. Save/load presets.
4. **Multi-bar patterns (M2):** 4-8 bar patterns, A/B/C/D bank, piano-roll-lite for lead/chords.
5. **AI arranger UI (M3):** "Arrange with AI" button posts song state to `/api/arrange`, renders a section timeline, plays it back. Tighten the JSON schema and validate the response.
6. **Lab extras (M7/M8):** function wheel and Tonnetz views, emotion map (bright/dark × tense/resolved), "what chord next?" suggestions in the Groovebox, note names as an optional overlay, kick + bass frequency lock view.
7. **Polish (M5):** AI mastering step, "reimagine" via Suno upload (check commercial terms), PWA install, optional Tauri wrap for Windows.

Full plan with milestones: the "Sidechain — AI Music Builder Plan" doc in claude.ai.

## Conventions

- Audio: always start the AudioContext from a user gesture; schedule ahead with a lookahead loop (see `tick()`), never `setTimeout` per note.
- Theory content lives in `theory.js` as data, so new progressions, moves and beats are one-line additions.
- Mobile-first layouts (works at 400px). Colors come from CSS tokens in `app.css`.
- Keep teaching copy plain and short: what it feels like, then why.
