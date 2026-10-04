/* SmartAgri — service worker (PWA). Ma build (BUILD) duoc tools/dong-goi-web.js thay bang ma ban build.
 * - Trang (index.html): MANG TRUOC, mat mang moi dung ban da luu -> luon nhan ban moi khi co mang.
 * - Thu vien CDN (Leaflet, Tailwind, font...): dung ban da luu, cap nhat ngam.
 * - KHONG BAO GIO luu du lieu Apps Script (script.google.com / googleusercontent) — du lieu ca nhan
 *   va token phien khong nam trong bo nho dem cua may.
 */
const BUILD = "3.0.4-aa19d205";
const SHELL_CACHE = 'smartagri-shell-' + BUILD;
const CDN_CACHE = 'smartagri-cdn-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const CDN_HOSTS = ['unpkg.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const NEVER_CACHE = ['script.google.com', 'script.googleusercontent.com', 'googleusercontent.com', 'docs.google.com', 'drive.google.com', 'open-meteo.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(k => k.startsWith('smartagri-shell-') && k !== SHELL_CACHE)
    .map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (NEVER_CACHE.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) return; // di thang ra mang
  if (/\/exec$/.test(url.pathname) || url.searchParams.has('key')) return; // API / token: khong bao gio luu

  if (url.origin === self.location.origin) {
    // Mang truoc cho trang + tep cung nguon; that bai -> ban da luu
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(r => r || caches.match('./index.html'))));
    return;
  }

  if (CDN_HOSTS.some(h => url.hostname === h)) {
    // Ban da luu truoc, cap nhat ngam (stale-while-revalidate)
    e.respondWith(caches.open(CDN_CACHE).then(cache => cache.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
  // con lai (anh ve tinh ban do...) -> mac dinh cua trinh duyet
});
