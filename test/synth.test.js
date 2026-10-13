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

test('presets are unique and already in range', () => {
  assert.equal(new Set(Synth.PRESETS.map(p => p.id)).size, Synth.PRESETS.length);
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
