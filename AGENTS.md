# AGENTS.md

This file is the shared collaboration contract for Codex, Claude Code, and human contributors.

---

## 0. Project Context

> At project creation, the agent should fill or update this section from the user's initial project description.
> If key details are missing, ask concise follow-up questions before implementation.

- **Project name:** Batch File Renamer PWA
- **Project goal:** Rebuild the existing PowerShell Windows Forms batch file renamer as a cleaner PWA while preserving the core workflow: select files or a template file, build rename/copy rules, preview and edit target names/folders, validate rows, execute only OK rows, and support CSV import/export.
- **Target users:** Windows users who need safer local batch renaming or template-based batch copying, especially users who want a preview-first workflow before touching files.
- **Tech stack:** Static PWA using HTML/CSS and native JavaScript ESM under `pwa/`; Node test runner and Playwright Chromium. The legacy PowerShell Windows Forms app is retained as a reference.
- **High-risk areas** (auth / DB schema / payments / deployment / etc.): Local filesystem access and browser compatibility, destructive rename/copy execution, target filename validation and collisions, CSV binding, recovery journals and PWA updates. The project is tracked in Git with GitHub PR and Pages workflows.
- **Architecture constraints:** Stay in Planning / Architecture mode until implementation is explicitly approved. First audit the legacy PowerShell app. Keep rename/copy rule logic separate from UI and covered by tests. Require preview and validation before execution. Avoid backend services, credentials, or secrets unless a later requirement clearly needs them.
- **Verification commands:** `npm test`, `npm run test:e2e` (install Chromium first), and `npm run build` (an alias for Node tests, not a bundler). PR and Pages CI both require Node and Chromium tests.

---

## 0.1 Current Technical State

> Fill only after the project has stable facts worth preserving.

- **Current handoff:** Start with `docs/review-handoff.md` and `tasks.md`. Phase 0/1 and Phase 2 merged as PR #20/#21; product baseline is `3e16d25`. Two P2 review findings arrived after #21 merged and remain open as T053/T054; green CI did not cover those cases. Phase 3/4 have not started. The original review attachment is archived in `docs/Batch_File_Renamer_Review_Plan_V1.0.0.md` as historical requirements/evidence, not current status or independent authorization. Work stopped at the user's request; resume implementation only when requested.
- **Main entry points:** `pwa/index.html` loads the shell; `app.js` owns browser state/UI; `rules.js` owns type-specific rule schemas and the shared trace engine; `preview-state.js` owns overrides/binding; `status.js` owns stable status codes; `filesystem.js` owns handle identity/IO checks; `execution.js` owns immutable plans, journals and recovery. Paths are under `pwa/assets/`. Strict preview is the default; browser copy/delete requires a session-only controlled-folder opt-in. See `docs/review-phase-0-1.md` for the unavoidable external race window and native-browser verification limits.
- **Storage / data model:** No backend or database. Sources, handles, preview overrides, exclusions and recovery journals are in memory and lost on reload. This implementation does not persist handles; serializable handles could use IndexedDB in future, with permission revalidation. Three `localStorage` keys survive when storage is available: `batch-file-renamer.settings` (appearance/language), `.presets` (named rule sets), and `.session` (rules/value list/mode). `storage.js` catches getter/read/write failures; the app continues in memory and warns when persistence fails. Untrusted persisted input goes through `normalizeRules` / `normalizeSettings`. `csv.js` strictly parses bounded CSV; raw schema 2 plans round-trip exactly and require explicit column/source binding. Spreadsheet views cannot be reimported. JSON recovery reports contain no handles and cannot auto-execute. See `docs/review-phase-2.md` for the CSV contract and case-only block.
- **Test coverage:** Node suites include rules, preview state, executor/fault injection, real temporary-file adapter checks, scoped SW cache cleanup, settings/i18n and static wiring. Chromium covers whole-app interactions and fake FS integration, with one SW-enabled first-control test. Real temporary-file tests do not establish native picker or Windows sharing semantics. Playwright uses port 4187 by default, rejects unrelated existing servers, and retains failure traces/screenshots. `npm run build` aliases `npm test`.
- **Deployment / cache notes:** Static PWA under `pwa/`, served on localhost or HTTPS. **The cache-first handler requires bumping `CACHE_NAME` in `service-worker.js` whenever a cached shell file changes**, including new module imports. Currently `batch-file-renamer-v9`, asserted in static tests. Cache keys include application and scope; cleanup only touches that namespace. Legacy unscoped caches are retained. First claim never reloads; updates defer while files, previews or recovery records exist. Full SW update/offline matrix remains RV-18.

---

## 1. Execution Modes

Agents must operate in one of two modes:

### Mode A: Planning / Architecture
- Analyze the request
- Propose structure and changes
- Outline risks and next steps
- **DO NOT modify files yet**

### Mode B: Implementation
- Apply changes strictly based on the agreed plan
- Avoid introducing new design decisions mid-implementation

If the mode is unclear, default to **Mode A first**.

For clear low-risk tasks such as typo fixes, focused tests, or small documentation updates, agents may proceed in **Mode B** directly while still summarizing the change afterward.

---

## 2. Scope Control Rules

Agents must strictly limit changes to the requested scope.

Do NOT:
- Refactor unrelated files "while you are here"
- Rename or restructure directories outside the task scope
- Modify styling, formatting, or naming conventions globally without instruction

If an improvement is detected outside scope:
- Propose it instead of implementing it

---

## 3. Prohibited Behaviors

Do not:
- Silently replace or rewrite major files without instruction
- Mix a feature task with broad unrelated cleanup
- Sneak in schema, auth, or deployment edits under an unrelated feature PR
- Turn the repo into multiple conflicting architectural styles

---

## 4. Change Requirements

Every substantial change must make these clear:
- What changed
- Why this change was made
- What risks remain
- What the next recommended step is

The goal is handoff clarity, not just code delivery.

---

## 5. Canonical Baseline & Editing Rules

All changes must treat the current repository content as the canonical baseline.

- Preserve existing language, structure, and major content unless explicitly instructed otherwise
- Prefer **additive edits** over rewrites
- Do NOT replace entire files unless explicitly requested
- Do NOT reorganize large sections without clear instruction

---

## 6. Handoff Friendliness

Code and documentation should be written so another agent or human can continue without relying on private memory or one-off chat context.

- Write module responsibilities clearly
- Keep comments focused and actionable
- Make placeholders explicit
- Prefer obvious extension points over clever shortcuts

---

## 7. Branch / PR Hygiene

At the start of every task:
- Check current branch and worktree status first
- If starting from product baseline, switch to `main`, fetch, and fast-forward from `origin/main` before creating a new branch
- If already on a feature branch, confirm it is the intended branch for this task

Before opening or updating a PR:
- Fetch and fast-forward local `main` from `origin/main`
- Branch from current `main`, not from an older local checkout
- Before pushing, check the branch against `origin/main` again — if `main` moved, rebase first
- Do not re-submit duplicate generated assets or older runtime code under the same filenames

---

## 8. Task Lifecycle

Tasks must move through the following states:

**Backlog → Next → In Progress → Done**

Use `tasks.md` as the default lightweight task board unless the project explicitly uses GitHub Issues, Linear, Notion, or another tracker.

Rules:
- Do not start a task that is not in Next or In Progress
- Move task to In Progress before implementation
- Move to Done only when completed
- Do not silently skip or reorder tasks
- For tiny fixes or direct user requests, agents may complete the work first, then add or update the task record afterward

---

## 9. Task Granularity Rule

Tasks must be:
- Small enough to complete in one session
- Clear enough that no interpretation is needed
- Independent enough to not require large refactors

Avoid vague tasks like "implement system", "build feature", or "add 3D".

---

## 10. Security Baseline

### Environment variables
- Never print secret values to the terminal — only check existence:
  ```bash
  [ -n "$API_KEY" ] && echo "API_KEY is set" || echo "API_KEY is missing"
  ```
- Never use `echo $SECRET`, `printenv KEY`, or any command that outputs a value
- Never hardcode secrets in source files
- Never commit `.env` files (use `.env.example` as template)

### General
- Never use `service_role`, admin, server-only, or equivalent privileged keys on the client side
- Database, storage, and API access policies must be explicit — do not rely on default-open behavior
