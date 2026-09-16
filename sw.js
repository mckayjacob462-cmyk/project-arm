/* =========================================================================
   CNC Study — offline service worker.

   The point of this app is a phone in a machine shop, where there is often
   no signal at all. So the whole thing is precached on first visit and
   served cache-first afterwards: once you have opened it once, it works in
   airplane mode, in a basement, anywhere.

   Bump VERSION on every deploy — that is what evicts the old cache.
   ========================================================================= */
const VERSION = 'cnc-study-v3';
const SHELL = VERSION + '-shell';
const FONTS = VERSION + '-fonts';

/* relative, so this works at a subpath like /project-arm/ as well as a root */
const SHELL_FILES = [
  './',
  './index.html',
  './trainer.html',
  './engine.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      /* one miss must not fail the whole install, so add them one at a time */
      .then(c => Promise.all(SHELL_FILES.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });

const isFont = url => url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Google Fonts: serve what we have, refresh in the background */
  if (isFont(url)){
    e.respondWith(
      caches.open(FONTS).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => { if (res && res.status === 200) c.put(req, res.clone()); return res; })
                              .catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  /* a navigation with no network falls back to the app shell */
  if (req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(res => { const cp = res.clone(); caches.open(SHELL).then(c => c.put(req, cp)); return res; })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic'){
        const cp = res.clone();
        caches.open(SHELL).then(c => c.put(req, cp));
      }
      return res;
    }))
  );
});
