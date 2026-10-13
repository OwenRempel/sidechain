// Standard MIDI file (type 1) export for the groovebox.
// One bar per chord in the progression; drums on channel 10, bass/lead/chords on 1-3.
function exportMidi(S, { semis, bassBase, leadOct = 0, bassOct = 0, padOct = 0 }) {
  const PPQ = 96, STEP = PPQ / 4, BAR = STEP * 16, bars = S.prog.length;
  const DRUM = { kick: 36, clap: 38, hat: 42, ohat: 46 };
  const tracks = { Drums: [], Bass: [], Lead: [], Chords: [] };
  const add = (trk, ch, tick, note, vel, len) => {
    tracks[trk].push([tick, 0x90 | ch, note, Math.max(1, Math.round(vel * 127))]);
    tracks[trk].push([tick + len, 0x80 | ch, note, 0]);
  };
  for (let b = 0; b < bars; b++) {
    const r = S.prog[b], o = b * BAR;
    for (let st = 0; st < 16; st++) {
      const t = o + st * STEP;
      for (const id in DRUM) if (S.pat[id][st] && !S.mute[id]) add('Drums', 9, t, DRUM[id], S.pat[id][st], STEP / 2);
      const bn = S.pat.bass[st];
      if (bn && !S.mute.bass) add('Bass', 0, t, bassBase() + bassOct + semis(r + bn.d), bn.v, bn.len * STEP - 2);
      const ln = S.pat.lead[st];
      if (ln && !S.mute.lead) add('Lead', 1, t, bassBase() + 36 + leadOct + semis(r + ln.d), ln.v, ln.len * STEP - 2);
      if (S.pat.pad[st] && !S.mute.pad) {
        let nx = st + 1; while (nx < 16 && !S.pat.pad[nx]) nx++;
        [0, 2, 4].forEach(k => add('Chords', 2, t, bassBase() + 24 + padOct + semis(r + k), 0.7, (nx - st) * STEP - 2));
      }
    }
  }
  const vlq = n => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; };
  const str = s => [...s].map(c => c.charCodeAt(0));
  const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const chunk = (id, data) => [...str(id), ...u32(data.length), ...data];
  const tempo = Math.round(60e6 / S.bpm);
  const tempoTrack = [0, 0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255,
    0, 0xff, 0x58, 4, 4, 2, 24, 8, 0, 0xff, 0x2f, 0];
  const body = [chunk('MTrk', tempoTrack)];
  for (const [name, evs] of Object.entries(tracks)) {
    evs.sort((a, b) => a[0] - b[0] || (a[1] & 0xf0) - (b[1] & 0xf0)); // note-offs before note-ons at same tick
    const data = [0, 0xff, 0x03, name.length, ...str(name)]; let last = 0;
    for (const [tick, s, n, v] of evs) { data.push(...vlq(tick - last), s, n, v); last = tick; }
    data.push(0, 0xff, 0x2f, 0);
    body.push(chunk('MTrk', data));
  }
  const header = chunk('MThd', [0, 1, 0, body.length, 0, PPQ]);
  const bytes = new Uint8Array([...header, ...body.flat()]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
  a.download = `sidechain-${S.style}-${S.bpm}bpm.mid`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
