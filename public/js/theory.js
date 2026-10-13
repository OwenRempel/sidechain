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
  return { NOTE, SCALE, QUAL, DEGREES, PROGRESSIONS, MOVES, INTERVALS, BEATS, JOBS, chordNotes, chordName, degreeChord, mtof, parseBeat, beatStats };
})();
