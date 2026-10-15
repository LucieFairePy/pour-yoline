// Static file server for the test runs: like `python -m http.server`, but never lets the browser
// cache anything, so a reload always gets the current files. No dependencies.
// usage: node tools/qa/serve.mjs <port> [root]   (root defaults to the repo root)
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.ico': 'image/x-icon',
};

export const serve = (port, root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')) =>
  new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = normalize(join(root, p));
      if (!f.startsWith(normalize(root))) return res.writeHead(403).end();
      try {
        if (statSync(f).isDirectory()) f = join(f, 'index.html');
        const st = statSync(f);
        res.writeHead(200, {
          'Content-Type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream',
          'Content-Length': st.size,
          'Cache-Control': 'no-store, must-revalidate',
          Expires: '0',
        });
        createReadStream(f).pipe(res);
      } catch (e) {
        res.writeHead(404).end('not found');
      }
    });
    srv.listen(port, '127.0.0.1', () => ok(srv));
  });

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = +(process.argv[2] || 8850);
  await serve(port, process.argv[3] ? resolve(process.argv[3]) : undefined);
  console.log('serving on http://127.0.0.1:' + port);
}
