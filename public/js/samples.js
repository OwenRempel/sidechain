// Your own samples: audio files you load, kept in this browser (IndexedDB), shared by the Groovebox and the Synth page.
// Samples.list() -> [{id, name}], add(file) -> id, remove(id), load(ctx, id) -> AudioBuffer (cached), get(ctx, id) -> AudioBuffer or null.
// Loading also hands the sound to Synth.setSample so the pictures can draw it.
const Samples = (() => {
  const DB = 'sidechain', STORE = 'samples', MAX = 15 * 1024 * 1024;
  let dbp = null, names = [];
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('No IndexedDB'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode), q = fn(t.objectStore(STORE)); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  const buffers = new WeakMap();   // ctx -> Map(id -> AudioBuffer | Promise)
  const cache = ctx => { if (!buffers.has(ctx)) buffers.set(ctx, new Map()); return buffers.get(ctx); };
  const changed = () => { try { localStorage.setItem('sidechain-samples', String(Date.now())); } catch (e) {} };   // tells the other page

  async function refresh() { try { names = (await tx('readonly', s => s.getAll())).map(x => ({ id: x.id, name: x.name })).sort((a, b) => a.name.localeCompare(b.name)); } catch (e) { names = []; } return names; }
  const list = () => names;
  async function add(file) {
    if (file.size > MAX) throw new Error('That file is over 15 MB. Trim it to a few seconds first.');
    const data = await file.arrayBuffer();
    const probe = new OfflineAudioContext(1, 1, 44100); await probe.decodeAudioData(data.slice(0));   // throws if it isn't audio
    const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name = file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Sample';
    await tx('readwrite', s => s.put({ id, name, data })); await refresh(); changed(); return id;
  }
  async function remove(id) { await tx('readwrite', s => s.delete(id)); Synth.setSample(id, null); await refresh(); changed(); }
  function load(ctx, id) {
    const c = cache(ctx); if (!id) return Promise.resolve(null);
    if (!c.has(id)) c.set(id, tx('readonly', s => s.get(id)).then(rec => (rec ? ctx.decodeAudioData(rec.data.slice(0)) : null)).then(buf => {
      c.set(id, buf); if (buf) Synth.setSample(id, { data: buf.getChannelData(0).slice(0, buf.sampleRate * 2), sr: buf.sampleRate }); return buf;
    }).catch(() => { c.set(id, null); return null; }));
    return Promise.resolve(c.get(id));
  }
  const get = (ctx, id) => { const b = cache(ctx).get(id); if (b === undefined && id) load(ctx, id); return b instanceof AudioBuffer ? b : null; };
  // the pictures need the data even before any audio has started
  let picCtx = null;
  const forPictures = id => { if (!id) return Promise.resolve(null); picCtx = picCtx || new OfflineAudioContext(1, 1, 44100); return load(picCtx, id); };
  startLead.getBuffer = get;
  window.addEventListener('storage', e => { if (e.key === 'sidechain-samples') refresh(); });
  return { list, refresh, add, remove, load, get, forPictures };
})();
