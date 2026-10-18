// Serialized by addInitScript: keep self-contained. Shared by Node and browser tests.
export function installFakeFileSystem(input) {
  const config = input?.files ? input : { files: input || { 'a.txt': 'AAA', 'b.txt': 'BBB' } };
  let nextId = 0;
  const makeDir = (name, initial = {}) => {
    const entries = new Map();
    const failures = [];
    const history = [];
    const dirId = ++nextId;
    let permission = 'granted';
    let pause = null;
    const key = (value) => config.caseInsensitive ? value.toLowerCase() : value;
    const error = (name) => new DOMException(name, name);
    const step = async (stage, fileName = '') => {
      history.push({ stage, name: fileName });
      if (pause?.stage === stage && (!pause.name || pause.name === fileName)) {
        pause.reached = true;
        await pause.promise;
      }
      const index = failures.findIndex((item) => item.stage === stage && (!item.name || item.name === fileName));
      if (index >= 0) throw error(failures.splice(index, 1)[0].error);
    };
    const put = (fileName, data) => {
      entries.set(key(fileName), { id: ++nextId, name: fileName, data, modified: nextId });
    };
    for (const [fileName, data] of Object.entries(initial)) put(fileName, data);
    const makeHandle = (entry) => {
      const check = () => {
        if (entries.get(key(entry.name)) !== entry) throw error('NotFoundError');
      };
      return {
        kind: 'file', name: entry.name, __entryId: entry.id, __dirId: dirId,
        async isSameEntry(other) { return other?.__dirId === dirId && other?.__entryId === entry.id; },
        async getFile() {
          await step('read', entry.name);
          check();
          return new File([entry.data], entry.name, { lastModified: entry.modified });
        },
        async createWritable() {
          await step('open', entry.name);
          check();
          let buffer = new Uint8Array();
          return {
            async write(data) {
              await step('write', entry.name);
              buffer = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(await data.arrayBuffer());
            },
            async close() {
              await step('close', entry.name);
              check();
              entry.data = buffer;
              entry.modified = ++nextId;
            },
            async abort() { await step('abort', entry.name); }
          };
        }
      };
    };
    const dir = {
      kind: 'directory', name, __dirId: dirId,
      async isSameEntry(other) { return other?.__dirId === dirId; },
      async queryPermission() { await step('permission'); return permission; },
      async requestPermission() { await step('permission'); return permission; },
      async *entries() {
        for (const entry of [...entries.values()]) yield [entry.name, makeHandle(entry)];
      },
      async getFileHandle(fileName, options = {}) {
        await step(options.create ? 'create' : 'lookup', fileName);
        if (!entries.has(key(fileName))) {
          if (!options.create) throw error('NotFoundError');
          put(fileName, '');
        }
        return makeHandle(entries.get(key(fileName)));
      },
      async removeEntry(fileName) {
        await step('remove', fileName);
        if (!entries.delete(key(fileName))) throw error('NotFoundError');
      },
      names() { return [...entries.values()].map((entry) => entry.name).sort(); },
      async contents() {
        return Object.fromEntries(await Promise.all([...entries.values()].map(async (entry) => [entry.name, await new Blob([entry.data]).text()])));
      },
      edit(fileName, data) {
        const entry = entries.get(key(fileName));
        if (!entry) throw error('NotFoundError');
        entry.data = data;
        entry.modified = ++nextId;
      },
      put,
      failNext(stage, fileName = '', errorName = 'NotAllowedError') { failures.push({ stage, name: fileName, error: errorName }); },
      setPermission(value) { permission = value; },
      pauseAt(stage, fileName = '') {
        let resume;
        const promise = new Promise((resolve) => { resume = resolve; });
        pause = { stage, name: fileName, promise, resume, reached: false };
      },
      isPaused() { return Boolean(pause?.reached); },
      resume() { const old = pause; pause = null; old?.resume(); },
      history
    };
    return dir;
  };
  const root = makeDir('MockFolder', config.files);
  const output = makeDir('OutputFolder', config.output || {});
  const templateDir = makeDir('Templates', { 'template.txt': config.template || 'TEMPLATE' });
  const host = typeof window === 'undefined' ? {} : window;
  host.__fakeDir = root;
  host.__fakeOutput = output;
  host.__fakeTemplate = templateDir;
  host.showDirectoryPicker = async () => host.__nextDirectory || root;
  host.showOpenFilePicker = async () => [await templateDir.getFileHandle('template.txt')];
  return { root, output, templateDir };
}
