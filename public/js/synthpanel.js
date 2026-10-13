// Synth panel UI for one part (lead, bass or chords): presets (built-in + saved), Simple knobs / All controls, and the three pictures.
// Shared by the Groovebox panel and the Synth page. The host page provides the audio side:
//   createSynthPanel(root, {
//     model: () => object with .synth and .synthId (the song state), persist: () => save it,
//     audition: () => play one note, tryPhrase: () => play a short phrase,
//     noteHz: () => pitch to draw the overtones at, analyser: () => AnalyserNode on the lead (or null),
//     lastHz: () => pitch of the last note played, sampleRate: () => audio sample rate,
//     part: () => 'lead' | 'bass' | 'pad', setPart: id => switch the host to that part (model() then returns it) })
// Expects inside root: #synPart (optional) #synH #synPreset #synTry #synSave #synDel #synWho #synMode #synSimple #synGroups
// and the pictures #vzWave #vzSpec #vzEnv with captions #vcWave #vcSpec #vcEnv.
function createSynthPanel(root, o) {
  const $ = s => root.querySelector(s), M = () => o.model();
  const USER_KEY = 'sidechain-presets', MODE_KEY = 'sidechain-synth-mode';
  const userPresets = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)) || {}; } catch (e) { return {}; } };
  const setUserPresets = u => { try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) {} };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let mode = 'simple'; try { mode = localStorage.getItem(MODE_KEY) || 'simple'; } catch (e) {}

  function source() {
    const id = M().synthId || '';
    if (id.startsWith('u:')) { const u = userPresets()[id.slice(2)]; return u && { name: id.slice(2), who: 'Your sound', p: Synth.normalize(u) }; }
    const b = Synth.byId(id); return b && { name: b.name, who: b.who, p: b.p };
  }
  const part = () => Synth.part(o.part ? o.part() : 'lead');
  function renderHead() {
    const m = M(), u = Object.keys(userPresets()), src = source(), pt = part();
    root.style.setProperty('--lead', pt.id === 'lead' ? '' : `var(--${pt.id})`);
    if ($('#synH')) $('#synH').textContent = `${pt.name} synth`;
    $('#synPreset').setAttribute('aria-label', `${pt.name} sound preset`);
    if ($('#synPart')) $('#synPart').innerHTML = Synth.PARTS.map(x => `<button data-part="${x.id}" aria-pressed="${x.id === pt.id}" style="--c:var(--${x.id})">${x.name}</button>`).join('');
    const opt = (v, label) => `<option value="${esc(v)}"${v === m.synthId ? ' selected' : ''}>${esc(label)}</option>`;
    $('#synPreset').innerHTML = (src ? '' : '<option value="" selected>Custom</option>') +
      Synth.catsFor(part().id).map(([c, label]) => `<optgroup label="${label}">${Synth.PRESETS.filter(x => x.cat === c).map(x => opt(x.id, x.name)).join('')}</optgroup>`).join('') +
      (u.length ? `<optgroup label="My sounds">${u.map(n => opt('u:' + n, n)).join('')}</optgroup>` : '');
    $('#synDel').hidden = !(m.synthId || '').startsWith('u:');
    $('#synWho').textContent = src ? `${src.who}${Synth.same(src.p, m.synth) ? '' : ' · edited'}` : 'Your own tweaks. Save to keep them.';
    drawAll();
  }
  const hasSamples = typeof Samples !== 'undefined';
  function ctlHTML(s) {
    const v = M().synth[s.k];
    if (s.when && !s.when(M().synth)) return '';
    if (s.type === 'sample') {
      const list = hasSamples ? Samples.list() : [], known = list.some(x => x.id === v);
      return `<div class="seg samp"><span class="lbl">${s.label}</span><select data-sample aria-label="Sample">
        ${known ? '' : `<option value="" selected>${list.length ? 'Pick a sample' : 'No samples yet'}</option>`}
        ${list.map(x => `<option value="${esc(x.id)}"${x.id === v ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
        <option value="+">Load a file…</option></select>${known ? '<button class="btn sm" data-sdel>Delete</button>' : ''}
        <input type="file" accept="audio/*" hidden data-sfile>
        <small>A short sound works best: one sung "ooh", a piano note, a pluck, a vocal chop. Set Sample note to the note it plays so it lands in tune. Samples stay in this browser.</small></div>`;
    }
    if (s.type === 'choice') return `<div class="seg" role="group" aria-label="${s.label}"><span class="lbl">${s.label}</span>${s.options.map(([val, l]) => `<button data-k="${s.k}" data-v="${val}" aria-pressed="${val === v}">${l}</button>`).join('')}</div>`;
    return `<label class="mac" for="sy-${s.k}"><header><span class="lbl">${s.label}</span><output id="syo-${s.k}">${s.fmt(v)}</output></header>
      <input type="range" id="sy-${s.k}" data-k="${s.k}" min="${s.log ? 0 : s.min}" max="${s.log ? 1 : s.max}" step="${s.log ? 0.001 : s.step}" value="${Synth.toSlider(s, v)}"></label>`;
  }
  function macroHTML(mc) {
    const x = mc.get(M().synth);
    return `<label class="mac" for="sm-${mc.k}"><header><span class="lbl">${mc.label}</span><output id="smo-${mc.k}">${Math.round(x * 100)}%</output></header>
      <input type="range" id="sm-${mc.k}" data-m="${mc.k}" min="0" max="1" step="0.01" value="${x}"><small>${mc.tip}</small></label>`;
  }
  function render() {
    renderHead();
    $('#synMode').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === mode));
    $('#synSimple').hidden = mode !== 'simple'; $('#synGroups').hidden = mode === 'simple';
    $('#synSimple').innerHTML = Synth.MACROS.map(macroHTML).join('') + ctlHTML(Synth.PARAMS.find(s => s.k === 'oct'));
    $('#synGroups').innerHTML = Synth.GROUPS.map(g => `<fieldset class="sgrp"><legend>${g.name}</legend><p class="tip">${g.tip}</p>
      <div class="ctl">${Synth.PARAMS.filter(s => s.g === g.id).map(ctlHTML).join('')}</div></fieldset>`).join('');
  }

  /* pictures: one cycle of the wave, overtones vs. the filter, and the shape of a note over time */
  const css = v => getComputedStyle(root).getPropertyValue(v).trim();
  let fltCtx; try { fltCtx = new OfflineAudioContext(1, 1, 44100); } catch (e) {}
  function fit(cv) { const d = devicePixelRatio || 1, w = cv.clientWidth * d, h = cv.clientHeight * d; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } const c = cv.getContext('2d'); c.clearRect(0, 0, w, h); return [c, w, h, d]; }
  function drawWave(live) {
    const [c, w, h, d] = fit($('#vzWave')), p = M().synth, an = o.analyser();
    c.fillStyle = css('--panel2'); c.fillRect(0, 0, w, h);
    c.strokeStyle = css('--line'); c.lineWidth = d; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    let pts = Synth.waveShape(p, 240, 2);
    if (live && an) {
      const a = new Float32Array(an.fftSize); an.getFloatTimeDomainData(a); let z = 1; while (z < a.length / 2 && !(a[z - 1] < 0 && a[z] >= 0)) z++;
      const win = Math.min(a.length - z, Math.round(o.sampleRate() / o.lastHz() * 2)), seg = a.slice(z, z + win), m = Math.max(1e-4, ...seg.map(Math.abs));
      pts = Array.from(seg).map(v => v / m);
    }
    c.strokeStyle = css('--lead'); c.lineWidth = (1.5 + Math.min(p.voices, 7) * 0.35) * d; c.lineJoin = 'round'; c.beginPath();
    pts.forEach((v, i) => { const x = i / (pts.length - 1) * w, y = h / 2 - v * h * 0.4; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    $('#vcWave').textContent = Synth.describe(p).tone + (live ? ' · live' : '');
  }
  function drawSpec() {
    const [c, w, h, d] = fit($('#vzSpec')), p = M().synth, N = 120;
    c.fillStyle = css('--panel2'); c.fillRect(0, 0, w, h);
    const sp = Synth.spectrum(p, o.noteHz(), N, 50, 16000), fr = new Float32Array(sp.map(x => x.f)), mag = new Float32Array(N), ph = new Float32Array(N);
    if (fltCtx) { const b = fltCtx.createBiquadFilter(); b.type = p.ftype; b.frequency.value = p.cut; b.Q.value = p.res; b.getFrequencyResponse(fr, mag, ph); } else mag.fill(1);
    const db = v => Math.max(0, 1 + 20 * Math.log10(Math.max(v, 1e-5)) / 48), bw = w / N;   // 0 dB at top, -48 dB at the bottom
    sp.forEach((x, i) => {
      const raw = db(x.mag), kept = db(x.mag * mag[i]);
      c.fillStyle = css('--line'); c.fillRect(i * bw, h - raw * h, Math.max(1, bw - d), raw * h);
      c.fillStyle = css('--lead'); c.fillRect(i * bw, h - kept * h, Math.max(1, bw - d), kept * h);
    });
    c.strokeStyle = css('--ink'); c.lineWidth = 1.5 * d; c.beginPath();
    Array.from(mag).forEach((m, i) => { const x = (i + 0.5) * bw, y = Math.max(2 * d, h * 0.15 + (1 - db(m)) * h * 0.85); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    $('#vcSpec').textContent = `${Synth.describe(p).bright}. Grey = overtones in the tone, pink = what gets through the filter (white line).`;
  }
  function drawEnv() {
    const [c, w, h, d] = fit($('#vzEnv')), p = M().synth, hold = Math.max(0.5, p.att + 0.25), T = Math.min(4, hold + Math.max(0.35, p.rel * 1.3)), N = 200, pad = 10 * d;
    c.fillStyle = css('--panel2'); c.fillRect(0, 0, w, h);
    const X = t => t / T * w, Y = v => h - pad / 2 - v * (h - pad * 1.4), lfo = t => (p.lfo === 'off' ? 0 : p.lfoDepth * Math.sin(2 * Math.PI * p.lfoRate * t));
    c.strokeStyle = css('--line'); c.setLineDash([3 * d, 3 * d]); c.lineWidth = d; c.beginPath(); c.moveTo(X(hold), 0); c.lineTo(X(hold), h); c.stroke(); c.setLineDash([]);
    c.fillStyle = css('--dim'); c.font = `${10 * d}px ${css('--mono')}`; c.fillText('let go', X(hold) + 3 * d, 11 * d);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N * T, e = Synth.envAt(p, t, hold); let a = e.amp, ct = e.cut;
      if (p.lfo === 'amp') a *= 1 - p.lfoDepth / 2 + lfo(t) / 2; if (p.lfo === 'filter') ct *= 1 + lfo(t) * 0.9;
      pts.push([t, a, Math.log(Math.max(100, ct) / 100) / Math.log(180)]);
    }
    c.fillStyle = css('--lead') + '55'; c.strokeStyle = css('--lead'); c.lineWidth = 2 * d; c.beginPath(); c.moveTo(0, Y(0)); pts.forEach(([t, a]) => c.lineTo(X(t), Y(a))); c.lineTo(w, Y(0)); c.fill();
    c.beginPath(); pts.forEach(([t, a], i) => (i ? c.lineTo(X(t), Y(a)) : c.moveTo(X(t), Y(a)))); c.stroke();
    c.strokeStyle = css('--ink'); c.lineWidth = 1.2 * d; c.setLineDash([4 * d, 3 * d]); c.beginPath(); pts.forEach(([t, , b], i) => (i ? c.lineTo(X(t), Y(b)) : c.moveTo(X(t), Y(b)))); c.stroke(); c.setLineDash([]);
    if (p.lfo === 'pitch' && p.lfoDepth > 0.01) { c.strokeStyle = css('--dim'); c.lineWidth = d; c.beginPath(); for (let i = 0; i <= N; i++) { const t = i / N * T, y = 6 * d + lfo(t) * 4 * d; i ? c.lineTo(X(t), y) : c.moveTo(X(t), y); } c.stroke(); }
    $('#vcEnv').textContent = `${Synth.describe(p).shape}. Pink = volume, dashed = brightness, over ${T.toFixed(1)} s.`;
  }
  function drawAll() { drawWave(false); drawSpec(); drawEnv(); }
  // Call every animation frame: swaps the wave picture to the real lead output while it sounds.
  let live = false;
  function tick() {
    const an = o.analyser(); if (!an) return;
    const a = new Float32Array(256); an.getFloatTimeDomainData(a); const on = a.some(v => Math.abs(v) > 0.003);
    if (on) drawWave(true); else if (live) drawWave(false); live = on;
  }

  /* events */
  const set = (k, v) => { M().synth[k] = v; renderHead(); o.persist(); };
  const showSample = () => { const id = M().synth.wave === 'sample' && M().synth.sample; if (hasSamples && id) Samples.forPictures(id).then(() => drawAll()); };
  if (hasSamples) {
    Samples.refresh().then(() => { if (M().synth.wave === 'sample') render(); showSample(); });
    window.addEventListener('storage', e => { if (e.key === 'sidechain-samples') Samples.refresh().then(() => { if (M().synth.wave === 'sample') render(); }); });
  }
  const pickSample = id => { set('sample', id); render(); showSample(); setTimeout(() => o.audition(), 50); };
  $('#synPreset').onchange = e => { const id = e.target.value; if (!id) return; M().synthId = id; const src = source(); if (src) M().synth = Synth.normalize(src.p); render(); showSample(); o.persist(); o.audition(); };
  $('#synTry').onclick = () => o.tryPhrase();
  if ($('#synPart')) $('#synPart').onclick = e => { const b = e.target.closest('button'); if (!b || !o.setPart) return; o.setPart(b.dataset.part); render(); showSample(); };
  $('#synSave').onclick = () => {
    const m = M(), cur = source(), name = (prompt('Name this sound', cur && (m.synthId || '').startsWith('u:') ? cur.name : (cur ? cur.name + ' (mine)' : 'My ' + part().name.toLowerCase())) || '').trim().slice(0, 40);
    if (!name) return; const u = userPresets(); u[name] = { ...m.synth }; setUserPresets(u); m.synthId = 'u:' + name; renderHead(); o.persist();
  };
  $('#synDel').onclick = () => {
    const m = M(), id = m.synthId || ''; if (!id.startsWith('u:') || !confirm(`Delete "${id.slice(2)}"?`)) return;
    const u = userPresets(); delete u[id.slice(2)]; setUserPresets(u); m.synthId = ''; renderHead(); o.persist();
  };
  $('#synMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; try { localStorage.setItem(MODE_KEY, mode); } catch (e2) {} render(); };
  const onRange = e => {
    const mk = e.target.dataset.m, k = e.target.dataset.k;
    if (mk) { M().synth = Synth.applyMacro(M().synth, mk, +e.target.value); $('#smo-' + mk).textContent = Math.round(e.target.value * 100) + '%'; renderHead(); o.persist(); }
    else if (k) { const s = Synth.PARAMS.find(x => x.k === k); if (!s || s.type === 'choice') return; const v = Synth.fromSlider(s, +e.target.value); set(k, v); $('#syo-' + k).textContent = s.fmt(v); }
  };
  ['#synSimple', '#synGroups'].forEach(id => {
    $(id).oninput = onRange;
    $(id).onchange = async e => {
      const t = e.target;
      if (t.type === 'range') return o.audition();
      if (t.dataset.sample !== undefined) { if (t.value === '+') { t.value = M().synth.sample; t.parentElement.querySelector('[data-sfile]').click(); } else if (t.value) pickSample(t.value); return; }
      if (t.dataset.sfile !== undefined && t.files[0]) { try { pickSample(await Samples.add(t.files[0])); } catch (err) { alert(err.message && /15 MB/.test(err.message) ? err.message : 'That file could not be read as audio. Try a WAV or MP3.'); } }
    };
    $(id).onclick = async e => {
      if (e.target.closest('[data-sdel]')) { const s = M().synth.sample, nm = (Samples.list().find(x => x.id === s) || {}).name; if (s && confirm(`Delete the sample "${nm}"? Sounds that use it will play a plain tone.`)) { await Samples.remove(s); set('sample', ''); render(); } return; }
      const b = e.target.closest('.seg button[data-k]'); if (!b) return; set(b.dataset.k, b.dataset.v);
      if (b.dataset.k === 'wave') { render(); showSample(); } else b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      o.audition();
    };
  });
  window.addEventListener('resize', () => drawAll());
  return { render, renderHead, tick };
}
