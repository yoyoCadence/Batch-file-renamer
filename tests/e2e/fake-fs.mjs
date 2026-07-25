// Shared in-memory fake of the File System Access API for e2e specs. The real API needs
// a native picker Playwright cannot drive, so we inject a fake directory handle via
// page.addInitScript and assert against window.__fakeDir.names().
//
// Pass a { name: contents } map as the addInitScript argument to control the folder's
// files; omit it for the default a.txt / b.txt pair. A real directory handle is also what
// makes rows executable, so specs that need genuine validation statuses (rather than the
// "preview only" limit) must load sources through this.
//
// This function is serialized and injected into the page, so it must be fully
// self-contained and reference nothing outside its own body.
export function installFakeFileSystem(initialFiles) {
  const makeFakeDir = (name, initial) => {
    const files = new Map(Object.entries(initial));
    const makeFileHandle = (fileName) => ({
      kind: "file",
      name: fileName,
      async getFile() {
        return new File([files.get(fileName) ?? ""], fileName, { type: "text/plain" });
      },
      async createWritable() {
        let buffer = "";
        return {
          async write(data) {
            buffer = typeof data === "string" ? data : await data.text();
          },
          async close() {
            files.set(fileName, buffer);
          }
        };
      }
    });
    return {
      kind: "directory",
      name,
      async queryPermission() {
        return "granted";
      },
      async requestPermission() {
        return "granted";
      },
      async *entries() {
        for (const key of [...files.keys()]) {
          yield [key, makeFileHandle(key)];
        }
      },
      async getFileHandle(fileName, options = {}) {
        if (!files.has(fileName)) {
          if (options.create) {
            files.set(fileName, "");
          } else {
            const error = new Error("Not found");
            error.name = "NotFoundError";
            throw error;
          }
        }
        return makeFileHandle(fileName);
      },
      async removeEntry(fileName) {
        files.delete(fileName);
      },
      names() {
        return [...files.keys()].sort();
      }
    };
  };

  window.showDirectoryPicker = async () => {
    window.__fakeDir = makeFakeDir("MockFolder", initialFiles || { "a.txt": "AAA", "b.txt": "BBB" });
    return window.__fakeDir;
  };
  // The app only feature-detects this; it is not exercised by these tests.
  window.showOpenFilePicker = async () => {
    throw new Error("showOpenFilePicker is not used in these tests");
  };
}
