const CACHE_NAME = "batch-file-renamer-v6";
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
  "./assets/backgrounds/sakura-paper.jpg",
  "./assets/backgrounds/cyber.jpg",
  "./assets/backgrounds/glass-office.jpg",
  "./assets/backgrounds/blueprint.jpg",
  "./assets/backgrounds/watercolor.jpg",
  "./assets/backgrounds/retro-terminal.jpg",
  "./assets/backgrounds/wood-desk.jpg",
  "./assets/backgrounds/marble.jpg",
  "./assets/backgrounds/aurora.jpg",
  "./assets/backgrounds/rainy-window.jpg",
  "./assets/backgrounds/synthwave.jpg",
  "./assets/backgrounds/forest-study.jpg",
  "./assets/backgrounds/galaxy-archive.jpg",
  "./assets/backgrounds/linen-notebook.jpg",
  "./assets/backgrounds/industrial-metal.jpg",
  "./assets/backgrounds/pastel-cloud.jpg",
  "./assets/backgrounds/monochrome-ink.jpg",
  "./assets/backgrounds/holographic-glass.jpg",
  "./assets/backgrounds/night-lamp.jpg",
  "./assets/pets/portal-file-mender-idle.png",
  "./assets/pets/portal-file-mender-walk.png",
  "./assets/pets/portal-file-mender-portal.png",
  "./assets/pets/portal-file-mender-copter.png",
  "./assets/pets/portal-file-mender-rope.png",
  "./assets/pets/portal-file-mender-panic-held.png",
  "./assets/pets/portal-file-mender-hop.png",
  "./assets/pets/portal-file-mender-cheer.png",
  "./assets/pets/portal-file-mender-stretch.png",
  "./assets/pets/portal-file-mender-spin.png",
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
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
