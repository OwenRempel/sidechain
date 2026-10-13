// Lead voice: plays one note from synth params (see synth.js). Shared by the Groovebox and the Synth page.
// startLead(ctx, dest, p, t, f, v) starts a note at time t (Hz f, velocity v 0-1) and returns { release(at), glide(f2, at, time) }.
// Keep Synth.envAt() in step with the envelope maths here.
const startLead = (() => {
  const noiseBufs = new WeakMap(), curves = new Map();
  const noiseBuf = ctx => {
    if (!noiseBufs.has(ctx)) {
      const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseBufs.set(ctx, b);
    }
    return noiseBufs.get(ctx);
  };
  const driveCurve = amt => {
    const key = Math.round(amt * 50);
    if (!curves.has(key)) {
      const k = 1 + (key / 50) * 8, c = new Float32Array(1024);
      for (let i = 0; i < c.length; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
      curves.set(key, c);
    }
    return curves.get(key);
  };

  return function startLead(ctx, dest, p, t, f, v = 1) {
    const att = Math.max(0.002, p.att), n = p.voices, srcs = [], tuned = [];   // tuned: [AudioParam, ratio to the note]
    const vel = p.vel == null ? 0.5 : p.vel, width = p.width || 0, soft = 1 - vel * (1 - Math.min(1, v));   // velocity: soft notes are quieter and duller
    const mix = ctx.createGain(), flt = ctx.createBiquadFilter(), amp = ctx.createGain(), out = ctx.createGain(), oscs = [];
    flt.type = p.ftype; flt.Q.value = p.res; mix.gain.value = 1 / (Math.sqrt(n) * (1 + p.osc2 * 0.7));
    const osc = (wave, ratio, det, lvl, pan) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), freq = f * ratio; o.type = wave; g.gain.value = lvl;
      if (p.blip) { o.frequency.setValueAtTime(freq * Math.pow(2, p.blip / 12), t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.05); } else o.frequency.value = freq;
      o.detune.value = det; o.connect(g);
      if (pan && ctx.createStereoPanner) { const sp = ctx.createStereoPanner(); sp.pan.value = pan; g.connect(sp).connect(mix); } else g.connect(mix);
      o.start(t); oscs.push(o); srcs.push(o); tuned.push([o.frequency, ratio]); return o;
    };
    const main = [];
    for (let k = 0; k < n; k++) { const s = n > 1 ? k / (n - 1) * 2 - 1 : 0; main.push(osc(p.wave, 1, s * p.detune, 1, s * width)); }
    if (p.osc2 > 0) osc(p.wave2, Math.pow(2, p.semi2 / 12), 0, p.osc2 * Math.sqrt(n), 0);
    if (p.noise > 0) {   // "air": noise band-passed around the note so it follows the pitch
      const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf(ctx); s.loop = true; bp.type = 'bandpass'; bp.frequency.value = Math.min(12000, f * 3); bp.Q.value = 0.7;
      g.gain.value = p.noise * 1.5 * Math.sqrt(n); s.connect(bp).connect(g).connect(mix); s.start(t, Math.random() * 0.5); srcs.push(s); tuned.push([bp.frequency, 3]);
    }
    if (p.fm > 0) {
      const m = ctx.createOscillator(), mg = ctx.createGain(), mf = f * p.ratio, idx = mf * p.fm * 6; m.frequency.value = mf;
      mg.gain.setValueAtTime(idx, t); mg.gain.setTargetAtTime(idx * 0.08, t, p.fmDecay / 3); m.connect(mg); main.forEach(o => mg.connect(o.frequency)); m.start(t); srcs.push(m); tuned.push([m.frequency, p.ratio]);
    }
    const fTop = Math.min(18000, p.cut * (1 + p.env * 8 * (0.3 + 0.7 * soft))); flt.frequency.setValueAtTime(fTop, t); flt.frequency.setTargetAtTime(p.cut, t + 0.003, p.fdec / 3);
    const pk = soft * 0.2 * p.vol; amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(pk, t + att); amp.gain.setTargetAtTime(pk * p.sus, t + att, p.dec / 3);
    if (p.lfo !== 'off' && p.lfoDepth > 0) {
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = p.lfoRate; l.connect(lg); l.start(t); srcs.push(l);
      if (p.lfo === 'pitch') { lg.gain.value = p.lfoDepth * 60; oscs.forEach(o => lg.connect(o.detune)); }
      else if (p.lfo === 'filter') { lg.gain.value = p.lfoDepth * p.cut * 0.9; lg.connect(flt.frequency); }
      else { out.gain.value = 1 - p.lfoDepth / 2; lg.gain.value = p.lfoDepth / 2; lg.connect(out.gain); }
    }
    let chain = mix.connect(flt);
    if (p.drive > 0) { const ws = ctx.createWaveShaper(), mk = ctx.createGain(); ws.curve = driveCurve(p.drive); ws.oversample = '2x'; mk.gain.value = 1 / (1 + p.drive * 1.5); chain = chain.connect(ws).connect(mk); }
    chain.connect(amp).connect(out).connect(dest);
    if (p.chorus > 0 && ctx.createStereoPanner) {   // chorus: two short delays, gently wobbling, one each side
      [[-1, 0.011, 0.6], [1, 0.017, 0.85]].forEach(([side, base, rate]) => {
        const d = ctx.createDelay(0.05), l = ctx.createOscillator(), lg = ctx.createGain(), sp = ctx.createStereoPanner(), g = ctx.createGain();
        d.delayTime.value = base; l.frequency.value = rate; lg.gain.value = 0.004; sp.pan.value = side * (0.4 + 0.6 * width); g.gain.value = p.chorus * 0.8;
        l.connect(lg).connect(d.delayTime); l.start(t); srcs.push(l); amp.connect(d).connect(g).connect(sp).connect(out);
      });
      out.gain.value *= 1 / (1 + p.chorus * 0.5);
    }

    let rAt = null;
    return {
      // release(at) can be called again to move the release later (mono legato in the Groovebox).
      release(at) {
        if (rAt !== null) amp.gain.cancelScheduledValues(rAt);
        const r = rAt = Math.max(at, t + att);   // never cut the attack ramp short
        amp.gain.setTargetAtTime(0, r, p.rel / 4);
        const end = r + p.rel * 5 + 0.05; srcs.forEach(s => s.stop(end));
      },
      // glide(f2, at, time): slide every pitched part of the note to f2 (mono mode).
      glide(f2, at, time) {
        tuned.forEach(([prm, ratio]) => {
          const to = Math.min(16000, f2 * ratio);
          prm.cancelScheduledValues(at); prm.setValueAtTime(prm.value, at);
          if (time > 0.002) prm.setTargetAtTime(to, at, time / 3); else prm.setValueAtTime(to, at);
        });
      },
    };
  };
})();
if (typeof module !== 'undefined') module.exports = startLead;
