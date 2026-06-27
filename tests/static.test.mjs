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
  assert.match(index, /id="petMotionSelect"/);
  assert.match(index, /id="petCompanion"/);
  assert.match(index, /id="petImage"/);
  assert.match(index, /id="updateBanner"/);
  assert.match(index, /id="updateNowButton"/);
  assert.match(index, /class="[^"]*\bguide-panel\b[^"]*"/);
  assert.match(index, /id="executionSummary"/);
  assert.match(index, /class="[^"]*\bstatus-legend\b[^"]*"/);
  assert.match(index, /data-i18n="settings.open"/);
  assert.doesNotMatch(index, /id="applySettingsButton"/);
  assert.match(index, /id="pickPreviewOutputFolderButton"/);
  assert.match(index, /id="clearCopySetupButton"/);
  assert.match(index, /id="showFullPathInput"/);
  assert.match(index, /data-i18n-title="tooltip.modeRename"/);

  const css = await readFile("pwa/assets/style.css", "utf8");
  assert.match(css, /body\[data-template="anime"\]/);
  assert.match(css, /body\[data-template="cyber"\]/);
  assert.match(css, /body\[data-template="sakura-paper"\]/);
  assert.match(css, /body\[data-template="holographic-glass"\]/);
  assert.match(css, /body\[data-theme="sakura"\]/);
  assert.match(css, /body\[data-theme="terminal"\]/);
  assert.match(css, /body\[data-theme="lamp"\]/);
  assert.match(css, /backgrounds\/material\.jpg/);
  assert.match(css, /\.flow-button/);
  assert.match(css, /\.danger-button/);
  assert.match(css, /\.preview-options/);
  assert.match(css, /\.update-banner/);
  assert.match(css, /\.pet-image/);
  assert.match(css, /--pet-facing/);
  assert.doesNotMatch(css, /\.pet-bubble[^{]*\{[^}]*scaleX/s);
  assert.match(css, /\.pet-bubble::after/);
  assert.match(css, /\[data-action="panic-held"\]/);
  assert.match(css, /@keyframes pet-hop/);
  assert.match(css, /@keyframes pet-cheer/);
  assert.match(css, /@keyframes pet-stretch/);
  assert.match(css, /@keyframes pet-spin/);
  assert.match(css, /@keyframes portal-ring/);
  assert.match(css, /@keyframes copter-spin/);
  assert.match(css, /@keyframes rope-sway/);
  assert.match(css, /\[data-travel="portal"\]/);
  assert.match(css, /\.pet-companion\[data-pet="folderling"\]/);
  assert.match(css, /\.pet-companion\[data-pet="pixelplant"\]/);
  assert.match(css, /@keyframes pet-held/);
  assert.match(css, /\.workflow-steps/);
  assert.match(css, /\.safety-strip/);

  const app = await readFile("pwa/assets/app.js", "utf8");
  assert.match(app, /startPetDrag/);
  assert.match(app, /movePetDrag/);
  assert.match(app, /classList\.add\("is-held"\)/);
  assert.match(app, /PET_RANDOM_ACTIONS/);
  assert.match(app, /panic-held/);
  assert.match(app, /scheduleNextPetAction/);
  assert.match(app, /isIgnorableSystemFile/);
  assert.match(app, /showFullPath/);
  assert.match(app, /showPetDialogue/);
  assert.match(app, /updateSmartPetMotion/);
  assert.match(app, /pickSmartTransition/);
  assert.match(app, /petSurfaces/);
  assert.match(app, /canUseSmartTravel/);
  assert.match(app, /spriteFacingScale/);
  assert.match(app, /portal-file-mender/);
  assert.match(app, /petSurfaces\(allowPanels = canUseSmartTravel\(\)\)/);
  assert.match(app, /state\.settings\.petType === "portal-file-mender"/);
  assert.doesNotMatch(app, /petCompanion\.style\.transform = `translate\(\$\\{state\.pet\.x}px, \$\\{state\.pet\.y}px\) scaleX/);
  assert.match(app, /registerServiceWorker/);
  assert.match(app, /showUpdateAvailable/);
  assert.match(app, /SKIP_WAITING/);
});

test("generated background assets exist and are non-empty", async () => {
  const backgrounds = [
    "material",
    "anime",
    "sakura-paper",
    "cyber",
    "glass-office",
    "blueprint",
    "watercolor",
    "retro-terminal",
    "wood-desk",
    "marble",
    "aurora",
    "rainy-window",
    "synthwave",
    "forest-study",
    "galaxy-archive",
    "linen-notebook",
    "industrial-metal",
    "pastel-cloud",
    "monochrome-ink",
    "holographic-glass",
    "night-lamp"
  ];
  for (const name of backgrounds) {
    const path = `pwa/assets/backgrounds/${name}.jpg`;
    const info = await stat(path);
    assert.ok(info.size > 200_000, `${path} should be a high-detail raster asset`);
  }
});

test("generated pet action assets exist and are transparent pngs", async () => {
  const pets = ["folderling-deluxe", "staplebot-deluxe", "papersprite-deluxe", "archivecube-deluxe", "pixelplant-deluxe", "portal-file-mender"];
  const actions = ["idle", "hop", "cheer", "stretch", "spin", "panic-held"];
  for (const pet of pets) {
    for (const action of actions) {
      const path = `pwa/assets/pets/${pet}-${action}.png`;
      const info = await stat(path);
      assert.ok(info.size > 18_000, `${path} should be a generated raster sprite`);
    }
  }
  for (const action of ["walk", "portal", "copter", "rope"]) {
    const path = `pwa/assets/pets/portal-file-mender-${action}.png`;
    const info = await stat(path);
    assert.ok(info.size > 18_000, `${path} should be a generated smart-movement sprite`);
  }
});

test("service worker caches all project-bound runtime assets", async () => {
  const worker = await readFile("pwa/service-worker.js", "utf8");
  assert.match(worker, /batch-file-renamer-v6/);
  assert.match(worker, /SKIP_WAITING/);
  for (const asset of [
    "./assets/settings.js",
    "./assets/backgrounds/material.jpg",
    "./assets/backgrounds/anime.jpg",
    "./assets/backgrounds/sakura-paper.jpg",
    "./assets/backgrounds/cyber.jpg",
    "./assets/backgrounds/holographic-glass.jpg",
    "./assets/backgrounds/night-lamp.jpg",
    "./assets/pets/portal-file-mender-portal.png",
    "./assets/pets/portal-file-mender-copter.png",
    "./assets/pets/portal-file-mender-rope.png",
    "./assets/pets/folderling-deluxe-panic-held.png",
    "./assets/pets/pixelplant-deluxe-spin.png"
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
