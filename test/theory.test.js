const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../public/js/theory.js');

test('scales have 7 degrees with matching chord info', () => {
  for (const mode of Object.keys(T.SCALE)) {
    assert.equal(T.SCALE[mode].length, 7);
    assert.equal(T.DEGREES[mode].length, 7);
  }
});

test('degreeChord builds diatonic chords', () => {
  assert.deepEqual(T.chordNotes(T.degreeChord('major', 0).root, T.degreeChord('major', 0).q), [0, 4, 7]);
  const vi = T.degreeChord('major', 5);
  assert.equal(vi.rn, 'vi');
  assert.equal(T.chordName(0, vi.root, vi.q), 'Am');
  const VI = T.degreeChord('minor', 5);
  assert.equal(T.chordName(9, VI.root, VI.q), 'F');
  assert.equal(T.degreeChord('major', 7).rn, 'I', 'degrees wrap at the octave');
});

test('chordName wraps pitch classes', () => {
  assert.equal(T.chordName(11, 1, 'maj'), 'C');
  assert.equal(T.chordName(0, -1, 'min'), 'Bm');
});

test('mtof hits concert pitch', () => {
  assert.equal(T.mtof(69), 440);
  assert.equal(T.mtof(81), 880);
});

test('progressions and moves reference valid data', () => {
  for (const p of T.PROGRESSIONS) {
    assert.ok(T.SCALE[p.mode], p.name);
    for (const d of p.deg) assert.ok(d >= 0 && d < 7, p.name);
  }
  for (const m of T.MOVES) for (const [root, q] of m.seq) {
    assert.ok(root >= 0 && root < 12, m.name);
    assert.ok(T.QUAL[q], m.name);
  }
});

test('beats are 16 steps and stats stay in 0..1', () => {
  for (const b of T.BEATS) {
    for (const k of ['kick', 'snare', 'hat', 'ohat']) assert.equal(T.parseBeat(b[k]).length, 16, `${b.name} ${k}`);
    for (const [k, v] of Object.entries(T.beatStats(b))) assert.ok(v >= 0 && v <= 1, `${b.name} ${k}`);
  }
  assert.deepEqual(T.parseBeat('x.o.'), [1, 0, 0.5, 0]);
});

test('sectionAt walks the arrangement and loops', () => {
  const A = T.ARRANGEMENT;
  assert.deepEqual([0, 3, 4, 7, 8, 15, 16].map(b => T.sectionAt(b, A).name), ['Intro', 'Intro', 'Build', 'Build', 'Drop', 'Drop', 'Intro']);
  assert.equal(T.sectionAt(6, A).b, 2);
  const noIntro = A.map(s => ({ ...s, bars: s.name === 'Intro' ? 0 : s.bars }));
  assert.equal(T.sectionAt(0, noIntro).name, 'Build');
  assert.equal(T.sectionAt(0, A.map(s => ({ ...s, bars: 0 }))), null);
});

test('noteRole sorts notes into chord tones, key notes and outside notes', () => {
  assert.equal(T.degSemi('major', 7), 12);
  assert.equal(T.degSemi('major', -1), -1);
  assert.deepEqual(T.noteRole('major', 0, 4), { role: 'chord', name: '3rd' });
  assert.deepEqual(T.noteRole('major', 3, 0), { role: 'chord', name: '5th' }, 'C is the 5th of F');
  assert.deepEqual(T.noteRole('major', 0, 2), { role: 'scale', name: '2nd' });
  assert.deepEqual(T.noteRole('major', 0, 3), { role: 'outside', name: '♭3' });
});

test('melody phrases fill whole bars', () => {
  const beats = notes => notes.reduce((a, n) => a + n[1], 0);
  for (const h of T.HOOKS) {
    const total = h.parts.reduce((a, p) => a + beats(p.notes), 0);
    assert.equal(total, h.prog.length * 4, h.name);
    h.parts.forEach(p => assert.equal(beats(p.notes) % 4, 0, `${h.name} / ${p.label}`));
  }
  T.SHAPES.forEach(s => assert.equal(beats(s.notes), 5.5, s.name));
});

test('takeToPattern snaps a played bar onto the lead grid', () => {
  const step = 0.125, sc = [0, 2, 4, 5, 7, 9, 11], base = 72;   // C major, degree 0 = C5
  const notes = [
    { n: 72, v: 1, t: 0.01, end: 0.24 },          // C on step 0, two steps long
    { n: 76, v: 0.5, t: 0.26, end: 0.3 },         // E on step 2
    { n: 77, v: 0.9, t: 0.5, end: 2 },            // F held long, cut at the next note
    { n: 78, v: 0.9, t: 0.99, end: 1.1 },         // F# (out of key) snaps to a scale note
    { n: 60, v: 0.9, t: 1.0, end: 1.1 },          // lower note on the same step loses
    { n: 79, v: 0.9, t: 3, end: 3.1 },            // after the bar: dropped
  ];
  const pat = T.takeToPattern(notes, { t0: 0, step, sc, base, root: 0 });
  assert.deepEqual(pat[0], { d: 0, len: 2, v: 1 });
  assert.deepEqual(pat[2], { d: 2, len: 1, v: 0.5 });
  assert.equal(pat[4].d, 3); assert.equal(pat[4].len, 4);
  assert.ok([3, 4].includes(pat[8].d));
  assert.equal(pat.filter(Boolean).length, 4);
  // relative to the chord root: on chord IV (degree 3), F is d 0
  assert.equal(T.takeToPattern([{ n: 77, v: 1, t: 0, end: 0.1 }], { t0: 0, step, sc, base, root: 3 })[0].d, 0);
});

test('varyDrums: off leaves the pattern alone, on adds fills and is repeatable', () => {
  const P = { kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: Array(16).fill(0.5), ohat: Array(16).fill(0) };
  for (let st = 0; st < 16; st++) assert.deepEqual(T.varyDrums(P, st, 3, 0), { kick: P.kick[st], clap: P.clap[st], hat: P.hat[st], ohat: 0 });
  const bar = st => T.varyDrums(P, st, 3, 1);
  const fill = Array.from({ length: 16 }, (_, st) => bar(st));
  assert.ok(fill.slice(12).some(x => x.clap > 0), 'the 4th bar ends in a snare fill');
  assert.ok(fill.slice(12).every(x => x.hat === 0), 'hats drop out under the fill');
  assert.deepEqual(fill, Array.from({ length: 16 }, (_, st) => bar(st)), 'same bar, same variation');
  assert.equal(T.varyDrums(P, 0, 4, 1).ohat, 1, 'crash on the bar after a fill');
  assert.equal(T.varyDrums(P, 12, 1, 1).clap, 1, 'a normal bar keeps its backbeat');
});
