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
