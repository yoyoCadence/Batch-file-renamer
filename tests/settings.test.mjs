import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
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
    petType: "unknown"
  }), DEFAULT_SETTINGS);
});

test("defaults use anime desk and sakura soft", () => {
  assert.equal(DEFAULT_SETTINGS.template, "anime");
  assert.equal(DEFAULT_SETTINGS.theme, "sakura");
  assert.equal(DEFAULT_SETTINGS.petType, "folderling-deluxe");
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
    petType: "archivecube-deluxe"
  }, storage);
  assert.deepEqual(saved, {
    language: "ja",
    template: "cyber",
    theme: "midnight",
    petEnabled: true,
    petType: "archivecube-deluxe"
  });
  assert.equal(JSON.parse(store.get("batch-file-renamer.settings")).language, "ja");
});

test("templates and themes expose selectable ids", () => {
  assert.deepEqual(TEMPLATES.map((item) => item.id), ["material", "anime", "cyber"]);
  assert.deepEqual(THEMES.map((item) => item.id), ["sage", "midnight", "sakura", "cyber"]);
});

test("pet companion exposes at least five selectable non-default ids", () => {
  assert.ok(PETS.length >= 10);
  assert.deepEqual(PETS.slice(0, 5).map((item) => item.id), [
    "folderling-deluxe",
    "staplebot-deluxe",
    "papersprite-deluxe",
    "archivecube-deluxe",
    "pixelplant-deluxe"
  ]);
  assert.deepEqual(PETS.slice(5).map((item) => item.id), [
    "folderling",
    "staplebot",
    "papersprite",
    "archivecube",
    "pixelplant"
  ]);
  assert.ok(PETS.slice(0, 5).every((item) => item.spriteBase));
  assert.ok(PETS.slice(5).every((item) => item.groupKey === "pet.group.simple"));
});
