// Lead synth: parameter specs, presets and helpers. Pure data, no DOM or audio, so it is unit-testable.
// The Groovebox's lead() voice reads these params; the synth panel is built from PARAMS.
const Synth = (() => {
  const WAVES = [['sine', 'Sine'], ['triangle', 'Tri'], ['square', 'Square'], ['sawtooth', 'Saw']];
  const FILTERS = [['lowpass', 'Low'], ['bandpass', 'Band'], ['highpass', 'High']];
  const LFO_TARGETS = [['off', 'Off'], ['pitch', 'Pitch'], ['filter', 'Filter'], ['amp', 'Volume']];
  const INTERVAL = { '-12': 'oct down', '-5': '4th down', 0: 'unison', 3: 'min 3rd', 4: 'maj 3rd', 5: '4th', 7: '5th', 12: 'oct up', 19: '5th+oct', 24: '2 oct up' };

  const ms = v => (v < 1 ? Math.round(v * 1000) + ' ms' : v.toFixed(2) + ' s');
  const pct = v => Math.round(v * 100) + '%';
  const hz = v => (v >= 1000 ? (v / 1000).toFixed(1) + ' kHz' : Math.round(v) + ' Hz');
  const signed = v => (v > 0 ? '+' : '') + v;

  // Grouped so the panel can show one short "what it does" line per group.
  const GROUPS = [
    { id: 'osc', name: 'Tone', tip: 'The raw sound. Sine is pure and soft, triangle hollow, square buzzy and retro, saw bright and rich. More voices plus spread = wider (the supersaw sound).' },
    { id: 'layer', name: 'Layer', tip: 'A second tone stacked on top. An octave up adds sparkle, a 5th sounds bigger, like a power chord. Air mixes in a breathy hiss, like a flute or a whispered vocal.' },
    { id: 'bell', name: 'Bell (FM)', tip: 'One sine wobbling the pitch of another very fast makes metallic, bell-like overtones: the Marshmello chime. Ratio picks which overtones, Ring is how long they shimmer.' },
    { id: 'filter', name: 'Filter', tip: 'Shapes the brightness. Low-pass darkens, resonance adds a squelchy peak, and the envelope makes each note start bright then close down (that is a pluck). Drive pushes the sound into distortion for grit and bite.' },
    { id: 'amp', name: 'Envelope', tip: 'The shape of each note over time: how fast it starts, fades, holds and lets go. Short decay with no sustain = pluck. Slow attack = swell.' },
    { id: 'lfo', name: 'Movement (LFO)', tip: 'A slow wave that moves something for you. Pitch = vibrato, filter = wobble, volume = tremolo.' },
  ];

  // type: 'choice' (buttons), 'range' (slider). log: slider moves exponentially between min and max.
  const PARAMS = [
    { k: 'wave', g: 'osc', label: 'Wave', type: 'choice', options: WAVES },
    { k: 'voices', g: 'osc', label: 'Voices', min: 1, max: 7, step: 1, fmt: v => String(v) },
    { k: 'detune', g: 'osc', label: 'Spread', min: 0, max: 50, step: 1, fmt: v => v + ' ct' },
    { k: 'oct', g: 'osc', label: 'Octave', min: -1, max: 2, step: 1, fmt: signed },
    { k: 'blip', g: 'osc', label: 'Pitch blip', min: 0, max: 12, step: 1, fmt: v => (v ? v + ' st' : 'off') },
    { k: 'wave2', g: 'layer', label: 'Wave', type: 'choice', options: WAVES },
    { k: 'osc2', g: 'layer', label: 'Level', min: 0, max: 1, step: 0.01, fmt: pct },
    { k: 'semi2', g: 'layer', label: 'Interval', min: -12, max: 24, step: 1, fmt: v => INTERVAL[v] || signed(v) + ' st' },
    { k: 'noise', g: 'layer', label: 'Air', min: 0, max: 1, step: 0.01, fmt: v => (v ? pct(v) : 'off') },
    { k: 'fm', g: 'bell', label: 'Amount', min: 0, max: 1, step: 0.01, fmt: v => (v ? pct(v) : 'off') },
    { k: 'ratio', g: 'bell', label: 'Ratio', min: 0.5, max: 8, step: 0.5, fmt: v => v + ' : 1' },
    { k: 'fmDecay', g: 'bell', label: 'Ring', min: 0.03, max: 2, log: true, fmt: ms },
    { k: 'ftype', g: 'filter', label: 'Type', type: 'choice', options: FILTERS },
    { k: 'cut', g: 'filter', label: 'Cutoff', min: 100, max: 12000, log: true, fmt: hz },
    { k: 'res', g: 'filter', label: 'Resonance', min: 0, max: 20, step: 0.1, fmt: v => v.toFixed(1) },
    { k: 'env', g: 'filter', label: 'Envelope', min: 0, max: 1, step: 0.01, fmt: pct },
    { k: 'drive', g: 'filter', label: 'Drive', min: 0, max: 1, step: 0.01, fmt: v => (v ? pct(v) : 'off') },
    { k: 'fdec', g: 'filter', label: 'Env decay', min: 0.02, max: 1.5, log: true, fmt: ms },
    { k: 'att', g: 'amp', label: 'Attack', min: 0.002, max: 1, log: true, fmt: ms },
    { k: 'dec', g: 'amp', label: 'Decay', min: 0.02, max: 2, log: true, fmt: ms },
    { k: 'sus', g: 'amp', label: 'Sustain', min: 0, max: 1, step: 0.01, fmt: pct },
    { k: 'rel', g: 'amp', label: 'Release', min: 0.02, max: 2, log: true, fmt: ms },
    { k: 'vol', g: 'amp', label: 'Level', min: 0, max: 1, step: 0.01, fmt: pct },
    { k: 'lfo', g: 'lfo', label: 'Target', type: 'choice', options: LFO_TARGETS },
    { k: 'lfoRate', g: 'lfo', label: 'Rate', min: 0.1, max: 12, log: true, fmt: v => v.toFixed(1) + ' Hz' },
    { k: 'lfoDepth', g: 'lfo', label: 'Depth', min: 0, max: 1, step: 0.01, fmt: pct },
  ];

  const BASE = {
    wave: 'sawtooth', voices: 1, detune: 0, oct: 0, blip: 0,
    wave2: 'sine', osc2: 0, semi2: 12, noise: 0,
    fm: 0, ratio: 2, fmDecay: 0.3,
    ftype: 'lowpass', cut: 6000, res: 1, env: 0.3, fdec: 0.2, drive: 0,
    att: 0.005, dec: 0.3, sus: 0.6, rel: 0.15, vol: 0.8,
    lfo: 'off', lfoRate: 5, lfoDepth: 0.2,
  };
  const P = o => ({ ...BASE, ...o });

  // Common lead sounds. Each one is a starting point, not a finished patch.
  const PRESETS = [
    { id: 'chime', cat: 'bells', name: 'Future bass chime', who: 'Marshmello', p: P({ wave: 'sine', voices: 2, detune: 5, oct: 1, blip: 2, osc2: 0.3, semi2: 12, fm: 0.35, ratio: 3.5, fmDecay: 0.25, cut: 7000, env: 0.3, att: 0.003, dec: 0.4, sus: 0.35, rel: 0.4, vol: 0.85 }) },
    { id: 'supersaw', cat: 'big', name: 'Supersaw', who: 'Trance, future bass drops', p: P({ wave: 'sawtooth', voices: 7, detune: 25, wave2: 'sawtooth', osc2: 0.5, semi2: -12, cut: 5000, env: 0.4, fdec: 0.3, att: 0.01, dec: 0.3, sus: 0.8, rel: 0.3, vol: 1 }) },
    { id: 'chip', cat: 'retro', name: 'Chiptune square', who: 'TheFatRat, 8-bit', p: P({ wave: 'square', cut: 12000, res: 0, env: 0, att: 0.002, dec: 0.1, sus: 0.7, rel: 0.05, lfo: 'pitch', lfoRate: 6, lfoDepth: 0.15, vol: 0.6 }) },
    { id: 'pluck', cat: 'plucks', name: 'Bright pluck', who: 'TheFatRat, house', p: P({ wave: 'sawtooth', voices: 2, detune: 8, wave2: 'square', osc2: 0.4, semi2: 12, cut: 900, res: 6, env: 1, fdec: 0.15, att: 0.002, dec: 0.25, sus: 0, rel: 0.2, vol: 1 }) },
    { id: 'squarelead', cat: 'leads', name: 'Square lead', who: 'Glitch-hop, dubstep', p: P({ wave: 'square', voices: 2, detune: 10, wave2: 'square', osc2: 0.4, semi2: 12, cut: 3000, res: 3, env: 0.5, fdec: 0.2, att: 0.003, dec: 0.3, sus: 0.6, rel: 0.15, lfo: 'pitch', lfoRate: 5.5, lfoDepth: 0.1, vol: 0.65 }) },
    { id: 'bell', cat: 'bells', name: 'Cinematic bell', who: 'Matthew Parker', p: P({ wave: 'sine', oct: 1, fm: 0.6, ratio: 3.5, fmDecay: 0.8, cut: 9000, env: 0, att: 0.002, dec: 1.2, sus: 0, rel: 1, vol: 0.6 }) },
    { id: 'keys', cat: 'plucks', name: 'Electric piano', who: 'Matthew Parker, lo-fi', p: P({ wave: 'sine', wave2: 'triangle', osc2: 0.25, semi2: 12, fm: 0.25, ratio: 1, fmDecay: 0.5, cut: 6000, res: 0, env: 0.1, att: 0.003, dec: 0.8, sus: 0.25, rel: 0.35, lfo: 'amp', lfoRate: 4, lfoDepth: 0.2, vol: 0.9 }) },
    { id: 'acid', cat: 'leads', name: 'Acid squelch', who: 'Techno, acid house', p: P({ wave: 'sawtooth', cut: 500, res: 14, env: 1, fdec: 0.2, att: 0.003, dec: 0.2, sus: 0.5, rel: 0.08, vol: 0.7 }) },
    { id: 'brass', cat: 'retro', name: 'Synthwave brass', who: 'Synthwave, 80s', p: P({ wave: 'sawtooth', voices: 3, detune: 12, wave2: 'square', osc2: 0.5, semi2: 0, cut: 1500, res: 2, env: 0.6, fdec: 0.5, att: 0.06, dec: 0.5, sus: 0.7, rel: 0.3, lfo: 'pitch', lfoRate: 5, lfoDepth: 0.08, vol: 0.7 }) },
    { id: 'flute', cat: 'leads', name: 'Soft flute', who: 'Chill, DnB melodies', p: P({ wave: 'triangle', wave2: 'sine', osc2: 0.2, semi2: 12, cut: 4000, res: 0.5, env: 0.1, att: 0.06, dec: 0.3, sus: 0.8, rel: 0.25, lfo: 'pitch', lfoRate: 5, lfoDepth: 0.2, vol: 0.7 }) },
    { id: 'wobble', cat: 'leads', name: 'Wobble lead', who: 'Dubstep, riddim', p: P({ wave: 'sawtooth', voices: 3, detune: 15, cut: 600, res: 8, env: 0.2, att: 0.005, dec: 0.3, sus: 0.8, rel: 0.1, lfo: 'filter', lfoRate: 4, lfoDepth: 0.7, vol: 0.55 }) },
    { id: 'trancepluck', cat: 'plucks', name: 'Trance pluck', who: 'Trance, progressive house', p: P({ wave: 'sawtooth', voices: 5, detune: 18, cut: 1200, res: 4, env: 0.9, fdec: 0.12, att: 0.002, dec: 0.22, sus: 0, rel: 0.25, vol: 1 }) },
    { id: 'marimba', cat: 'plucks', name: 'Tropical marimba', who: 'Tropical house, Kygo', p: P({ wave: 'sine', fm: 0.4, ratio: 4, fmDecay: 0.08, cut: 8000, env: 0, att: 0.002, dec: 0.35, sus: 0, rel: 0.2, vol: 0.95 }) },
    { id: 'kalimba', cat: 'plucks', name: 'Kalimba', who: 'Chill, lo-fi, cinematic', p: P({ wave: 'sine', oct: 1, fm: 0.3, ratio: 5, fmDecay: 0.05, cut: 9000, env: 0, att: 0.002, dec: 0.5, sus: 0, rel: 0.3, vol: 0.9 }) },
    { id: 'lofikeys', cat: 'plucks', name: 'Lo-fi keys', who: 'Lo-fi hip-hop, chill beats', p: P({ wave: 'triangle', wave2: 'sine', osc2: 0.2, semi2: 12, noise: 0.06, cut: 2200, res: 0.5, env: 0.15, drive: 0.2, att: 0.004, dec: 0.7, sus: 0.3, rel: 0.4, lfo: 'pitch', lfoRate: 0.6, lfoDepth: 0.15, vol: 0.9 }) },
    { id: 'harp', cat: 'plucks', name: 'Harp pluck', who: 'Matthew Parker, cinematic', p: P({ wave: 'triangle', wave2: 'sine', osc2: 0.3, semi2: 12, cut: 5000, env: 0.4, fdec: 0.2, att: 0.002, dec: 0.9, sus: 0, rel: 0.6, vol: 0.9 }) },
    { id: 'bigroom', cat: 'big', name: 'Big room lead', who: 'Big room, festival EDM', p: P({ wave: 'sawtooth', voices: 7, detune: 30, wave2: 'sawtooth', osc2: 0.6, semi2: -12, cut: 7000, env: 0.2, drive: 0.4, att: 0.005, dec: 0.2, sus: 1, rel: 0.1, vol: 0.85 }) },
    { id: 'hoover', cat: 'big', name: 'Hoover', who: 'Rave, hardstyle, 90s', p: P({ wave: 'sawtooth', voices: 5, detune: 40, wave2: 'square', osc2: 0.6, semi2: -12, blip: 3, cut: 3000, res: 2, env: 0.3, att: 0.01, dec: 0.4, sus: 0.8, rel: 0.25, lfo: 'pitch', lfoRate: 5, lfoDepth: 0.15, vol: 0.75 }) },
    { id: 'swell', cat: 'big', name: 'Supersaw swell', who: 'Future bass intros, trance breakdowns', p: P({ wave: 'sawtooth', voices: 7, detune: 30, wave2: 'sawtooth', osc2: 0.4, semi2: 12, cut: 4000, env: 0.1, att: 0.5, dec: 1, sus: 1, rel: 1.2, vol: 0.9 }) },
    { id: 'reese', cat: 'leads', name: 'Reese lead', who: 'Drum & bass, neuro', p: P({ wave: 'sawtooth', voices: 2, detune: 20, wave2: 'sawtooth', osc2: 0.7, semi2: -12, cut: 900, res: 3, env: 0.2, drive: 0.3, att: 0.005, dec: 0.3, sus: 0.9, rel: 0.15, lfo: 'filter', lfoRate: 0.4, lfoDepth: 0.4, vol: 0.75 }) },
    { id: 'whistle', cat: 'leads', name: 'Whistle', who: 'Pop-EDM toplines', p: P({ wave: 'sine', oct: 1, noise: 0.05, cut: 9000, env: 0, att: 0.04, dec: 0.3, sus: 0.9, rel: 0.15, lfo: 'pitch', lfoRate: 5.5, lfoDepth: 0.25, vol: 0.6 }) },
    { id: 'vocal', cat: 'leads', name: 'Vocal "ooh"', who: 'Future bass vocal-chop feel', p: P({ wave: 'sawtooth', wave2: 'sawtooth', osc2: 0.3, semi2: 12, ftype: 'bandpass', cut: 900, res: 3, env: 0.1, att: 0.05, dec: 0.3, sus: 0.8, rel: 0.25, lfo: 'pitch', lfoRate: 5, lfoDepth: 0.12, vol: 1 }) },
    { id: 'growl', cat: 'leads', name: 'Dubstep growl', who: 'Dubstep, riddim, brostep', p: P({ wave: 'sawtooth', voices: 3, detune: 10, wave2: 'square', osc2: 0.5, semi2: -12, fm: 0.4, ratio: 1, fmDecay: 2, cut: 1200, res: 10, env: 0.2, drive: 0.7, att: 0.005, dec: 0.3, sus: 0.9, rel: 0.1, lfo: 'filter', lfoRate: 6, lfoDepth: 0.8, vol: 0.55 }) },
    { id: 'musicbox', cat: 'bells', name: 'Music box', who: 'Lullaby intros, cinematic', p: P({ wave: 'sine', oct: 2, fm: 0.2, ratio: 4.5, fmDecay: 0.3, cut: 10000, env: 0, att: 0.002, dec: 0.8, sus: 0, rel: 0.5, vol: 0.8 }) },
    { id: 'glass', cat: 'bells', name: 'Glass bell', who: 'Ambient, future garage', p: P({ wave: 'sine', oct: 1, wave2: 'sine', osc2: 0.25, semi2: 19, fm: 0.45, ratio: 7, fmDecay: 0.6, cut: 10000, env: 0, att: 0.003, dec: 1.4, sus: 0.1, rel: 1.2, vol: 0.7 }) },
    { id: 'tri8', cat: 'retro', name: '8-bit triangle', who: 'NES, chiptune', p: P({ wave: 'triangle', cut: 12000, res: 0, env: 0, att: 0.002, dec: 0.1, sus: 0.85, rel: 0.04, vol: 0.7 }) },
    { id: 'arp', cat: 'retro', name: 'Synthwave arp', who: 'Synthwave, outrun', p: P({ wave: 'sawtooth', voices: 2, detune: 8, wave2: 'square', osc2: 0.3, semi2: 12, cut: 1400, res: 5, env: 0.7, fdec: 0.18, att: 0.002, dec: 0.2, sus: 0.2, rel: 0.15, vol: 1 }) },
    { id: 'softpad', cat: 'big', name: 'Soft pad lead', who: 'Ambient, chill, Matthew Parker', p: P({ wave: 'triangle', voices: 3, detune: 12, wave2: 'sine', osc2: 0.3, semi2: 12, noise: 0.03, cut: 3000, env: 0, att: 0.25, dec: 0.8, sus: 0.9, rel: 0.8, lfo: 'amp', lfoRate: 0.3, lfoDepth: 0.2, vol: 0.9 }) },
  ];
  const CATS = [['plucks', 'Plucks & keys'], ['leads', 'Leads'], ['bells', 'Bells & mallets'], ['big', 'Big & wide'], ['retro', 'Retro & chip']];
  const byId = id => PRESETS.find(x => x.id === id);

  // Fill missing keys and clamp everything into range, so old saves and hand-edited presets stay playable.
  function normalize(p = {}) {
    const out = {};
    for (const s of PARAMS) {
      const v = p[s.k], d = BASE[s.k];
      if (s.type === 'choice') out[s.k] = s.options.some(o => o[0] === v) ? v : d;
      else out[s.k] = typeof v === 'number' && isFinite(v) ? Math.min(s.max, Math.max(s.min, v)) : d;
    }
    return out;
  }
  // Log sliders run 0..1 on screen; these convert between slider position and value.
  const toSlider = (s, v) => (s.log ? Math.log(v / s.min) / Math.log(s.max / s.min) : v);
  const fromSlider = (s, x) => (s.log ? +(s.min * Math.pow(s.max / s.min, x)).toPrecision(3) : x);
  const same = (a, b) => PARAMS.every(s => (typeof a[s.k] === 'number' ? Math.abs(a[s.k] - b[s.k]) < 1e-6 : a[s.k] === b[s.k]));


  // ---- Simple view: four plain knobs (0..1) that each move several params at once ----
  const spec = k => PARAMS.find(s => s.k === k);
  const lerp = (a, b, x) => a + (b - a) * x, glerp = (a, b, x) => a * Math.pow(b / a, x);
  // Shape runs pluck (0) -> hit then settle (0.5) -> slow swell (1).
  const SHAPES = [{ att: 0.002, dec: 0.2, sus: 0, rel: 0.15 }, { att: 0.005, dec: 0.35, sus: 0.6, rel: 0.2 }, { att: 0.6, dec: 1, sus: 1, rel: 1.2 }];
  const MACROS = [
    { k: 'bright', label: 'Brightness', tip: 'Dark and muffled → bright and cutting',
      get: p => toSlider(spec('cut'), p.cut), set: (p, x) => ({ cut: fromSlider(spec('cut'), x) }) },
    { k: 'width', label: 'Thickness', tip: 'One thin voice → a wide stack of slightly detuned voices',
      get: p => (p.voices - 1) / 6, set: (p, x) => ({ voices: 1 + Math.round(x * 6), detune: Math.round(x * 35) }) },
    { k: 'shape', label: 'Pluck ↔ Swell', tip: 'Short plucks → notes that hold → slow fade-ins',
      get: p => (p.att > 0.02 ? 0.5 + 0.5 * Math.min(1, Math.log(p.att / 0.005) / Math.log(0.6 / 0.005)) : Math.min(0.5, p.sus * 0.5 / 0.6)),
      set: (p, x) => { const [a, b] = x < 0.5 ? [SHAPES[0], SHAPES[1]] : [SHAPES[1], SHAPES[2]], y = x < 0.5 ? x * 2 : x * 2 - 1;
        return { att: +glerp(a.att, b.att, y).toPrecision(3), dec: +glerp(a.dec, b.dec, y).toPrecision(3), sus: +lerp(a.sus, b.sus, y).toFixed(2), rel: +glerp(a.rel, b.rel, y).toPrecision(3) }; } },
    { k: 'motion', label: 'Movement', tip: 'Still → wobbling (vibrato, or whatever Movement targets)',
      get: p => (p.lfo === 'off' ? 0 : p.lfoDepth), set: (p, x) => ({ lfo: x < 0.01 ? 'off' : p.lfo === 'off' ? 'pitch' : p.lfo, lfoDepth: +x.toFixed(2) }) },
  ];
  const applyMacro = (p, k, x) => normalize({ ...p, ...MACROS.find(m => m.k === k).set(p, x) });

  // ---- Pictures: the same maths the lead voice uses, sampled for drawing ----
  const WAVE_FN = {
    sine: ph => Math.sin(2 * Math.PI * ph),
    triangle: ph => { const x = ph - Math.floor(ph); return x < 0.25 ? 4 * x : x < 0.75 ? 2 - 4 * x : 4 * x - 4; },
    square: ph => (ph - Math.floor(ph) < 0.5 ? 1 : -1),
    sawtooth: ph => 2 * (ph - Math.floor(ph + 0.5)),
  };
  // One sample of the steady tone at time t (seconds) for a note at f0 Hz: unison voices + layer, with the FM bell at full strength.
  function toneAt(p, t, f0) {
    const n = p.voices, idx = p.fm * 6 / (2 * Math.PI);
    let v = 0;
    for (let k = 0; k < n; k++) {
      const f = f0 * Math.pow(2, (n > 1 ? (k / (n - 1) * 2 - 1) * p.detune : 0) / 1200);
      v += WAVE_FN[p.wave](f * t + idx * Math.sin(2 * Math.PI * f0 * p.ratio * t));
    }
    v /= Math.sqrt(n);
    if (p.osc2 > 0) v += p.osc2 * WAVE_FN[p.wave2](f0 * Math.pow(2, p.semi2 / 12) * t);
    if (p.drive > 0) { const k = 1 + p.drive * 8; v = Math.tanh(k * v) / Math.tanh(k); }
    return v;
  }
  // `cycles` periods of the tone, normalised to -1..1.
  function waveShape(p, points = 240, cycles = 2) {
    const f0 = 100, out = [];
    for (let i = 0; i < points; i++) out.push(toneAt(p, (i / points) * cycles / f0, f0));
    const m = Math.max(1e-9, ...out.map(Math.abs));
    return out.map(v => v / m);
  }
  // Loudness (0..1) of each overtone band, log-spaced from `lo` to `hi` Hz, for a note at f0. Goertzel per band.
  function spectrum(p, f0 = 440, bands = 120, lo = 50, hi = 16000, sr = 44100, len = 2048) {
    const x = new Float32Array(len);
    for (let i = 0; i < len; i++) x[i] = toneAt(p, i / sr, f0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (len - 1)));
    const out = [];
    for (let b = 0; b < bands; b++) {
      const f = lo * Math.pow(hi / lo, b / (bands - 1)), w = 2 * Math.PI * f / sr, c = 2 * Math.cos(w);
      let s1 = 0, s2 = 0;
      for (let i = 0; i < len; i++) { const s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; }
      out.push({ f, mag: Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2)) });
    }
    const m = Math.max(1e-9, ...out.map(o => o.mag));
    return out.map(o => ({ f: o.f, mag: o.mag / m }));
  }
  // Volume and filter brightness over time for a note held `hold` seconds, mirroring lead() in groovebox.js.
  function envAt(p, t, hold) {
    const att = Math.max(0.002, p.att), relAt = Math.max(hold, att);
    const preRel = tt => (tt < att ? tt / att : p.sus + (1 - p.sus) * Math.exp(-(tt - att) / (p.dec / 3)));
    const amp = t < relAt ? preRel(t) : preRel(relAt) * Math.exp(-(t - relAt) / (p.rel / 4));
    const top = Math.min(18000, p.cut * (1 + p.env * 8)), cut = p.cut + (top - p.cut) * Math.exp(-Math.max(0, t - 0.003) / (p.fdec / 3));
    return { amp, cut };
  }
  // Plain-words summaries shown under each picture.
  const brightWord = c => (c < 600 ? 'Dark' : c < 2500 ? 'Warm' : c < 7000 ? 'Bright' : 'Very bright');
  function describe(p) {
    const wn = Object.fromEntries(WAVES)[p.wave], w2 = Object.fromEntries(WAVES)[p.wave2];
    const tone = `${wn}${p.voices > 1 ? ` × ${p.voices} voices` : ''}${p.osc2 > 0.02 ? ` + ${w2} ${INTERVAL[p.semi2] || p.semi2 + ' st'}` : ''}${p.fm > 0.02 ? ' + bell shimmer' : ''}${p.noise > 0.02 ? ' + air' : ''}`;
    const shape = p.att > 0.1 ? 'Swell: fades in slowly' : p.sus < 0.1 ? 'Pluck: hits, then fades away' : p.sus > 0.75 ? 'Holds steady while the note is on' : 'Hits, then settles to a lower level';
    const move = p.lfo === 'off' || p.lfoDepth < 0.01 ? '' : ` · ${{ pitch: 'Vibrato', filter: 'Filter wobble', amp: 'Tremolo' }[p.lfo]} at ${p.lfoRate.toFixed(1)} Hz`;
    return { tone, bright: `${brightWord(p.cut)}${p.res > 6 ? ', with a resonant peak' : ''}${p.drive > 0.15 ? ', driven' : ''}${p.env > 0.3 ? ', opens on each hit' : ''}`, shape: shape + move };
  }

  return { WAVES, FILTERS, LFO_TARGETS, GROUPS, PARAMS, BASE, PRESETS, CATS, MACROS, byId, normalize, toSlider, fromSlider, same, applyMacro, toneAt, waveShape, spectrum, envAt, describe };
})();
if (typeof module !== 'undefined') module.exports = Synth; // lets node --test require it; browsers ignore this
