/* Service Worker เวอร์ชันเบื้องต้น — เพียงพอสำหรับให้เว็บ "ติดตั้งได้" (installable)
   ตามเกณฑ์ของเบราว์เซอร์ + แคชหน้า shell หลักไว้ใช้งานพื้นฐานตอนออฟไลน์/เน็ตขาด
   ไม่ใช่ระบบออฟไลน์แบบเต็มรูปแบบ (ไม่แคช backend/ข้อมูลถัง/รายงาน) */

const CACHE_NAME = 'bangphra-shell-v1';
const APP_SHELL = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

/* กลยุทธ์: network-first — พยายามโหลดจากเน็ตก่อนเสมอ (ข้อมูลจะได้ล่าสุด)
   ถ้าเน็ตล่ม/ขาด ค่อย fallback ไปใช้ของที่แคชไว้ */
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        return response;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});
