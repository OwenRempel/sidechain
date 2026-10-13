const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 5000 + Math.floor(Math.random() * 1000);
const base = `http://localhost:${PORT}`;
let server;

test.before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT, ANTHROPIC_API_KEY: '' } });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', d => String(d).includes('running') && resolve());
    server.on('exit', code => reject(new Error(`server exited ${code}`)));
  });
});
test.after(() => server.kill());

test('serves both pages and static assets', async () => {
  for (const [url, type] of [['/', 'text/html'], ['/lab.html', 'text/html'], ['/js/theory.js', 'text/javascript'], ['/css/app.css', 'text/css']]) {
    const res = await fetch(base + url);
    assert.equal(res.status, 200, url);
    assert.equal(res.headers.get('content-type'), type, url);
  }
  assert.equal((await fetch(base + '/nope.html')).status, 404);
});

test('blocks path traversal', async () => {
  const res = await fetch(base + '/%2e%2e/server.js');
  assert.notEqual(res.status, 200);
});

test('arrange explains a missing API key', async () => {
  const res = await fetch(base + '/api/arrange', { method: 'POST', body: '{}' });
  assert.equal(res.status, 500);
  assert.match((await res.json()).error, /ANTHROPIC_API_KEY/);
});
