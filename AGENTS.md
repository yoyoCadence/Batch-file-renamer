# AGENTS.md

This file is the shared collaboration contract for Codex, Claude Code, and human contributors.

---

## 0. Project Context

> At project creation, the agent should fill or update this section from the user's initial project description.
> If key details are missing, ask concise follow-up questions before implementation.

- **Project name:** Batch File Renamer PWA
- **Project goal:** Rebuild the existing PowerShell Windows Forms batch file renamer as a cleaner PWA while preserving the core workflow: select files or a template file, build rename/copy rules, preview and edit target names/folders, validate rows, execute only OK rows, and support CSV import/export.
- **Target users:** Windows users who need safer local batch renaming or template-based batch copying, especially users who want a preview-first workflow before touching files.
- **Tech stack:** Existing source is a PowerShell Windows Forms app packaged in `batch_file_renamer_v4.zip`. Target stack is PWA, exact framework not chosen yet. Prefer a browser-first HTML/CSS/JavaScript or TypeScript implementation after the legacy behavior and file-access constraints are confirmed.
- **High-risk areas** (auth / DB schema / payments / deployment / etc.): Local filesystem access and browser compatibility, destructive rename/copy execution, target filename validation and collision detection, preserving legacy rule behavior, CSV import/export compatibility, PWA cache/update behavior, and the current folder not being a Git repository.
- **Architecture constraints:** Stay in Planning / Architecture mode until implementation is explicitly approved. First audit the legacy PowerShell app. Keep rename/copy rule logic separate from UI and covered by tests. Require preview and validation before execution. Avoid backend services, credentials, or secrets unless a later requirement clearly needs them.
- **Verification commands:** To be defined after stack selection. Expected baseline should include unit tests for the rule engine plus a PWA build/check command and browser flow verification.

---

## 0.1 Current Technical State

> Fill only after the project has stable facts worth preserving.

- **Main entry points:** `pwa/index.html` loads the app shell, `pwa/assets/app.js` owns browser state and UI wiring, `pwa/assets/rules.js` owns pure rename/copy rule logic, and `pwa/service-worker.js` caches the static app shell.
- **Storage / data model:** No backend or persistent database. Runtime state is in browser memory: source/template file references, output/source directory handles, rules, selected preview rows, and CSV-imported rows. CSV export/import is the handoff format.
- **Test coverage:** `tests/rules.test.mjs` covers core rule behavior, duplicate/invalid validation, row-level rule errors, and CSV round trip. Run with `npm run test`; `npm run build` currently aliases the same static verification.
- **Deployment / cache notes:** Static PWA under `pwa/`. Serve from localhost or HTTPS for service worker and File System Access API support. Cache name is `batch-file-renamer-v1`; bump it when cached shell files need forced refresh.

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
