import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function proxyYahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json'
    }
  });
  if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
  return r.json();
}

function serveStatic(reqPath, res) {
  let rel = decodeURIComponent(reqPath.split('?')[0]);
  if (rel === '/' || rel === '/dashboard') rel = '/dashboard.html';
  const filePath = path.normalize(path.join(__dirname, rel));
  if (!filePath.startsWith(__dirname)) {
    send(res, 403, 'Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    if (url.pathname === '/api/quote') {
      const symbol = (url.searchParams.get('symbol') || '').trim();
      if (!symbol) {
        send(res, 400, JSON.stringify({ error: 'symbol required' }), { 'Content-Type': 'application/json' });
        return;
      }
      const data = await proxyYahooQuote(symbol);
      send(res, 200, JSON.stringify(data), {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      return;
    }
    serveStatic(url.pathname, res);
  } catch (e) {
    send(res, 502, JSON.stringify({ error: String(e.message || e) }), { 'Content-Type': 'application/json' });
  }
});

server.listen(PORT, () => {
  console.log(`Mis Finanzas en http://localhost:${PORT}/`);
});
