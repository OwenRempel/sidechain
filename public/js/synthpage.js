// Synth page: the lead synth panel full-size, pictures pinned at the top, a playable keyboard pinned at the bottom.
// Reads and writes the Groovebox song in localStorage['sidechain-v1'] (only .synth and .synthId), so both pages stay in step.
const $ = s => document.querySelector(s);
const SONG = 'sidechain-v1', OCT_KEY = 'sidechain-kb-oct';
const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] }; // same as groovebox.js
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const readSong = () => { try { return JSON.parse(localStorage.getItem(SONG)) || {}; } catch (e) { return {}; } };

const M = readSong();
M.synth = M.synth ? Synth.normalize(M.synth) : Synth.normalize(Synth.byId(M.synthId = 'chime').p);
M.key = M.key ?? 0; M.scale = SCALES[M.scale] ? M.scale : 'major';
function persist() { const cur = readSong(); cur.synth = M.synth; cur.synthId = M.synthId; try { localStorage.setItem(SONG, JSON.stringify(cur)); } catch (e) {} }

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
  ctx.resume(); return ctx.currentTime + 0.01;
}
const noteMidi = n => n + 12 * M.synth.oct;
function play(n, v = 1) { const t = ensureAudio(), f = mtof(noteMidi(n)); lastHz = f; return startLead(ctx, leadOut, M.synth, t, f, v); }
const audition = () => play(60 + M.key, 1).release(ctx.currentTime + 0.32);
function tryPhrase() {
  const sc = SCALES[M.scale], deg = d => 60 + M.key + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7), s = 60 / (M.bpm || 120) / 4 * 1.5;
  const t0 = ensureAudio();
  [[0, 0, 2], [2, 2, 1], [4, 3, 1], [7, 4, 2], [4, 6, 2], [2, 8, 1], [0, 9, 5]].forEach(([d, st, len]) => {
    const f = mtof(noteMidi(deg(d))); lastHz = f; startLead(ctx, leadOut, M.synth, t0 + st * s, f, st ? 0.85 : 1).release(t0 + (st + len) * s * 0.93);
  });
}

const panel = createSynthPanel($('#synth'), {
  model: () => M, persist, audition, tryPhrase,
  noteHz: () => mtof(noteMidi(60 + M.key)), analyser: () => leadAn || null, lastHz: () => lastHz, sampleRate: () => (ctx ? ctx.sampleRate : 44100),
});
panel.render();
(function frame() { requestAnimationFrame(frame); panel.tick(); })();

/* keyboard: two octaves, notes in the song's key marked, played by touch, mouse, computer keys or a MIDI keyboard */
let kbOct = 4; try { kbOct = +localStorage.getItem(OCT_KEY) || 4; } catch (e) {}
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
  if (M.synth.mono !== 'mono') { voices.set(n, play(n, v)); return; }
  mono.stack = mono.stack.filter(x => x !== n).concat(n);
  if (mono.v) { const t = ensureAudio(); lastHz = mtof(noteMidi(n)); mono.v.glide(lastHz, t, M.synth.glide); } else mono.v = play(n, v);
  mono.n = n;
}
function voiceOff(n) {
  const vc = voices.get(n); if (vc) { vc.release(ctx.currentTime); voices.delete(n); return; }
  mono.stack = mono.stack.filter(x => x !== n);
  if (!mono.v || n !== mono.n) return;
  if (mono.stack.length) { const back = mono.stack[mono.stack.length - 1]; lastHz = mtof(noteMidi(back)); mono.v.glide(lastHz, ctx.currentTime, M.synth.glide); mono.n = back; }
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
    lastHz = f;
    if (M.synth.mono === 'mono' && L && L.end >= t - 0.01) { L.v.glide(f, t, M.synth.glide); L.v.release(t + step); L.end = t + step; }
    else { const vc = startLead(ctx, leadOut, M.synth, t, f, v); vc.release(t + step * (M.synth.mono === 'mono' ? 1 : 0.7)); arp.last = { v: vc, end: t + step }; }
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
$('#octDn').onclick = () => { kbOct = Math.max(1, kbOct - 1); try { localStorage.setItem(OCT_KEY, kbOct); } catch (e) {} renderKeys(); };
$('#octUp').onclick = () => { kbOct = Math.min(6, kbOct + 1); try { localStorage.setItem(OCT_KEY, kbOct); } catch (e) {} renderKeys(); };

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
      if (cmd === 0x90 && vel > 0) noteOn(n - 12 * M.synth.oct, vel / 127); else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) noteOff(n - 12 * M.synth.oct);
    }; }); b.textContent = ins.length ? `MIDI: ${ins.map(i => i.name).join(', ')}` : 'No MIDI keyboard found'; };
    hook(); acc.onstatechange = hook;
  } catch (err) { b.textContent = 'MIDI blocked'; }
};

// stay in step with the Groovebox in another tab
window.addEventListener('storage', e => {
  if (e.key === 'sidechain-presets') return panel.renderHead();
  if (e.key !== SONG || !e.newValue) return;
  try {
    const n = JSON.parse(e.newValue);
    const keyChanged = n.key !== M.key || n.scale !== M.scale;
    Object.assign(M, { key: n.key ?? M.key, scale: SCALES[n.scale] ? n.scale : M.scale, bpm: n.bpm, space: n.space, echo: n.echo });
    if (n.synth && JSON.stringify(n.synth) !== JSON.stringify(M.synth)) { M.synth = Synth.normalize(n.synth); M.synthId = n.synthId; panel.render(); }
    if (keyChanged) renderKeys();
  } catch (err) {}
});

// leave room under the page for the pinned keyboard
const fitDock = () => document.body.style.setProperty('--dockH', $('#dock').offsetHeight + 16 + 'px');
fitDock(); window.addEventListener('resize', fitDock);
