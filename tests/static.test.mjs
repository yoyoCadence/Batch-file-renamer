import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const textFiles = [
  "pwa/index.html",
  "pwa/assets/app.js",
  "pwa/assets/rules.js",
  "pwa/assets/settings.js",
  "pwa/assets/style.css",
  "pwa/service-worker.js",
  "pwa/manifest.webmanifest"
];

test("PWA files contain the expected settings and appearance hooks", async () => {
  const index = await readFile("pwa/index.html", "utf8");
  assert.match(index, /id="settingsPanel"/);
  assert.match(index, /id="languageSelect"/);
  assert.match(index, /id="templateSelect"/);
  assert.match(index, /id="themeSelect"/);
  assert.match(index, /id="petEnabledInput"/);
  assert.match(index, /id="petTypeSelect"/);
  assert.match(index, /id="petCompanion"/);
  assert.match(index, /class="[^"]*\bguide-panel\b[^"]*"/);
  assert.match(index, /id="executionSummary"/);
  assert.match(index, /class="[^"]*\bstatus-legend\b[^"]*"/);
  assert.match(index, /data-i18n="settings.open"/);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /body\[data-template="anime"\]/);
  assert.match(css, /body\[data-template="cyber"\]/);
  assert.match(css, /body\[data-theme="sakura"\]/);
  assert.match(css, /backgrounds\/material\.jpg/);
  assert.match(css, /\.pet-companion\[data-pet="folderling"\]/);
  assert.match(css, /\.pet-companion\[data-pet="pixelplant"\]/);
  assert.match(css, /@keyframes pet-held/);
  assert.match(css, /\.workflow-steps/);
  assert.match(css, /\.safety-strip/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /startPetDrag/);
  assert.match(app, /movePetDrag/);
  assert.match(app, /classList\.add\("is-held"\)/);
});

test("generated background assets exist and are non-empty", async () => {
  for (const path of [
    "pwa/assets/backgrounds/material.jpg",
    "pwa/assets/backgrounds/anime.jpg",
    "pwa/assets/backgrounds/cyber.jpg"
  ]) {
    const info = await stat(path);
    assert.ok(info.size > 100_000, `${path} should be a real raster asset`);
  }
});

test("service worker caches all project-bound runtime assets", async () => {
  const worker = await readFile("pwa/service-worker.js", "utf8");
  for (const asset of [
    "./assets/settings.js",
    "./assets/backgrounds/material.jpg",
    "./assets/backgrounds/anime.jpg",
    "./assets/backgrounds/cyber.jpg"
  ]) {
    assert.match(worker, new RegExp(asset.replace(/[./]/g, "\\$&")));
  }
});

test("text files do not contain unresolved merge markers", async () => {
  for (const path of textFiles) {
    const text = await readFile(path, "utf8");
    assert.doesNotMatch(text, /<<<<<<<|=======|>>>>>>>/);
  }
});
