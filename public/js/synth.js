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
    { id: 'layer', name: 'Layer', tip: 'A second tone stacked on top. An octave up adds sparkle, a 5th sounds bigger, like a power chord.' },
    { id: 'bell', name: 'Bell (FM)', tip: 'One sine wobbling the pitch of another very fast makes metallic, bell-like overtones: the Marshmello chime. Ratio picks which overtones, Ring is how long they shimmer.' },
    { id: 'filter', name: 'Filter', tip: 'Shapes the brightness. Low-pass darkens, resonance adds a squelchy peak, and the envelope makes each note start bright then close down (that is a pluck).' },
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
    { k: 'fm', g: 'bell', label: 'Amount', min: 0, max: 1, step: 0.01, fmt: v => (v ? pct(v) : 'off') },
    { k: 'ratio', g: 'bell', label: 'Ratio', min: 0.5, max: 8, step: 0.5, fmt: v => v + ' : 1' },
    { k: 'fmDecay', g: 'bell', label: 'Ring', min: 0.03, max: 2, log: true, fmt: ms },
    { k: 'ftype', g: 'filter', label: 'Type', type: 'choice', options: FILTERS },
    { k: 'cut', g: 'filter', label: 'Cutoff', min: 100, max: 12000, log: true, fmt: hz },
    { k: 'res', g: 'filter', label: 'Resonance', min: 0, max: 20, step: 0.1, fmt: v => v.toFixed(1) },
    { k: 'env', g: 'filter', label: 'Envelope', min: 0, max: 1, step: 0.01, fmt: pct },
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
    wave2: 'sine', osc2: 0, semi2: 12,
    fm: 0, ratio: 2, fmDecay: 0.3,
    ftype: 'lowpass', cut: 6000, res: 1, env: 0.3, fdec: 0.2,
    att: 0.005, dec: 0.3, sus: 0.6, rel: 0.15, vol: 0.8,
    lfo: 'off', lfoRate: 5, lfoDepth: 0.2,
  };
  const P = o => ({ ...BASE, ...o });

  // Common lead sounds. Each one is a starting point, not a finished patch.
  const PRESETS = [
    { id: 'chime', name: 'Future bass chime', who: 'Marshmello', p: P({ wave: 'sine', voices: 2, detune: 5, oct: 1, blip: 2, osc2: 0.3, semi2: 12, fm: 0.35, ratio: 3.5, fmDecay: 0.25, cut: 7000, env: 0.3, att: 0.003, dec: 0.4, sus: 0.35, rel: 0.4, vol: 0.85 }) },
    { id: 'supersaw', name: 'Supersaw', who: 'Trance, future bass drops', p: P({ wave: 'sawtooth', voices: 7, detune: 25, wave2: 'sawtooth', osc2: 0.5, semi2: -12, cut: 5000, env: 0.4, fdec: 0.3, att: 0.01, dec: 0.3, sus: 0.8, rel: 0.3, vol: 1 }) },
    { id: 'chip', name: 'Chiptune square', who: 'TheFatRat, 8-bit', p: P({ wave: 'square', cut: 12000, res: 0, env: 0, att: 0.002, dec: 0.1, sus: 0.7, rel: 0.05, lfo: 'pitch', lfoRate: 6, lfoDepth: 0.15, vol: 0.6 }) },
    { id: 'pluck', name: 'Bright pluck', who: 'TheFatRat, house', p: P({ wave: 'sawtooth', voices: 2, detune: 8, wave2: 'square', osc2: 0.4, semi2: 12, cut: 900, res: 6, env: 1, fdec: 0.15, att: 0.002, dec: 0.25, sus: 0, rel: 0.2, vol: 1 }) },
    { id: 'squarelead', name: 'Square lead', who: 'Glitch-hop, dubstep', p: P({ wave: 'square', voices: 2, detune: 10, wave2: 'square', osc2: 0.4, semi2: 12, cut: 3000, res: 3, env: 0.5, fdec: 0.2, att: 0.003, dec: 0.3, sus: 0.6, rel: 0.15, lfo: 'pitch', lfoRate: 5.5, lfoDepth: 0.1, vol: 0.65 }) },
    { id: 'bell', name: 'Cinematic bell', who: 'Matthew Parker', p: P({ wave: 'sine', oct: 1, fm: 0.6, ratio: 3.5, fmDecay: 0.8, cut: 9000, env: 0, att: 0.002, dec: 1.2, sus: 0, rel: 1, vol: 0.6 }) },
    { id: 'keys', name: 'Electric piano', who: 'Matthew Parker, lo-fi', p: P({ wave: 'sine', wave2: 'triangle', osc2: 0.25, semi2: 12, fm: 0.25, ratio: 1, fmDecay: 0.5, cut: 6000, res: 0, env: 0.1, att: 0.003, dec: 0.8, sus: 0.25, rel: 0.35, lfo: 'amp', lfoRate: 4, lfoDepth: 0.2, vol: 0.9 }) },
    { id: 'acid', name: 'Acid squelch', who: 'Techno, acid house', p: P({ wave: 'sawtooth', cut: 500, res: 14, env: 1, fdec: 0.2, att: 0.003, dec: 0.2, sus: 0.5, rel: 0.08, vol: 0.7 }) },
    { id: 'brass', name: 'Synthwave brass', who: 'Synthwave, 80s', p: P({ wave: 'sawtooth', voices: 3, detune: 12, wave2: 'square', osc2: 0.5, semi2: 0, cut: 1500, res: 2, env: 0.6, fdec: 0.5, att: 0.06, dec: 0.5, sus: 0.7, rel: 0.3, lfo: 'pitch', lfoRate: 5, lfoDepth: 0.08, vol: 0.7 }) },
    { id: 'flute', name: 'Soft flute', who: 'Chill, DnB melodies', p: P({ wave: 'triangle', wave2: 'sine', osc2: 0.2, semi2: 12, cut: 4000, res: 0.5, env: 0.1, att: 0.06, dec: 0.3, sus: 0.8, rel: 0.25, lfo: 'pitch', lfoRate: 5, lfoDepth: 0.2, vol: 0.7 }) },
    { id: 'wobble', name: 'Wobble lead', who: 'Dubstep, riddim', p: P({ wave: 'sawtooth', voices: 3, detune: 15, cut: 600, res: 8, env: 0.2, att: 0.005, dec: 0.3, sus: 0.8, rel: 0.1, lfo: 'filter', lfoRate: 4, lfoDepth: 0.7, vol: 0.55 }) },
  ];
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

  return { WAVES, FILTERS, LFO_TARGETS, GROUPS, PARAMS, BASE, PRESETS, byId, normalize, toSlider, fromSlider, same };
})();
if (typeof module !== 'undefined') module.exports = Synth; // lets node --test require it; browsers ignore this
