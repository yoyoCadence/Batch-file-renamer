const CACHE_NAME = "batch-file-renamer-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/style.css",
  "./assets/app.js",
  "./assets/rules.js",
  "./assets/settings.js",
  "./assets/icon.svg",
  "./assets/backgrounds/material.jpg",
  "./assets/backgrounds/anime.jpg",
  "./assets/backgrounds/cyber.jpg",
  "./assets/pets/folderling-deluxe-idle.png",
  "./assets/pets/folderling-deluxe-hop.png",
  "./assets/pets/folderling-deluxe-cheer.png",
  "./assets/pets/folderling-deluxe-stretch.png",
  "./assets/pets/folderling-deluxe-spin.png",
  "./assets/pets/folderling-deluxe-panic-held.png",
  "./assets/pets/staplebot-deluxe-idle.png",
  "./assets/pets/staplebot-deluxe-hop.png",
  "./assets/pets/staplebot-deluxe-cheer.png",
  "./assets/pets/staplebot-deluxe-stretch.png",
  "./assets/pets/staplebot-deluxe-spin.png",
  "./assets/pets/staplebot-deluxe-panic-held.png",
  "./assets/pets/papersprite-deluxe-idle.png",
  "./assets/pets/papersprite-deluxe-hop.png",
  "./assets/pets/papersprite-deluxe-cheer.png",
  "./assets/pets/papersprite-deluxe-stretch.png",
  "./assets/pets/papersprite-deluxe-spin.png",
  "./assets/pets/papersprite-deluxe-panic-held.png",
  "./assets/pets/archivecube-deluxe-idle.png",
  "./assets/pets/archivecube-deluxe-hop.png",
  "./assets/pets/archivecube-deluxe-cheer.png",
  "./assets/pets/archivecube-deluxe-stretch.png",
  "./assets/pets/archivecube-deluxe-spin.png",
  "./assets/pets/archivecube-deluxe-panic-held.png",
  "./assets/pets/pixelplant-deluxe-idle.png",
  "./assets/pets/pixelplant-deluxe-hop.png",
  "./assets/pets/pixelplant-deluxe-cheer.png",
  "./assets/pets/pixelplant-deluxe-stretch.png",
  "./assets/pets/pixelplant-deluxe-spin.png",
  "./assets/pets/pixelplant-deluxe-panic-held.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
