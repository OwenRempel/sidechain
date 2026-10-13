const test = require('node:test');
const assert = require('node:assert/strict');
const Synth = require('../public/js/synth.js');

test('every param has a group, a default and a sane range', () => {
  const groups = new Set(Synth.GROUPS.map(g => g.id));
  for (const s of Synth.PARAMS) {
    assert.ok(groups.has(s.g), s.k);
    assert.ok(s.k in Synth.BASE, s.k);
    if (s.type === 'choice') assert.ok(s.options.some(o => o[0] === Synth.BASE[s.k]), s.k);
    else {
      assert.ok(s.min < s.max, s.k);
      assert.ok(Synth.BASE[s.k] >= s.min && Synth.BASE[s.k] <= s.max, `${s.k} default in range`);
      if (s.log) assert.ok(s.min > 0, `${s.k} log needs min > 0`);
      assert.equal(typeof s.fmt(Synth.BASE[s.k]), 'string', `${s.k} fmt`);
    }
  }
});

test('presets are unique, filed in a category and already in range', () => {
  assert.equal(new Set(Synth.PRESETS.map(p => p.id)).size, Synth.PRESETS.length);
  for (const pr of Synth.PRESETS) assert.ok(Synth.CATS.some(([c]) => c === pr.cat), `${pr.name} category`);
  for (const [c] of Synth.CATS) assert.ok(Synth.PRESETS.some(pr => pr.cat === c), `${c} has presets`);
  for (const pr of Synth.PRESETS) assert.ok(Synth.same(Synth.normalize(pr.p), pr.p), pr.name);
});

test('normalize fills gaps, clamps numbers and rejects unknown choices', () => {
  const n = Synth.normalize({ voices: 99, cut: -5, wave: 'banana', res: NaN });
  assert.equal(n.voices, 7);
  assert.equal(n.cut, 100);
  assert.equal(n.wave, Synth.BASE.wave);
  assert.equal(n.res, Synth.BASE.res);
  assert.equal(n.att, Synth.BASE.att);
  assert.deepEqual(Synth.normalize(), Synth.normalize(Synth.BASE));
});

test('log sliders round-trip', () => {
  const cut = Synth.PARAMS.find(s => s.k === 'cut');
  assert.equal(Synth.fromSlider(cut, 0), cut.min);
  assert.equal(Synth.fromSlider(cut, 1), cut.max);
  assert.ok(Math.abs(Synth.fromSlider(cut, Synth.toSlider(cut, 2000)) - 2000) < 10);
});

test('simple knobs round-trip and keep params in range', () => {
  for (const m of Synth.MACROS) for (const x of [0, 0.5, 1]) {
    const p = Synth.applyMacro(Synth.BASE, m.k, x);
    assert.ok(Synth.same(p, Synth.normalize(p)), `${m.k} ${x} in range`);
    assert.ok(Math.abs(m.get(p) - x) < 0.2, `${m.k} ${x} reads back`);
  }
  assert.equal(Synth.applyMacro(Synth.BASE, 'motion', 0).lfo, 'off');
  assert.equal(Synth.applyMacro(Synth.BASE, 'motion', 0.5).lfo, 'pitch');
});

test('pictures follow the sound', () => {
  const sine = Synth.normalize({ wave: 'sine', osc2: 0 });
  const peak = Synth.spectrum(sine, 440).reduce((a, b) => (b.mag > a.mag ? b : a));
  assert.ok(Math.abs(peak.f - 440) < 30, `sine peaks at its pitch (${peak.f})`);
  assert.equal(Synth.waveShape(sine).length, 240);
  assert.ok(Math.max(...Synth.waveShape(sine).map(Math.abs)) <= 1);
  const pluck = Synth.applyMacro(Synth.BASE, 'shape', 0), env = t => Synth.envAt(pluck, t, 0.5).amp;
  assert.ok(env(0.001) > 0.4 && env(0.4) < 0.05 && env(1.5) < 0.01, 'pluck hits and fades');
  assert.match(Synth.describe(pluck).shape, /Pluck/);
});

test('bass and chords parts: views, menus and presets', () => {
  const S = { synth: { a: 1 }, synthId: 'chime', bassSynth: { b: 1 }, bassSynthId: 'fbbass' };
  const v = Synth.partView(S, 'bass');
  assert.equal(v.synthId, 'fbbass'); v.synth = { c: 1 }; v.synthId = 'subbass';
  assert.deepEqual(S.bassSynth, { c: 1 }); assert.equal(S.bassSynthId, 'subbass'); assert.deepEqual(S.synth, { a: 1 });
  assert.equal(Synth.part('nope').id, 'lead');
  assert.equal(Synth.catsFor('bass')[0][0], 'bass'); assert.equal(Synth.catsFor('pad')[0][0], 'chords');
  assert.deepEqual(Synth.catsFor('lead').slice(-2).map(c => c[0]), ['bass', 'chords']);
  assert.equal(Synth.catsFor('lead').length, Synth.CATS.length);
  for (const c of ['bass', 'chords']) assert.ok(Synth.PRESETS.filter(p => p.cat === c).length >= 8, c);
  for (const p of Synth.PRESETS.filter(p => p.cat === 'bass')) assert.equal(p.p.width, 0, p.id + ' keeps the low end centred');
});
