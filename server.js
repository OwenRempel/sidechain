// Zero-dependency local server: serves /public and proxies AI calls so the API key never reaches the browser.
// Run: node server.js   (Node 18+). Optional: ANTHROPIC_API_KEY in .env or the environment for /api/arrange.
const http = require('http');
const fs = require('fs');
const path = require('path');

try { // tiny .env loader
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const PORT = process.env.PORT || 5173;
const ROOT = path.join(__dirname, 'public');
const MODEL = process.env.SIDECHAIN_MODEL || 'claude-sonnet-5-5';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mid': 'audio/midi' };

// M3 starting point: send the song JSON, get back an arrangement. The schema is a first draft, see CLAUDE.md.
async function arrange(song) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Set ANTHROPIC_API_KEY in .env to use the AI arranger.');
  const prompt = `You arrange electronic music. Here is a one-bar loop song state (tempo, key, scale, chord progression as scale degrees, 16-step patterns per track):
${JSON.stringify(song)}
Return ONLY JSON: {"sections":[{"name":"intro|build|drop|breakdown|outro","bars":number,"tracks":["kick","clap","hat","ohat","bass","lead","pad"],"filter":0..1,"notes":"short reason"}]}
Aim for a 2-3 minute song with a satisfying energy curve.`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content.map(c => c.text || '').join('');
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/arrange') {
    let body = ''; req.on('data', c => (body += c));
    req.on('end', async () => {
      try { const out = await arrange(JSON.parse(body)); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out)); }
      catch (e) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.normalize(path.join(ROOT, url === '/' ? 'index.html' : url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); res.end(buf);
  });
}).listen(PORT, () => console.log(`Sidechain running at http://localhost:${PORT}`));
