// Synth page: the lead synth panel full-size, pictures pinned at the top, a playable keyboard pinned at the bottom.
// Reads and writes the Groovebox song in localStorage['sidechain-v1'] (only .synth and .synthId), so both pages stay in step.
const $ = s => document.querySelector(s);
const SONG = 'sidechain-v1', OCT_KEY = 'sidechain-kb-oct';
const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] }; // same as groovebox.js
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const readSong = () => { try { return JSON.parse(localStorage.getItem(SONG)) || {}; } catch (e) { return {}; } };

const M = readSong();
const DEFAULT = { lead: 'chime', bass: 'fbbass', pad: 'fbchords' };
Synth.PARTS.forEach(({ id, keys: [k, kid] }) => { M[k] = M[k] ? Synth.normalize(M[k]) : Synth.normalize(Synth.byId(M[kid] = DEFAULT[id]).p); });
// which sound the page edits and plays: lead, bass or chords (shared with the Groovebox panel)
const PART_KEY = 'sidechain-synth-part';
let part = 'lead'; try { part = Synth.part(localStorage.getItem(PART_KEY)).id; } catch (e) {}
const view = () => Synth.partView(M, part), cur = () => view().synth;
M.key = M.key ?? 0; M.scale = SCALES[M.scale] ? M.scale : 'major';
function loadSamples() { if (ctx && typeof Samples !== 'undefined') Synth.PARTS.forEach(({ keys: [k] }) => { if (M[k].wave === 'sample') Samples.load(ctx, M[k].sample); }); }
function persist() { loadSamples(); const s = readSong(); Synth.PARTS.forEach(({ keys }) => keys.forEach(k => { s[k] = M[k]; })); try { localStorage.setItem(SONG, JSON.stringify(s)); } catch (e) {} }

/* audio: lead bus -> light reverb + delay from the song's settings -> out */
let ctx, leadOut, leadAn, lastHz = 440;
function ensureAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    leadOut = ctx.createGain(); leadOut.connect(comp);
    leadAn = ctx.createAnalyser(); leadAn.fftSize = 2048; leadOut.connect(leadAn);
    const len = ctx.sampleRate * 2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const conv = ctx.createConvolver(), rev = ctx.createGain(); conv.buffer = ir; rev.gain.value = M.space ?? 0.3; leadOut.connect(rev).connect(conv).connect(comp);
    const dl = ctx.createDelay(2), fb = ctx.createGain(), send = ctx.createGain(); dl.delayTime.value = 60 / (M.bpm || 120) * 0.75; fb.gain.value = 0.35; send.gain.value = M.echo ?? 0.2;
    leadOut.connect(send).connect(dl); dl.connect(fb).connect(dl); dl.connect(comp);
  }
  loadSamples(); ctx.resume(); return ctx.currentTime + 0.01;
}
const noteMidi = n => n + 12 * cur().oct;
function play(n, v = 1) { const t = ensureAudio(), f = mtof(noteMidi(n)); lastHz = f; return startLead(ctx, leadOut, cur(), t, f, v); }
// where each part sits, as in the Groovebox: bass two octaves under the chords, the lead's home a 5th-ish above them
const bassBase = () => 36 + (M.key >= 7 ? M.key - 12 : M.key);
const home = () => (part === 'bass' ? bassBase() : part === 'pad' ? bassBase() + 24 : 60 + M.key);
const degNote = (b, d) => { const sc = SCALES[M.scale]; return b + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7); };
const firstChord = () => (M.prog && M.prog.length ? M.prog[0] : 0);
const chord = (t, r, dur) => [0, 2, 4].forEach(k => { const f = mtof(noteMidi(degNote(bassBase() + 24, r + k))); lastHz = f; startLead(ctx, leadOut, cur(), t, f, 1).release(t + dur); });
function audition() {
  if (part === 'pad') return chord(ensureAudio(), firstChord(), 0.6);
  play(home(), 1).release(ctx.currentTime + (part === 'bass' ? 0.4 : 0.32));
}
function tryPhrase() {
  const s = 60 / (M.bpm || 120) / 4, t0 = ensureAudio(), prog = M.prog && M.prog.length ? M.prog : [0];
  if (part === 'pad') return prog.forEach((r, b) => chord(t0 + b * s * 8, r, s * 7.5));
  const line = part === 'bass' ? prog.flatMap((r, b) => [[0, 0, 3], [3, 7, 1], [6, 0, 2], [10, 0, 2], [12, 4, 3]].map(([st, d, len]) => [r + d, b * 8 + st / 2, len / 2]))
    : [[0, 0, 2], [2, 2, 1], [4, 3, 1], [7, 4, 2], [4, 6, 2], [2, 8, 1], [0, 9, 5]].map(([d, st, len]) => [d, st * 1.5, len * 1.4]);
  line.forEach(([d, st, len], i) => {
    const f = mtof(noteMidi(degNote(home(), d))); lastHz = f; startLead(ctx, leadOut, cur(), t0 + st * s, f, i ? 0.85 : 1).release(t0 + (st + len) * s * 0.93);
  });
}

function setPart(id) {
  [...held.keys()].forEach(noteOff); arp.notes.clear(); arpStop(); if (rec.state !== 'idle') recCancel();
  part = Synth.part(id).id; try { localStorage.setItem(PART_KEY, part); } catch (e) {}
  document.body.style.setProperty('--lead', part === 'lead' ? '' : `var(--${part})`);
  kbOct = loadOct(); renderKeys(); renderRec(); $('#recMsg').textContent = '';
}
const panel = createSynthPanel($('#synth'), {
  model: view, persist, audition, tryPhrase, part: () => part, setPart,
  noteHz: () => mtof(noteMidi(home())), analyser: () => leadAn || null, lastHz: () => lastHz, sampleRate: () => (ctx ? ctx.sampleRate : 44100),
});
panel.render();
(function frame() { requestAnimationFrame(frame); panel.tick(); })();

/* keyboard: two octaves, notes in the song's key marked, played by touch, mouse, computer keys or a MIDI keyboard */
const KB_DEFAULT = { lead: 4, bass: 2, pad: 3 };
const loadOct = () => { try { return +localStorage.getItem(OCT_KEY + (part === 'lead' ? '' : '-' + part)) || KB_DEFAULT[part]; } catch (e) { return KB_DEFAULT[part]; } };
const saveOct = () => { try { localStorage.setItem(OCT_KEY + (part === 'lead' ? '' : '-' + part), kbOct); } catch (e) {} };
let kbOct = loadOct();
const held = new Map();   // pressed note -> velocity
const COMPUTER = 'awsedftgyhujkolp;\'';
function noteOn(n, v = 0.9) {
  if (held.has(n)) return;
  if (arp.mode !== 'off' && arp.hold && !held.size) arp.notes.clear();   // Hold: a fresh chord replaces the latched one
  held.set(n, v); keyEl(n)?.classList.add('down');
  if (arp.mode !== 'off') { arp.notes.set(n, v); arpStart(); } else voiceOn(n, v);
}
function noteOff(n) {
  if (!held.has(n)) return; held.delete(n); keyEl(n)?.classList.remove('down');
  if (arp.mode !== 'off') { if (!arp.hold) arp.notes.delete(n); } else voiceOff(n);
}

// sound: poly = one voice per key; mono = one voice that glides between keys (last key pressed wins, letting go goes back)
const voices = new Map(), mono = { v: null, n: null, stack: [] };
function voiceOn(n, v) {
  rec.on(n, v);
  if (cur().mono !== 'mono') { voices.set(n, play(n, v)); return; }
  mono.stack = mono.stack.filter(x => x !== n).concat(n);
  if (mono.v) { const t = ensureAudio(); lastHz = mtof(noteMidi(n)); mono.v.glide(lastHz, t, cur().glide); } else mono.v = play(n, v);
  mono.n = n;
}
function voiceOff(n) {
  rec.off(n);
  const vc = voices.get(n); if (vc) { vc.release(ctx.currentTime); voices.delete(n); return; }
  mono.stack = mono.stack.filter(x => x !== n);
  if (!mono.v || n !== mono.n) return;
  if (mono.stack.length) { const back = mono.stack[mono.stack.length - 1]; lastHz = mtof(noteMidi(back)); mono.v.glide(lastHz, ctx.currentTime, cur().glide); mono.n = back; }
  else { mono.v.release(ctx.currentTime); mono.v = mono.n = null; }
}

// arpeggiator: plays the held notes one at a time in time with the song's tempo
const ARP_KEY = 'sidechain-arp';
const arp = Object.assign({ mode: 'off', rate: 4, oct: 1, hold: false }, (() => { try { return JSON.parse(localStorage.getItem(ARP_KEY)) || {}; } catch (e) { return {}; } })());
arp.notes = new Map(); arp.i = 0; arp.timer = null; arp.next = 0; arp.last = null;
const saveArp = () => { try { localStorage.setItem(ARP_KEY, JSON.stringify({ mode: arp.mode, rate: arp.rate, oct: arp.oct, hold: arp.hold })); } catch (e) {} };
function arpSeq() {
  const ns = [...arp.notes.keys()].sort((a, b) => a - b), up = [];
  for (let o = 0; o < arp.oct; o++) ns.forEach(n => up.push(n + 12 * o));
  if (arp.mode === 'down') return up.reverse();
  if (arp.mode === 'updown') return up.length > 2 ? up.concat(up.slice(1, -1).reverse()) : up;
  return up;
}
function arpStart() {
  if (arp.timer) return;
  arp.i = 0; arp.next = ensureAudio() + 0.02; arp.last = null;
  arp.timer = setInterval(arpTick, 25); arpTick();
}
function arpStop() { clearInterval(arp.timer); arp.timer = null; if (arp.last) arp.last.v.release(ctx.currentTime); arp.last = null; }
function arpTick() {
  if (!arp.notes.size) return arpStop();
  const step = 60 / (M.bpm || 120) / arp.rate;
  while (arp.next < ctx.currentTime + 0.12) {
    const seq = arpSeq(), n = arp.mode === 'random' ? seq[Math.floor(Math.random() * seq.length)] : seq[arp.i++ % seq.length];
    const t = arp.next, f = mtof(noteMidi(n)), v = arp.notes.get(n) ?? 0.9, L = arp.last;
    lastHz = f; rec.add(n, v, t, t + step * (cur().mono === 'mono' ? 1 : 0.7));
    if (cur().mono === 'mono' && L && L.end >= t - 0.01) { L.v.glide(f, t, cur().glide); L.v.release(t + step); L.end = t + step; }
    else { const vc = startLead(ctx, leadOut, cur(), t, f, v); vc.release(t + step * (cur().mono === 'mono' ? 1 : 0.7)); arp.last = { v: vc, end: t + step }; }
    arp.next += step;
  }
}
function renderArp() {
  $('#arpMode').value = arp.mode; $('#arpRate').value = arp.rate; $('#arpOct').value = arp.oct;
  $('#arpHold').classList.toggle('on', arp.hold); $('#arpHold').setAttribute('aria-pressed', arp.hold);
  $('#arpOpts').hidden = arp.mode === 'off';
}
$('#arpMode').onchange = e => {
  const was = arp.mode; arp.mode = e.target.value; saveArp(); renderArp();
  if (arp.mode === 'off') { arp.notes.clear(); arpStop(); [...held.entries()].forEach(([n, v]) => voiceOn(n, v)); }
  else if (was === 'off') { [...held.keys()].forEach(voiceOff); held.forEach((v, n) => arp.notes.set(n, v)); if (arp.notes.size) arpStart(); }
};
$('#arpRate').onchange = e => { arp.rate = +e.target.value; saveArp(); };
$('#arpOct').onchange = e => { arp.oct = +e.target.value; saveArp(); };
$('#arpHold').onclick = () => { arp.hold = !arp.hold; saveArp(); renderArp(); if (!arp.hold) [...arp.notes.keys()].forEach(n => { if (!held.has(n)) arp.notes.delete(n); }); };
renderArp();
const base = () => 12 * (kbOct + 1);
const keyEl = n => $(`#kb [data-n="${n}"]`);
function renderKeys() {
  const sc = SCALES[M.scale].map(i => (i + M.key) % 12), whites = [], blacks = [];
  for (let i = 0; i < 25; i++) {
    const n = base() + i, pc = n % 12, black = [1, 3, 6, 8, 10].includes(pc), cls = `key ${black ? 'black' : 'white'}${sc.includes(pc) ? ' ink' : ''}${pc === M.key ? ' root' : ''}${held.has(n) ? ' down' : ''}`;
    const label = !black && (pc === 0 || pc === M.key) ? `<span>${NOTE[pc]}${pc === 0 ? Math.floor(n / 12) - 1 : ''}</span>` : '';
    const hint = COMPUTER[i] ? `<kbd>${COMPUTER[i].toUpperCase()}</kbd>` : '';
    (black ? blacks : whites).push({ n, html: `<button class="${cls}" data-n="${n}" aria-label="${NOTE[pc]}${Math.floor(n / 12) - 1}">${hint}${label}</button>`, w: whites.length });
  }
  const W = whites.length;
  $('#kb').style.setProperty('--w', W);
  $('#kb').innerHTML = whites.map(k => k.html).join('') + blacks.map(k => k.html.replace('<button', `<button style="--x:${k.w}"`)).join('');
  $('#octN').textContent = `C${kbOct}–C${kbOct + 2}`;
  $('#inKey').innerHTML = `Dots = notes in your song's key, <b>${NOTE[M.key]} ${M.scale}</b>`;
}
renderKeys();
$('#octDn').onclick = () => { kbOct = Math.max(1, kbOct - 1); saveOct(); renderKeys(); };
$('#octUp').onclick = () => { kbOct = Math.min(6, kbOct + 1); saveOct(); renderKeys(); };

// touch / mouse, including sliding across keys
const pointers = new Map();   // pointerId -> note
const kb = $('#kb');
const keyAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('#kb .key') ? +el.closest('.key').dataset.n : null; };
const velAt = (n, y) => { const r = keyEl(n)?.getBoundingClientRect(); return r ? Math.max(0.3, Math.min(1, 0.3 + 0.7 * (y - r.top) / r.height)) : 0.9; };   // tap near the front edge = harder
kb.addEventListener('pointerdown', e => { const n = keyAt(e.clientX, e.clientY); if (n == null) return; e.preventDefault(); kb.setPointerCapture(e.pointerId); pointers.set(e.pointerId, n); noteOn(n, velAt(n, e.clientY)); });
kb.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return; const n = keyAt(e.clientX, e.clientY), cur = pointers.get(e.pointerId);
  if (n !== cur) { if (cur != null) noteOff(cur); if (n != null) noteOn(n, velAt(n, e.clientY)); pointers.set(e.pointerId, n); }
});
const lift = e => { const n = pointers.get(e.pointerId); if (n != null) noteOff(n); pointers.delete(e.pointerId); };
['pointerup', 'pointercancel'].forEach(t => kb.addEventListener(t, lift));

// computer keys: A W S E D ... play, Z / X shift the octave
document.addEventListener('keydown', e => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase(), i = COMPUTER.indexOf(k);
  if (k === 'z') return $('#octDn').click(); if (k === 'x') return $('#octUp').click();
  if (i >= 0) { e.preventDefault(); noteOn(base() + i); }
});
document.addEventListener('keyup', e => { const i = COMPUTER.indexOf(e.key.toLowerCase()); if (i >= 0) noteOff(base() + i); });
window.addEventListener('blur', () => { [...held.keys()].forEach(noteOff); if (!arp.hold) { arp.notes.clear(); arpStop(); } });

// MIDI keyboard (Chrome, Edge, Android). Asks for permission only when the button is pressed.
$('#midiBtn').onclick = async () => {
  const b = $('#midiBtn');
  if (!navigator.requestMIDIAccess) { b.textContent = 'MIDI not supported in this browser'; b.disabled = true; return; }
  try {
    const acc = await navigator.requestMIDIAccess();
    const hook = () => { const ins = [...acc.inputs.values()]; ins.forEach(inp => { inp.onmidimessage = m => {
      const [st, n, vel] = m.data, cmd = st & 0xf0;
      if (cmd === 0x90 && vel > 0) noteOn(n - 12 * cur().oct, vel / 127); else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) noteOff(n - 12 * cur().oct);
    }; }); b.textContent = ins.length ? `MIDI: ${ins.map(i => i.name).join(', ')}` : 'No MIDI keyboard found'; };
    hook(); acc.onstatechange = hook;
  } catch (err) { b.textContent = 'MIDI blocked'; }
};

/* record: one bar of what you play becomes the Groovebox lead (or bass) pattern.
   Count-in, then a click and the first chord of your progression loop while you play; notes snap to the 16 steps and to the key. */
const rec = {
  state: 'idle', notes: [], open: new Map(), t0: 0, undo: null, timer: null,
  on(n, v) { if (this.state === 'idle') return; const t = ctx.currentTime; this.open.set(n, { n, v, t }); },
  off(n) { const o = this.open.get(n); if (!o) return; this.open.delete(n); this.notes.push({ ...o, end: ctx.currentTime }); },
  add(n, v, t, end) { if (this.state !== 'idle') this.notes.push({ n, v, t, end }); },
};
const sd = () => 60 / (M.bpm || 120) / 4;
const scaleSemis = d => { const sc = SCALES[M.scale]; return sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7); };
const leadBase = () => 72 + (M.key >= 7 ? M.key - 12 : M.key);   // the Groovebox's lead note for degree 0, before the synth's octave
function click(t, hi) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hi ? 1760 : 1100;
  g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.06);
}
function chordBed(t, dur) {   // soft triangle chord on the progression's first chord, so you hear what you're playing over
  const r = firstChord(), g = ctx.createGain(); g.connect(ctx.destination);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05); g.gain.setValueAtTime(0.05, t + dur - 0.1); g.gain.linearRampToValueAtTime(0, t + dur);
  [0, 2, 4].forEach(k => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(leadBase() - 12 + scaleSemis(r + k)); o.connect(g); o.start(t); o.stop(t + dur); });
}
function recStart() {
  const t = ensureAudio() + 0.1, beat = sd() * 4, bar = beat * 4;
  rec.state = 'count'; rec.notes = []; rec.open.clear(); rec.t0 = t + bar;
  for (let b = 0; b < 8; b++) click(t + b * beat, b % 4 === 0);
  chordBed(t, bar * 2);
  renderRec();
  const tick = () => {
    const now = ctx.currentTime;
    if (rec.state === 'count' && now >= rec.t0 - sd() / 2) { rec.state = 'rec'; renderRec(); }
    if (rec.state === 'rec') $('#recBtn').style.setProperty('--p', Math.min(1, (now - rec.t0) / bar));
    if (now >= rec.t0 + bar - sd() / 2) return recFinish();
    rec.timer = requestAnimationFrame(tick);
  };
  rec.timer = requestAnimationFrame(tick);
}
function recFinish() {
  cancelAnimationFrame(rec.timer);
  const now = ctx.currentTime; rec.open.forEach(o => rec.notes.push({ ...o, end: now })); rec.open.clear();
  const pat = Theory.takeToPattern(rec.notes, { t0: rec.t0, step: sd(), sc: SCALES[M.scale], base: part === 'bass' ? bassBase() : leadBase(), root: firstChord() });
  rec.state = 'idle';
  if (pat.some(Boolean)) {
    const song = readSong(); if (song.pat) { rec.undo = { part, pat: song.pat[part] }; song.pat[part] = pat; try { localStorage.setItem(SONG, JSON.stringify(song)); } catch (e) {} }
    $('#recMsg').textContent = `Recorded ${pat.filter(Boolean).length} notes into the Groovebox ${part}.`;
  } else $('#recMsg').textContent = 'Nothing played, lead left as it was.';
  renderRec();
}
function recCancel() { cancelAnimationFrame(rec.timer); rec.state = 'idle'; rec.open.clear(); $('#recMsg').textContent = ''; renderRec(); }
function renderRec() {
  const b = $('#recBtn'); b.hidden = part === 'pad'; b.title = `Record one bar of what you play into the Groovebox ${part}`; b.classList.toggle('on', rec.state !== 'idle'); b.style.setProperty('--p', 0);
  b.textContent = rec.state === 'count' ? '1 2 3 4…' : rec.state === 'rec' ? '● Recording' : '● Record';
  $('#recUndo').hidden = rec.state !== 'idle' || !rec.undo;
  if (rec.state !== 'idle') $('#recMsg').textContent = rec.state === 'count' ? 'Get ready, one bar of clicks first.' : 'Play one bar now.';
}
$('#recBtn').onclick = () => (rec.state === 'idle' ? recStart() : recCancel());
$('#recUndo').onclick = () => {
  const song = readSong(); if (!song.pat || !rec.undo) return; song.pat[rec.undo.part] = rec.undo.pat; const was = rec.undo.part; rec.undo = null;
  try { localStorage.setItem(SONG, JSON.stringify(song)); } catch (e) {} $('#recMsg').textContent = `Put the old ${was} back.`; renderRec();
};
renderRec();

// stay in step with the Groovebox in another tab
window.addEventListener('storage', e => {
  if (e.key === 'sidechain-presets') return panel.renderHead();
  if (e.key === PART_KEY && e.newValue && e.newValue !== part) { setPart(e.newValue); return panel.render(); }
  if (e.key !== SONG || !e.newValue) return;
  try {
    const n = JSON.parse(e.newValue);
    const keyChanged = n.key !== M.key || n.scale !== M.scale;
    Object.assign(M, { key: n.key ?? M.key, scale: SCALES[n.scale] ? n.scale : M.scale, bpm: n.bpm, space: n.space, echo: n.echo, prog: n.prog });
    let redraw = false;
    Synth.PARTS.forEach(({ keys: [k, kid] }) => { if (n[k] && JSON.stringify(n[k]) !== JSON.stringify(M[k])) { M[k] = Synth.normalize(n[k]); M[kid] = n[kid]; redraw = true; } });
    if (redraw) panel.render();
    if (keyChanged) renderKeys();
  } catch (err) {}
});

// leave room under the page for the pinned keyboard
const fitDock = () => document.body.style.setProperty('--dockH', $('#dock').offsetHeight + 16 + 'px');
fitDock(); window.addEventListener('resize', fitDock);
document.body.style.setProperty('--lead', part === 'lead' ? '' : `var(--${part})`);
