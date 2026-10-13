const test = require('node:test');
const assert = require('node:assert');
const Synth = require('../public/js/synth.js');
const startLead = require('../public/js/leadvoice.js');

// A tiny fake AudioContext: enough to build the voice graph and record what gets scheduled.
function fakeCtx() {
  const log = [];
  const param = (name, value = 0) => ({ name, value, events: [],
    setValueAtTime(v, t) { this.events.push(['set', v, t]); }, linearRampToValueAtTime(v, t) { this.events.push(['lin', v, t]); },
    exponentialRampToValueAtTime(v, t) { this.events.push(['exp', v, t]); }, setTargetAtTime(v, t, c) { this.events.push(['target', v, t, c]); },
    cancelScheduledValues(t) { this.events = this.events.filter(e => e[2] < t); } });
  const node = extra => Object.assign({ connect(n) { return n; } }, extra);
  const src = extra => node(Object.assign({ start() {}, stop(t) { this.stopAt = t; log.push(this); } }, extra));
  return { log, sampleRate: 44100, currentTime: 0,
    createGain: () => node({ gain: param('gain', 1) }), createBiquadFilter: () => node({ frequency: param('freq', 350), Q: param('q', 1) }),
    createOscillator: () => src({ frequency: param('freq', 440), detune: param('detune') }), createBufferSource: () => src({}),
    createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createWaveShaper: () => node({}),
    createStereoPanner: () => node({ pan: param('pan') }), createDelay: () => node({ delayTime: param('delay') }) };
}

test('every preset builds a voice with release and glide', () => {
  for (const pr of Synth.PRESETS) {
    const ctx = fakeCtx(), v = startLead(ctx, {}, Synth.normalize(pr.p), 0, 440, 0.8);
    assert.equal(typeof v.glide, 'function'); v.glide(660, 0.2, 0.1); v.release(0.3);
  }
});

test('release can be moved later (mono legato)', () => {
  const ctx = fakeCtx(), p = Synth.normalize({ ...Synth.BASE, rel: 0.2 }), v = startLead(ctx, {}, p, 0, 440, 1);
  v.release(0.5); v.release(1.0);
  const last = ctx.log[ctx.log.length - 1];
  assert.ok(last.stopAt > 1.0, 'sources stop after the later release');
});

test('soft notes are quieter when velocity is on, equal when off', () => {
  const peak = (vel, v) => { const ctx = fakeCtx(); let amp; const cg = ctx.createGain; const gains = [];
    ctx.createGain = () => { const g = cg(); gains.push(g); return g; };
    startLead(ctx, {}, Synth.normalize({ ...Synth.BASE, vel }), 0, 440, v);
    amp = gains.find(g => g.gain.events.some(e => e[0] === 'lin')); return amp.gain.events.find(e => e[0] === 'lin')[1]; };
  assert.ok(peak(1, 0.3) < peak(1, 1) * 0.5);
  assert.equal(peak(0, 0.3), peak(0, 1));
});

test('new playing and width params normalize to safe values', () => {
  const p = Synth.normalize({ mono: 'legato', glide: 9, chorus: -1, width: 2, vel: 'x' });
  assert.equal(p.mono, 'poly'); assert.equal(p.glide, 0.5); assert.equal(p.chorus, 0); assert.equal(p.width, 1); assert.equal(p.vel, Synth.BASE.vel);
  assert.equal(Synth.byId('acid').p.mono, 'mono');
});

test('sample wave plays the buffer at the right speed, or a triangle until it loads', () => {
  const p = Synth.normalize({ wave: 'sample', sample: 'sx', sroot: 57, voices: 1 });
  let ctx = fakeCtx(), made = [];
  ctx.createBufferSource = () => { const s = { connect: n => n, start() {}, stop() {}, detune: { value: 0 }, playbackRate: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; made.push(s); return s; };
  startLead.getBuffer = () => ({ fake: true });
  startLead(ctx, {}, p, 0, 440, 1);
  assert.ok(Math.abs(made[0].playbackRate.value - 2) < 1e-9, 'A4 from an A3 sample plays twice as fast');
  startLead.getBuffer = () => null; ctx = fakeCtx(); const oscs = []; const co = ctx.createOscillator; ctx.createOscillator = () => { const o = co(); oscs.push(o); return o; };
  startLead(ctx, {}, p, 0, 440, 1);
  assert.equal(oscs[0].type, 'triangle');
  delete startLead.getBuffer;
});
