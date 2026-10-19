import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

test("SW activation deletes only older caches in this exact application scope", async () => {
  const handlers = {};
  const deleted = [];
  let activation;
  const namespace = "batch-file-renamer:%2Fproject%2F:";
  const keys = ["unrelated-pwa-v1", "batch-file-renamer-v7", "batch-file-renamer:%2Fother%2F:batch-file-renamer-v7", `${namespace}batch-file-renamer-v7`, `${namespace}batch-file-renamer-v9`];
  const context = {
    URL,
    self: { registration: { scope: "https://example.com/project/" }, clients: { claim() {} }, addEventListener(name, handler) { handlers[name] = handler; } },
    caches: { async keys() { return keys; }, async delete(key) { deleted.push(key); } }
  };
  vm.runInNewContext(await readFile("pwa/service-worker.js", "utf8"), context);
  handlers.activate({ waitUntil(promise) { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, [`${namespace}batch-file-renamer-v7`]);
});
