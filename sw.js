/**
 * ADHDコンパス - Service Worker
 * オフライン対応
 */
const CACHE_NAME = 'adhd-compass-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/storage.js',
  '/js/timer.js',
  '/js/bubble.js',
  '/js/focus.js',
  '/js/quest.js',
  '/js/stats.js',
  '/js/app.js',
  '/manifest.json'
];

// インストール時にアセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// キャッシュファースト戦略
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
