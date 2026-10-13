// Music theory data + pure helpers. No DOM, no audio — safe to unit test.
const Theory = (() => {
  const NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const QUAL = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], dom7: [0, 4, 7, 10] };
  const SUFFIX = { maj: '', min: 'm', dim: '°', dom7: '7' };

  // Role + feeling for each scale degree. This is the "jobs, not names" layer.
  const DEGREES = {
    major: [
      { rn: 'I', q: 'maj', role: 'home', feel: 'Settled, bright, resolved' },
      { rn: 'ii', q: 'min', role: 'away', feel: 'Gentle, on the move' },
      { rn: 'iii', q: 'min', role: 'away', feel: 'Wistful, floating' },
      { rn: 'IV', q: 'maj', role: 'away', feel: 'Open, lifting, hopeful' },
      { rn: 'V', q: 'maj', role: 'tension', feel: 'Strong pull back home' },
      { rn: 'vi', q: 'min', role: 'home', feel: 'Bittersweet, emotional (the sad home)' },
      { rn: 'vii°', q: 'dim', role: 'tension', feel: 'Unstable, nervous' },
    ],
    minor: [
      { rn: 'i', q: 'min', role: 'home', feel: 'Dark, serious, grounded' },
      { rn: 'ii°', q: 'dim', role: 'tension', feel: 'Uneasy, searching' },
      { rn: 'III', q: 'maj', role: 'away', feel: 'A ray of hope' },
      { rn: 'iv', q: 'min', role: 'away', feel: 'Sad, soulful' },
      { rn: 'v', q: 'min', role: 'tension', feel: 'Soft pull home' },
      { rn: 'VI', q: 'maj', role: 'away', feel: 'Epic, cinematic swell' },
      { rn: 'VII', q: 'maj', role: 'tension', feel: 'Heroic push forward' },
    ],
  };

  // Progressions as scale-degree indices (0 = home). Same format the Groovebox uses.
  const PROGRESSIONS = [
    { mode: 'major', name: 'Future bass lift', deg: [3, 4, 5, 0], feel: 'The Marshmello move: rises, rises, a twinge of sad, then home. Euphoric.' },
    { mode: 'major', name: 'Uplifting anthem', deg: [0, 4, 5, 3], feel: 'The most-used pop/EDM loop. Confident and singable.' },
    { mode: 'major', name: 'Bittersweet anthem', deg: [5, 3, 0, 4], feel: 'Same 4 chords starting on the sad home. Emotional, big-chorus energy.' },
    { mode: 'major', name: 'Nostalgic', deg: [0, 5, 3, 4], feel: '50s/80s feel. Warm, looking back.' },
    { mode: 'major', name: 'Dreamy cinematic', deg: [0, 2, 5, 3], feel: 'Floating, a little wistful. Great under piano intros.' },
    { mode: 'minor', name: 'Epic cinematic', deg: [0, 5, 2, 6], feel: 'Trailer and trance staple. Dark start, huge swell.' },
    { mode: 'minor', name: 'Heroic', deg: [5, 6, 0, 0], feel: 'Climbs into the home chord like a hero arriving.' },
    { mode: 'minor', name: 'Dark drive', deg: [0, 6, 5, 6], feel: 'Brooding and relentless. Techno and DnB.' },
    { mode: 'minor', name: 'Sad and soulful', deg: [0, 3, 5, 4], feel: 'Heavy-hearted, slow-burning.' },
  ];

  // Movement moves: chords outside the family. Roots are semitones above the major home.
  const MOVES = [
    { name: 'Borrowed minor four', seq: [[0, 'maj'], [5, 'maj'], [5, 'min'], [0, 'maj']],
      why: 'Swap the bright IV for a minor iv borrowed from the dark key. Instant bittersweet sigh. Cinematic and very Matthew Parker.' },
    { name: 'Victory cadence (♭VI–♭VII–I)', seq: [[8, 'maj'], [10, 'maj'], [0, 'maj']],
      why: 'Two borrowed major chords stair-step into home. Sounds like winning a level. Very TheFatRat.' },
    { name: '♭VII lift', seq: [[0, 'maj'], [10, 'maj'], [5, 'maj'], [0, 'maj']],
      why: 'A major chord a step below home. Rock/anthem swagger without leaving the key\'s vibe.' },
    { name: 'Secondary dominant (into the sad home)', seq: [[0, 'maj'], [4, 'dom7'], [9, 'min'], [5, 'maj']],
      why: 'Turn iii into a major 7 chord so it pulls hard into vi. Adds drama right before the emotional chord.' },
    { name: 'Same notes, different home', seq: [[9, 'min'], [5, 'maj'], [0, 'maj'], [7, 'maj']],
      why: 'Every major key has a relative minor using the exact same notes. Start on vi and the whole thing feels darker.' },
    { name: 'Key change up a step', seq: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj'], [2, 'maj'], [9, 'maj'], [11, 'min'], [7, 'maj']],
      why: 'Repeat the loop two semitones higher. The classic final-chorus energy jump.' },
  ];

  const INTERVALS = [
    { name: 'Octave', semis: 12, ratio: '2 : 1', feel: 'Same note, higher. Perfect lock.' },
    { name: 'Fifth', semis: 7, ratio: '3 : 2', feel: 'Strong, open, powerful (power chords)' },
    { name: 'Fourth', semis: 5, ratio: '4 : 3', feel: 'Open, suspended' },
    { name: 'Major 3rd', semis: 4, ratio: '5 : 4', feel: 'Bright, happy' },
    { name: 'Minor 3rd', semis: 3, ratio: '6 : 5', feel: 'Sad, tender' },
    { name: 'Major 6th', semis: 9, ratio: '5 : 3', feel: 'Warm, sweet' },
    { name: 'Minor 7th', semis: 10, ratio: '16 : 9', feel: 'Bluesy, wants to move' },
    { name: 'Major 2nd', semis: 2, ratio: '9 : 8', feel: 'Gentle rub' },
    { name: 'Tritone', semis: 6, ratio: '45 : 32', feel: 'Unstable, eerie' },
    { name: 'Minor 2nd', semis: 1, ratio: '16 : 15', feel: 'Harsh, tense' },
  ];

  // Beats: 16 steps, x = hit, o = soft hit.
  const BEATS = [
    { name: 'Four on the floor', genre: 'House · Trance · Techno', bpm: 126, range: '120–140',
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.', ohat: '..x...x...x...x.',
      why: 'A kick on every beat is the heartbeat of dance music: constant, hypnotic, made for moving. The open hat between kicks gives the "tss" that pushes you forward.' },
    { name: 'Half-time', genre: 'Future bass · Dubstep', bpm: 140, range: '140–160 (feels 70–80)',
      kick: 'x.........x.....', snare: '........x.......', hat: 'x.o.x.o.x.o.x.o.', ohat: '................',
      why: 'The snare moves to beat 3, so the fast tempo feels half as fast: big, heavy and spacious. That room is what lets future-bass chords and drops hit so hard.' },
    { name: 'Two-step', genre: 'Drum & Bass', bpm: 172, range: '165–180',
      kick: 'x.........x.....', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.o.', ohat: '..............x.',
      why: 'Kick, snare, late kick, snare. The lopsided second kick creates the rolling, chasing energy of DnB.' },
    { name: 'Glitch-hop bounce', genre: 'TheFatRat · Glitch-hop', bpm: 110, range: '100–115',
      kick: 'x......x..x.....', snare: '....x.......x..o', hat: 'x.x.x.x.x.x.x.x.', ohat: '................',
      why: 'Hip-hop swagger at a dance tempo. Off-grid kicks make it bounce; add swing for extra groove.' },
    { name: 'Trap', genre: 'Trap · Future bass hybrids', bpm: 140, range: '130–160 (half-time)',
      kick: 'x.....x...x.....', snare: '........x.......', hat: 'x.x.xxx.x.x.xxxx', ohat: '................',
      why: 'Sparse, booming kicks and rapid hi-hat rolls. The rolls create excitement without crowding the low end.' },
    { name: 'Synthwave drive', genre: 'Synthwave · Retro', bpm: 100, range: '85–115',
      kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ohat: '................',
      why: 'An 80s rock beat on drum machines. Steady and nostalgic, so the synths and melody carry the emotion.' },
  ];

  const JOBS = [
    { id: 'kick', name: 'Kick', job: 'The pulse. Where your body moves. Owns the low end with the bass.' },
    { id: 'clap', name: 'Snare / Clap', job: 'The backbeat. Answers the kick and marks the "2 and 4" (or "3" in half-time).' },
    { id: 'hat', name: 'Closed hat', job: 'Motion and speed. Fills the gaps so the beat feels alive.' },
    { id: 'ohat', name: 'Open hat', job: 'Lift. The "tss" on off-beats pushes energy forward.' },
  ];

  const chordNotes = (rootSemi, q) => QUAL[q].map(i => rootSemi + i);
  const chordName = (tonic, rootSemi, q) => NOTE[((tonic + rootSemi) % 12 + 12) % 12] + SUFFIX[q];
  const degreeChord = (mode, d) => {
    const sc = SCALE[mode], info = DEGREES[mode][d % 7];
    return { root: sc[d % 7], q: info.q, ...info };
  };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const parseBeat = s => [...s].map(c => (c === 'x' ? 1 : c === 'o' ? 0.5 : 0));
  function beatStats(b) {
    const all = ['kick', 'snare', 'hat', 'ohat'].map(k => parseBeat(b[k]));
    const hits = all.flat().filter(Boolean).length;
    const kickSnare = [...all[0], ...all[1]].map((v, i) => (v && (i % 16) % 4 !== 0 ? 1 : 0));
    return { busy: Math.min(1, hits / 28), sync: Math.min(1, kickSnare.reduce((a, b) => a + b, 0) / 4), drive: Math.min(1, all[0].filter(Boolean).length / 4) };
  }
  // Melody. Notes are [scale degree from home (0 = home, 7 = octave up, null = rest), length in beats].
  const degSemi = (mode, d) => SCALE[mode][((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  // How a note (semitones above home) relates to the chord on scale degree chordDeg.
  const INT_NAME = ['Root', '♭2', '2nd', '♭3', '3rd', '4th', '♭5', '5th', '♭6', '6th', '♭7', '7th'];
  function noteRole(mode, chordDeg, semi) {
    const pc = ((semi % 12) + 12) % 12, root = degSemi(mode, chordDeg) % 12, iv = (pc - root + 12) % 12;
    const tones = [0, 2, 4].map(k => degSemi(mode, chordDeg + k) % 12), k = tones.indexOf(pc);
    if (k >= 0) return { role: 'chord', name: ['Root', '3rd', '5th'][k] };
    return { role: SCALE[mode].includes(pc) ? 'scale' : 'outside', name: INT_NAME[iv] };
  }
  const steps = (ds, len = 0.5) => ds.map(d => [d, len]);
  const arpBar = r => steps([r, r + 2, r + 4, r + 7, r + 4, r + 2, r + 4, r + 2]);
  const SHAPES = [
    { name: 'Climb', notes: [...steps([0, 1, 2, 3, 4, 5, 6]), [7, 2]],
      feel: 'Stepping up feels like hope and rising energy. Builds love this.' },
    { name: 'Fall home', notes: [...steps([7, 6, 5, 4, 3, 2, 1]), [0, 2]],
      feel: 'Stepping down settles things. It sounds like an ending or a sigh of relief.' },
    { name: 'Arch', notes: [...steps([0, 2, 4, 5, 7, 5, 4, 2]), [0, 1.5]],
      feel: 'Up to a peak, then relax. Most singable melodies are an arch.' },
    { name: 'Leap, then fill', notes: [[0, 1], [5, 1], ...steps([4, 3, 2, 1]), [0, 1.5]],
      feel: 'A big jump grabs attention; stepping back down fills the gap. Classic cinematic piano.' },
    { name: 'Hover', notes: [...steps([4, 4, 5, 4, 4, 2, 4, 4]), [4, 1.5]],
      feel: 'Sit on one note with small neighbours. Chant-like and bouncy, very chiptune.' },
  ];
  // Hooks play over a progression (one chord per 4 beats). Parts can be heard alone or together.
  const HOOKS = [
    { name: 'Question and answer', prog: [3, 4, 5, 0], wave: 'triangle',
      feel: 'The first phrase ends on a note that is not home, so it sounds like a question. The second ends on home: the answer. Almost every catchy chorus does this.',
      parts: [
        { label: 'Question', notes: [[4, 1], [4, 0.5], [5, 0.5], [4, 1], [2, 1], [3, 1], [2, 0.5], [1, 0.5], [1, 2]] },
        { label: 'Answer', notes: [[4, 1], [4, 0.5], [5, 0.5], [4, 1], [2, 1], [2, 1], [1, 0.5], [1, 0.5], [0, 2]] },
      ] },
    { name: 'Say it three times, then twist', prog: [0, 4, 5, 3], wave: 'square',
      feel: 'Repeat a short idea so it sticks, then change the last one so it does not get boring. The twist is what people remember.',
      parts: [
        { label: 'Repeat', notes: [0, 1, 2].flatMap(() => [[2, 0.5], [4, 0.5], [null, 0.5], [4, 0.5], [5, 1], [4, 1]]) },
        { label: 'Twist', notes: [[7, 0.5], [6, 0.5], [null, 0.5], [5, 0.5], [4, 2]] },
      ] },
    { name: 'Chord-tone chime', prog: [3, 4, 5, 0], wave: 'sine', oct: 12,
      feel: 'Only play the notes of each chord, up and down. It can never clash, so it sounds sparkly and safe. The Marshmello chime lead.',
      parts: [{ label: 'Chime', notes: [3, 4, 5, 0].flatMap(arpBar) }] },
    { name: 'Rhythm is the hook', prog: [5, 3, 0, 4], wave: 'square',
      feel: 'Barely any pitch change, all bounce. Off-beat repeats make it catchy even with two notes. Very TheFatRat.',
      parts: [{ label: 'Bounce', notes: [0, 1, 2, 3].flatMap(i => [[4, 0.75], [4, 0.75], [4, 0.5], [null, 0.5], [i === 3 ? 2 : 7, 0.5], [6, 0.5], [4, 0.5]]) }] },
  ];

  // Arrangement: sections play in order, then loop. Each lists its length in bars and which tracks play.
  const ARRANGEMENT = [
    { name: 'Intro', bars: 4, pat: 0, tracks: ['kick', 'hat', 'ohat', 'pad', 'wash'], dark: true },
    { name: 'Build', bars: 4, pat: 0, tracks: ['kick', 'clap', 'hat', 'ohat', 'bass', 'pad', 'wash'], build: true },
    { name: 'Drop', bars: 8, pat: 1, tracks: ['kick', 'clap', 'hat', 'ohat', 'bass', 'lead', 'pad', 'wash'] },
  ];
  // Kinds of section you can add. dark = filter kept low, build = filter sweeps open and ends on a snare roll.
  const SECTION_TYPES = [
    { name: 'Intro', dark: true, tracks: ['kick', 'hat', 'pad', 'wash'] },
    { name: 'Verse', tracks: ['kick', 'clap', 'hat', 'bass', 'pad', 'wash'] },
    { name: 'Build', build: true, tracks: ['kick', 'clap', 'hat', 'ohat', 'bass', 'pad', 'wash'] },
    { name: 'Drop', tracks: ['kick', 'clap', 'hat', 'ohat', 'bass', 'lead', 'pad', 'wash'] },
    { name: 'Break', dark: true, tracks: ['lead', 'pad', 'wash'] },
    { name: 'Outro', dark: true, tracks: ['kick', 'hat', 'wash'] },
  ];
  // Which section a bar falls in, and how far through it (b = bar within the section). null if every section is empty.
  function sectionAt(bar, secs) {
    const total = secs.reduce((a, s) => a + s.bars, 0);
    if (!total) return null;
    let b = bar % total;
    for (const s of secs) { if (b < s.bars) return { ...s, b }; b -= s.bars; }
  }
  // Drum variation: what each drum plays on step st of bar `bar`, starting from the 16-step pattern P and changed by `amt` (0-1).
  // A real drummer rarely plays the same bar twice: hats breathe, ghost notes creep in, and the last bar of every phrase
  // (fill = true, normally every 4th bar) ends in a fill that leads into a crash on the next bar's first beat.
  // Random choices are seeded by bar and step, so a bar always varies the same way. Returns { kick, clap, hat, ohat }.
  const seeded = (bar, st, salt) => { const x = Math.sin(bar * 127.1 + st * 311.7 + salt * 74.7) * 43758.5453; return x - Math.floor(x); };
  function varyDrums(P, st, bar, amt, { fill = bar % 4 === 3, after = bar > 0 && bar % 4 === 0 } = {}) {
    const out = { kick: P.kick[st] || 0, clap: P.clap[st] || 0, hat: P.hat[st] || 0, ohat: P.ohat[st] || 0 };
    if (!(amt > 0)) return out;
    const r = salt => seeded(bar, st, salt);
    if (out.hat) out.hat *= 1 - amt * 0.35 * r(1);                                   // hats breathe: no two hits quite the same
    else if (st % 2 && r(2) < amt * 0.25) out.hat = 0.22;                            // the odd ghost hat in the gaps
    if (!out.clap && [7, 10, 15].includes(st) && r(3) < amt * 0.18) out.clap = 0.22;  // ghost snares
    if (bar % 2 && !out.kick && [10, 14].includes(st) && r(4) < amt * 0.3) out.kick = 0.7;   // a pushed kick every other bar
    if (after && st === 0 && amt > 0.15) out.ohat = 1;                                // crash after a fill
    const from = amt > 0.5 ? 12 : 14;                                                 // more variation = longer fill
    if (fill && st >= from) {
      out.hat = 0; out.ohat = 0;
      out.clap = r(5) < 0.35 + amt * 0.65 ? 0.45 + 0.55 * (st - from + 1) / (16 - from) : 0;   // snare roll, getting louder
      out.kick = st === from || (st === 15 - (bar % 8 === 7 ? 0 : 1) && r(6) < amt) ? 0.85 : 0;
    }
    return out;
  }

  // A recorded take -> a 16-step lead pattern. notes: [{n (MIDI), v, t, end}] in seconds; t0 = start of the bar, step = one 16th.
  // sc: the scale's 7 semitone offsets, base: MIDI note of degree 0, root: the chord's degree. Notes snap to the grid and to the key;
  // `d` comes out relative to the chord root, like the Groovebox lead. One note per step (the highest wins), lengths stop at the next note.
  function takeToPattern(notes, { t0, step, sc, base, root = 0 }) {
    const semi = d => sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7), pat = Array(16).fill(null);
    const degree = n => { let best = 0, gap = Infinity; for (let D = -21; D <= 28; D++) { const g = Math.abs(semi(D) - (n - base)); if (g < gap) { gap = g; best = D; } } return best - root; };
    notes.forEach(o => {
      const i = Math.round((o.t - t0) / step); if (i < 0 || i > 15) return;
      if (!pat[i] || o.n > pat[i].n) pat[i] = { n: o.n, d: degree(o.n), len: Math.max(1, Math.round((o.end - o.t) / step)), v: Math.round(Math.max(0.3, Math.min(1, o.v)) * 100) / 100 };
    });
    for (let i = 0; i < 16; i++) if (pat[i]) { let nx = i + 1; while (nx < 16 && !pat[nx]) nx++; pat[i].len = Math.min(pat[i].len, nx - i); }
    return pat.map(x => x && { d: x.d, len: x.len, v: x.v });
  }

  return { NOTE, SCALE, takeToPattern, varyDrums, SECTION_TYPES, QUAL, DEGREES, PROGRESSIONS, MOVES, INTERVALS, BEATS, JOBS, ARRANGEMENT, SHAPES, HOOKS, chordNotes, chordName, degreeChord, mtof, parseBeat, beatStats, sectionAt, degSemi, noteRole };
})();

if (typeof module !== 'undefined') module.exports = Theory; // lets node --test require it; browsers ignore this
