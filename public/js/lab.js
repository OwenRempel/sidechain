// Theory Lab UI + a tiny audio engine for previews.
const $ = s => document.querySelector(s);
const T = Theory;
const state = { tonic: 0, mode: 'major', interval: T.INTERVALS[1], beat: T.BEATS[1] };
try { const s = JSON.parse(localStorage.getItem('sidechain-lab')); if (s) Object.assign(state, { tonic: s.tonic ?? 0, mode: s.mode ?? 'major' }); } catch (e) {}
const saveLab = () => { try { localStorage.setItem('sidechain-lab', JSON.stringify({ tonic: state.tonic, mode: state.mode })); } catch (e) {} };

/* ---------- audio ---------- */
let ctx, out;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    out = ctx.createDynamicsCompressor(); out.threshold.value = -12;
    const g = ctx.createGain(); g.gain.value = 0.8; out.connect(g).connect(ctx.destination);
  }
  ctx.resume(); return ctx;
}
function tone(freq, t, dur, { wave = 'triangle', gain = 0.12, cut = 2400 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = wave; o.frequency.value = freq; lp.frequency.value = cut;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.setTargetAtTime(gain * 0.6, t + 0.05, 0.3); g.gain.setValueAtTime(gain * 0.6, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.25);
  o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.3);
}
// rootSemi is relative to the home note; voiced around C3-C4.
function playChord(rootSemi, q, t = audio().currentTime + 0.02, dur = 0.9) {
  const base = 48 + state.tonic;
  T.chordNotes(rootSemi, q).forEach(n => tone(T.mtof(base + n), t, dur));
  tone(T.mtof(base + rootSemi - 12), t, dur, { wave: 'sine', gain: 0.18 });
}
function playSeq(chords, beat = 0.75) {
  const t0 = audio().currentTime + 0.05;
  chords.forEach(([r, q], i) => playChord(r, q, t0 + i * beat, beat * 0.95));
}
function noise(t, dur) {
  const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = b; s.start(t); return s;
}
const DRUMS = {
  kick(t, v) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.connect(g).connect(out); o.start(t); o.stop(t + 0.45); },
  clap(t, v) { const s = noise(t, 0.25), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1500;
    g.gain.setValueAtTime(v * 0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); s.connect(f).connect(g).connect(out); },
  hat(t, v) { const s = noise(t, 0.06), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 7500;
    g.gain.setValueAtTime(v * 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(f).connect(g).connect(out); },
  ohat(t, v) { const s = noise(t, 0.4), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 6500;
    g.gain.setValueAtTime(v * 0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); s.connect(f).connect(g).connect(out); },
};

/* ---------- tabs ---------- */
document.querySelector('.tabs').onclick = e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  document.querySelectorAll('.tabs .chip').forEach(c => c.setAttribute('aria-pressed', c === b));
  $('#tab-harmony').hidden = b.dataset.tab !== 'harmony'; $('#tab-rhythm').hidden = b.dataset.tab !== 'rhythm';
  if (b.dataset.tab !== 'rhythm') stopBeat();
};

/* ---------- harmony: key family ---------- */
$('#key').innerHTML = T.NOTE.map((n, i) => `<option value="${i}">${n}</option>`).join('');
const roleVar = r => `var(--${r})`;
function renderChords() {
  $('#chords').innerHTML = T.DEGREES[state.mode].map((d, i) => {
    const c = T.degreeChord(state.mode, i);
    return `<button class="chord" data-d="${i}" style="--rc:${roleVar(d.role)}"><span class="rn">${d.rn}</span><span class="nm">${T.chordName(state.tonic, c.root, c.q)}</span><span class="role">${d.role}</span><span class="feel">${d.feel}</span></button>`;
  }).join('');
}
$('#chords').onclick = e => { const b = e.target.closest('.chord'); if (!b) return; const c = T.degreeChord(state.mode, +b.dataset.d); playChord(c.root, c.q); };

/* ---------- harmony: circle of fifths ---------- */
const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
function wedge(r1, r2, a1, a2) {
  const p = (r, a) => `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  return `M${p(r2, a1)}A${r2},${r2} 0 0 1 ${p(r2, a2)}L${p(r1, a2)}A${r1},${r1} 0 0 0 ${p(r1, a1)}Z`;
}
function degreeOf(pc, q) {
  const sc = T.SCALE[state.mode];
  for (let d = 0; d < 7; d++) if ((sc[d] + state.tonic) % 12 === pc && T.DEGREES[state.mode][d].q === q) return T.DEGREES[state.mode][d];
  return null;
}
function renderCircle() {
  let s = '';
  FIFTHS.forEach((pc, i) => {
    const a1 = (i * 30 - 105) * Math.PI / 180, a2 = (i * 30 - 75) * Math.PI / 180, am = (a1 + a2) / 2;
    [[pc, 'maj', 100, 152, 127], [(pc + 9) % 12, 'min', 52, 98, 76]].forEach(([p, q, r1, r2, rt]) => {
      const deg = degreeOf(p, q), fill = deg ? roleVar(deg.role) : 'var(--panel2)';
      const x = (rt * Math.cos(am)).toFixed(1), y = (rt * Math.sin(am)).toFixed(1);
      s += `<path d="${wedge(r1, r2, a1, a2)}" style="fill:${fill}" data-pc="${p}" data-q="${q}"><title>${T.NOTE[p]}${q === 'min' ? 'm' : ''}</title></path>`;
      s += `<text x="${x}" y="${deg ? y - 5 : y}" style="fill:${deg ? 'var(--bg)' : 'var(--ink)'}">${T.NOTE[p]}${q === 'min' ? 'm' : ''}</text>`;
      if (deg) s += `<text class="rn" x="${x}" y="${+y + 8}">${deg.rn}</text>`;
    });
  });
  s += `<text x="0" y="-6" style="font-size:10px;fill:var(--dim)">HOME</text><text x="0" y="10" style="font-size:14px">${T.NOTE[state.tonic]}${state.mode === 'minor' ? 'm' : ''}</text>`;
  $('#circle').innerHTML = s;
}
$('#circle').onclick = e => {
  const p = e.target.closest('path'); if (!p) return;
  playChord((((+p.dataset.pc - state.tonic) % 12) + 12) % 12, p.dataset.q);
};

/* ---------- harmony: progressions + moves ---------- */
function renderProgs() {
  const list = T.PROGRESSIONS.filter(p => p.mode === state.mode);
  $('#progs').innerHTML = list.map((p, i) => {
    const names = p.deg.map(d => { const c = T.degreeChord(state.mode, d); return `${c.rn} ${T.chordName(state.tonic, c.root, c.q)}`; }).join(' → ');
    return `<div class="item"><span class="t">${p.name}</span><span class="seq">${names}</span><span class="btns"><button class="btn" data-play="${i}" aria-label="Play ${p.name}">▶</button><button class="btn" data-send="${i}" aria-label="Load ${p.name} into Groovebox">→</button></span><span class="d">${p.feel}</span></div>`;
  }).join('');
  $('#progs').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const p = list[b.dataset.play ?? b.dataset.send];
    if (b.dataset.play != null) { const seq = p.deg.map(d => { const c = T.degreeChord(state.mode, d); return [c.root, c.q]; }); playSeq([...seq, ...seq]); }
    else {
      try { localStorage.setItem('sidechain-handoff', JSON.stringify({ key: state.tonic, scale: state.mode, prog: p.deg })); } catch (err) {}
      location.href = 'index.html';
    }
  };
}
function renderMoves() {
  $('#moves').innerHTML = T.MOVES.map((m, i) => `<div class="item"><span class="t">${m.name}</span><span class="seq">${m.seq.map(([r, q]) => T.chordName(state.tonic, r, q)).join(' → ')}</span><span class="btns"><button class="btn" data-i="${i}" aria-label="Play ${m.name}">▶</button></span><span class="d">${m.why}</span></div>`).join('');
}
$('#moves').onclick = e => { const b = e.target.closest('button'); if (b) playSeq(T.MOVES[+b.dataset.i].seq); };

/* ---------- harmony: overtones ---------- */
$('#ints').innerHTML = T.INTERVALS.map((it, i) => `<button class="chip" data-i="${i}" aria-pressed="${it === state.interval}">${it.name}</button>`).join('');
$('#ints').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; state.interval = T.INTERVALS[+b.dataset.i];
  document.querySelectorAll('#ints .chip').forEach(c => c.setAttribute('aria-pressed', c === b)); renderOvertones(); playInterval('ab'); };
const OV_BASE = 110;
function renderOvertones() {
  const it = state.interval, fA = OV_BASE, fB = OV_BASE * Math.pow(2, it.semis / 12), N = 16, W = 640, lo = Math.log(90), hi = Math.log(4200);
  const X = f => 20 + (Math.log(f) - lo) / (hi - lo) * (W - 40);
  const hA = Array.from({ length: N }, (_, i) => fA * (i + 1)), hB = Array.from({ length: N }, (_, i) => fB * (i + 1));
  let shared = 0, rub = 0, s = '';
  [100, 200, 500, 1000, 2000, 4000].forEach(f => { s += `<line x1="${X(f)}" x2="${X(f)}" y1="8" y2="148" style="stroke:var(--line)"/><text x="${X(f)}" y="164" text-anchor="middle" style="fill:var(--dim);font:10px var(--mono)">${f >= 1000 ? f / 1000 + 'k' : f} Hz</text>`; });
  s += `<text x="4" y="40" style="fill:var(--bass);font:11px var(--mono)">A</text><text x="4" y="112" style="fill:var(--lead);font:11px var(--mono)">B</text>`;
  hA.forEach(a => {
    const match = hB.find(b => Math.abs(b / a - 1) < 0.012), near = !match && hB.find(b => Math.abs(b / a - 1) < 0.07);
    if (match) { shared++; s += `<line x1="${X(a)}" x2="${X(a)}" y1="14" y2="136" style="stroke:var(--hat);stroke-width:3"/>`; }
    else if (near) { rub++; s += `<line x1="${X(a)}" x2="${X(near)}" y1="74" y2="74" style="stroke:var(--tension);stroke-width:6;stroke-linecap:round"/>`; }
  });
  hA.forEach((f, i) => { s += `<line x1="${X(f)}" x2="${X(f)}" y1="${20}" y2="${62 - i * 1.2}" style="stroke:var(--bass);stroke-width:2"/>`; });
  hB.forEach((f, i) => { if (f < 4200) s += `<line x1="${X(f)}" x2="${X(f)}" y1="${86 + i * 1.2}" y2="128" style="stroke:var(--lead);stroke-width:2"/>`; });
  $('#ovsvg').innerHTML = s;
  $('#ovName').textContent = it.name; $('#ovRatio').textContent = `ratio ${it.ratio}`; $('#ovFeel').textContent = it.feel;
  $('#ovShared').innerHTML = `<span style="color:var(--hat)">■</span> ${shared} shared overtones (lock) &nbsp; <span style="color:var(--tension)">■</span> ${rub} near-misses (rub)`;
}
function playInterval(which) {
  const t = audio().currentTime + 0.02, fB = OV_BASE * 2 * Math.pow(2, state.interval.semis / 12), opt = { wave: 'sawtooth', gain: 0.07, cut: 3200 };
  if (which !== 'b') tone(OV_BASE * 2, t, 1.8, opt);
  if (which !== 'a') tone(fB, t, 1.8, opt);
}
$('#ovA').onclick = () => playInterval('a'); $('#ovB').onclick = () => playInterval('b'); $('#ovAB').onclick = () => playInterval('ab');

/* ---------- rhythm ---------- */
const DRUM_ROWS = [['kick', 'kick', 'kick', 98], ['snare', 'clap', 'clap', 78], ['hat', 'hat', 'hat', 58], ['ohat', 'ohat', 'ohat', 40]];
$('#jobs').innerHTML = T.JOBS.map(j => `<button class="job" data-d="${j.id}" style="--c:var(--${j.id})"><b>${j.name}</b><span>${j.job}</span></button>`).join('');
$('#jobs').onclick = e => { const b = e.target.closest('.job'); if (!b) return; audio(); DRUMS[b.dataset.d](ctx.currentTime + 0.01, 1); };
$('#beats').innerHTML = T.BEATS.map((b, i) => `<button class="chip" data-i="${i}" aria-pressed="${b === state.beat}">${b.name}</button>`).join('');
$('#beats').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; state.beat = T.BEATS[+b.dataset.i]; beatBpm = state.beat.bpm;
  document.querySelectorAll('#beats .chip').forEach(c => c.setAttribute('aria-pressed', c === b)); renderBeat(); };
let beatBpm = state.beat.bpm, swing = 0, playing = false, timer, step = 0, nextT = 0, curStep = -1; const queue = [];
function renderBeat(active = -1) {
  const b = state.beat; let s = '';
  for (let i = 0; i < 16; i++) {
    const a = (i * 22.5 - 90) * Math.PI / 180;
    if (i % 4 === 0) s += `<text x="${(118 * Math.cos(a)).toFixed(1)}" y="${(118 * Math.sin(a)).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--dim);font:10px var(--mono)">${i / 4 + 1}</text>`;
    DRUM_ROWS.forEach(([k, , color, r]) => {
      const v = T.parseBeat(b[k])[i], x = (r * Math.cos(a)).toFixed(1), y = (r * Math.sin(a)).toFixed(1);
      s += v ? `<circle cx="${x}" cy="${y}" r="${i === active ? 9 : 7}" style="fill:var(--${color});opacity:${v < 1 ? 0.5 : 1}"/>` : `<circle cx="${x}" cy="${y}" r="2" style="fill:var(--line)"/>`;
    });
  }
  if (active >= 0) { const a = (active * 22.5 - 90) * Math.PI / 180; s += `<line x1="0" y1="0" x2="${(108 * Math.cos(a)).toFixed(1)}" y2="${(108 * Math.sin(a)).toFixed(1)}" style="stroke:var(--ink);stroke-width:2;opacity:.6"/>`; }
  $('#clock').innerHTML = s;
  if (active < 0) {
    $('#bName').textContent = b.name; $('#bTempo').textContent = `${b.genre} · ${b.range} BPM`; $('#bWhy').textContent = b.why;
    const st = T.beatStats(b);
    $('#bMeters').innerHTML = [['Busy', st.busy], ['Syncopated', st.sync], ['Driving', st.drive]].map(([n, v]) => `<div class="meter">${n}<div><i style="width:${Math.round(v * 100)}%"></i></div></div>`).join('');
    $('#bTempoR').value = beatBpm; $('#oTempo').textContent = beatBpm + ' bpm';
  }
}
function beatTick() {
  while (nextT < ctx.currentTime + 0.1) {
    DRUM_ROWS.forEach(([k, voice]) => { const v = T.parseBeat(state.beat[k])[step]; if (v) DRUMS[voice](nextT, v); });
    queue.push([step, nextT]);
    const spb = 60 / beatBpm / 4, sw = swing * 0.33; nextT += step % 2 === 0 ? spb * (1 + sw) : spb * (1 - sw); step = (step + 1) % 16;
  }
}
function startBeat() { audio(); playing = true; step = 0; nextT = ctx.currentTime + 0.05; timer = setInterval(beatTick, 25); $('#bPlay').textContent = '■ Stop'; anim(); }
function stopBeat() { playing = false; clearInterval(timer); queue.length = 0; $('#bPlay').textContent = '▶ Play'; renderBeat(); }
function anim() {
  if (!playing) return; requestAnimationFrame(anim);
  let cur = null; while (queue.length && queue[0][1] <= ctx.currentTime) cur = queue.shift();
  if (cur && cur[0] !== curStep) { curStep = cur[0]; renderBeat(curStep); }
}
$('#bPlay').onclick = () => (playing ? stopBeat() : startBeat());
$('#bSwing').oninput = e => { swing = +e.target.value; $('#oSwing').textContent = Math.round(swing / 0.6 * 100) + '%'; };
$('#bTempoR').oninput = e => { beatBpm = +e.target.value; $('#oTempo').textContent = beatBpm + ' bpm'; };

/* ---------- init ---------- */
function renderHarmony() { $('#key').value = state.tonic; $('#mode').value = state.mode; renderChords(); renderCircle(); renderProgs(); renderMoves(); }
$('#key').onchange = e => { state.tonic = +e.target.value; saveLab(); renderHarmony(); };
$('#mode').onchange = e => { state.mode = e.target.value; saveLab(); renderHarmony(); };
renderHarmony(); renderOvertones(); renderBeat();
