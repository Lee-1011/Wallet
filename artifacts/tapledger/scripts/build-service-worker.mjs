import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/public/', import.meta.url));

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return files.flat();
}

const files = (await filesIn(root)).filter((file) => !file.endsWith('/sw.js'));
const precache = files.map((file) => relative(root, file).split('\\').join('/')).sort();
const hash = createHash('sha256');
for (const file of files.sort()) hash.update(await readFile(file));
const cacheName = `tapledger-static-${hash.digest('hex').slice(0, 16)}`;

const source = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const CACHE_PREFIX = 'tapledger-static-';
const PRECACHE = ${JSON.stringify(precache)};
const urlFor = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE.map(urlFor))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(urlFor('index.html'))) || fetch(urlFor('index.html'));
    })());
    return;
  }

  if (PRECACHE.some((path) => url.href === urlFor(path))) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
`;

await writeFile(join(root, 'sw.js'), source);
console.log(`Generated ${cacheName} with ${precache.length} local assets`);
