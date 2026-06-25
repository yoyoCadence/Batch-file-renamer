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
    petType: "archivecube"
  }, storage);
  assert.deepEqual(saved, {
    language: "ja",
    template: "cyber",
    theme: "midnight",
    petEnabled: true,
    petType: "archivecube"
  });
  assert.equal(JSON.parse(store.get("batch-file-renamer.settings")).language, "ja");
});

test("templates and themes expose selectable ids", () => {
  assert.deepEqual(TEMPLATES.map((item) => item.id), ["material", "anime", "cyber"]);
  assert.deepEqual(THEMES.map((item) => item.id), ["sage", "midnight", "sakura", "cyber"]);
});

test("pet companion exposes at least five selectable non-default ids", () => {
  assert.ok(PETS.length >= 5);
  assert.deepEqual(PETS.map((item) => item.id), [
    "folderling",
    "staplebot",
    "papersprite",
    "archivecube",
    "pixelplant"
  ]);
});
