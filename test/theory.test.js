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
