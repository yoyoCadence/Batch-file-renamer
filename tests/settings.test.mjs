import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  MAX_PRESETS,
  PET_DIALOGUES,
  PET_MOTION_MODES,
  PETS,
  TEMPLATES,
  THEMES,
  TRANSLATIONS,
  loadRulePresets,
  loadSession,
  loadSettings,
  normalizeSettings,
  saveRulePresets,
  saveSession,
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

// T035: rule presets and the last-used session persist separately from appearance settings.
function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value)
  };
}

test("rule presets round trip and reject malformed entries", () => {
  const storage = fakeStorage();
  saveRulePresets([
    { id: "a", name: "Photos", rules: [{ target: "Case" }] },
    { id: "b", name: "  ", rules: [] },
    { name: "NoId", rules: [] },
    null
  ], storage);

  const loaded = loadRulePresets(storage);
  assert.equal(loaded.length, 2, "entries without a usable name are dropped");
  assert.deepEqual(loaded[0], { id: "a", name: "Photos", rules: [{ target: "Case" }] });
  assert.equal(loaded[1].name, "NoId");
  assert.ok(loaded[1].id, "a missing id is filled in so the UI has a stable key");
});

test("corrupt preset storage degrades to an empty list", () => {
  assert.deepEqual(loadRulePresets(fakeStorage({ "batch-file-renamer.presets": "{not json" })), []);
  assert.deepEqual(loadRulePresets(fakeStorage({ "batch-file-renamer.presets": '"a string"' })), []);
  assert.deepEqual(loadRulePresets(null), [], "a missing storage backend is not an error");
});

test("presets are capped so storage cannot grow without bound", () => {
  const storage = fakeStorage();
  const many = Array.from({ length: MAX_PRESETS + 10 }, (_, index) => ({ id: `p${index}`, name: `P${index}`, rules: [] }));
  assert.equal(saveRulePresets(many, storage).length, MAX_PRESETS);
  assert.equal(loadRulePresets(storage).length, MAX_PRESETS);
});

test("the last-used session round trips and falls back safely", () => {
  const storage = fakeStorage();
  saveSession({ rules: [{ target: "Case" }], valueListText: "a\nb", mode: "copy" }, storage);
  assert.deepEqual(loadSession(storage), { rules: [{ target: "Case" }], valueListText: "a\nb", mode: "copy" });

  assert.deepEqual(loadSession(fakeStorage()), { rules: [], valueListText: "", mode: "rename" });
  assert.deepEqual(
    loadSession(fakeStorage({ "batch-file-renamer.session": "{bad" })),
    { rules: [], valueListText: "", mode: "rename" }
  );
  // An unknown mode must not leave the app in a state the UI cannot represent.
  saveSession({ rules: [], valueListText: "", mode: "sideways" }, storage);
  assert.equal(loadSession(storage).mode, "rename");
});

test("saving is best-effort and never throws when storage rejects writes", () => {
  const blocked = {
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); }
  };
  assert.doesNotThrow(() => saveRulePresets([{ id: "a", name: "A", rules: [] }], blocked));
  assert.doesNotThrow(() => saveSession({ rules: [], valueListText: "", mode: "rename" }, blocked));
});

test("presets and session use their own storage keys", () => {
  const storage = fakeStorage();
  saveSettings({ language: "ja" }, storage);
  saveRulePresets([{ id: "a", name: "A", rules: [] }], storage);
  saveSession({ rules: [{ target: "Case" }], valueListText: "", mode: "rename" }, storage);
  // Clearing one must not disturb the others.
  saveRulePresets([], storage);
  assert.equal(loadSettings(storage).language, "ja");
  assert.equal(loadSession(storage).rules.length, 1);
});
