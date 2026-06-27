import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  PET_DIALOGUES,
  PET_MOTION_MODES,
  PETS,
  TEMPLATES,
  THEMES,
  TRANSLATIONS,
  normalizeSettings,
  saveSettings,
  t
} from "../pwa/assets/settings.js";

test("all supported languages have the same translation keys", () => {
  const baseKeys = Object.keys(TRANSLATIONS.en).sort();
  for (const language of LANGUAGES) {
    assert.deepEqual(Object.keys(TRANSLATIONS[language.id]).sort(), baseKeys, language.id);
  }
});

test("translations interpolate parameters and fall back safely", () => {
  assert.equal(t("en", "status.previewGenerated", { count: 3 }), "Preview generated: 3 row(s). Target names are editable.");
  assert.equal(t("zh-TW", "settings.language"), "語言");
  assert.equal(t("ja", "missing.key"), "missing.key");
});

test("settings normalize invalid ids back to defaults", () => {
  assert.deepEqual(normalizeSettings({
    language: "xx",
    template: "unknown",
    theme: "none",
    petEnabled: "yes",
    petType: "unknown",
    petMotion: "unknown"
  }), DEFAULT_SETTINGS);
});

test("defaults use anime desk and sakura soft", () => {
  assert.equal(DEFAULT_SETTINGS.template, "anime");
  assert.equal(DEFAULT_SETTINGS.theme, "sakura");
  assert.equal(DEFAULT_SETTINGS.petType, "portal-file-mender");
  assert.equal(DEFAULT_SETTINGS.petMotion, "smart");
});

test("settings persist only valid values", () => {
  const store = new Map();
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value)
  };
  const saved = saveSettings({
    language: "ja",
    template: "cyber",
    theme: "midnight",
    petEnabled: true,
    petType: "archivecube-deluxe",
    petMotion: "drift"
  }, storage);
  assert.deepEqual(saved, {
    language: "ja",
    template: "cyber",
    theme: "midnight",
    petEnabled: true,
    petType: "archivecube-deluxe",
    petMotion: "drift"
  });
  assert.equal(JSON.parse(store.get("batch-file-renamer.settings")).language, "ja");
});

test("templates and themes expose selectable ids", () => {
  assert.ok(TEMPLATES.length >= 20);
  assert.ok(THEMES.length >= 20);
  assert.ok(TEMPLATES.some((item) => item.id === "anime"));
  assert.ok(TEMPLATES.some((item) => item.id === "sakura-paper"));
  assert.ok(TEMPLATES.some((item) => item.id === "holographic-glass"));
  assert.ok(THEMES.some((item) => item.id === "sakura"));
  assert.ok(THEMES.some((item) => item.id === "terminal"));
  assert.ok(THEMES.some((item) => item.id === "lamp"));
  assert.deepEqual(PET_MOTION_MODES.map((item) => item.id), ["smart", "drift"]);
});

test("pet companion exposes at least five selectable non-default ids", () => {
  assert.ok(PETS.length >= 11);
  assert.equal(PETS[0].id, "portal-file-mender");
  assert.ok(PETS[0].smart);
  assert.deepEqual(PETS.slice(1, 6).map((item) => item.id), [
    "folderling-deluxe",
    "staplebot-deluxe",
    "papersprite-deluxe",
    "archivecube-deluxe",
    "pixelplant-deluxe"
  ]);
  assert.deepEqual(PETS.slice(6).map((item) => item.id), [
    "folderling",
    "staplebot",
    "papersprite",
    "archivecube",
    "pixelplant"
  ]);
  assert.ok(PETS.slice(0, 6).every((item) => item.spriteBase));
  assert.ok(PETS.slice(6).every((item) => item.groupKey === "pet.group.simple"));
});

test("every pet has at least fifteen non-question dialogue lines", () => {
  for (const pet of PETS) {
    const lines = PET_DIALOGUES[pet.id];
    assert.ok(lines, `${pet.id} should have dialogue lines`);
    assert.ok(lines.length >= 15, `${pet.id} should have at least 15 dialogue lines`);
    assert.ok(lines.every((line) => !/[?？]/.test(line)), `${pet.id} lines should not ask questions`);
  }
});
