import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const root = resolve(process.env.STATIC_DIR || 'dist/client');
const base = (process.env.PAGES_BASE_PATH || '').replace(/\/$/, '');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.rsc': 'text/x-component' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (base && path === base) { response.writeHead(308, { Location: `${base}/${url.search}` }); response.end(); return; }
    if (base && !path.startsWith(`${base}/`)) { response.writeHead(404); response.end('Not found'); return; }
    path = path.slice(base.length);
    let file = resolve(root, `.${path}`);
    if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    let buffer = await readFile(file);
    // Local-only fixtures: these are never included in the exported site.
    if (process.env.QA_ENABLED === '1' && extname(file) === '.html') {
      const scenario = url.searchParams.get('_qa');
      const fixtures = {
        'no-webgl': `<script>const originalContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:originalContext.call(this,type,...args)};</script>`,
        'reduced-motion': `<script>const originalMatchMedia=window.matchMedia.bind(window);window.matchMedia=function(query){const result=originalMatchMedia(query);if(query==='(prefers-reduced-motion: reduce)')Object.defineProperty(result,'matches',{value:true});return result};</script>`,
        'text-zoom': `<style>html{font-size:200%!important}</style>`,
        'fresh-session': `<script>sessionStorage.removeItem('ps2folio:booted');</script>`,
        'storage-blocked': `<script>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Storage unavailable','SecurityError')}});</script>`,
      };
      if (fixtures[scenario]) buffer = Buffer.from(buffer.toString().replace('<head>', `<head>${fixtures[scenario]}`));
    }
    response.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': buffer.length });
    response.end(request.method === 'HEAD' ? undefined : buffer);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Static portfolio: http://127.0.0.1:${port}${base}/`));
