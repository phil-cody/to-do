# Just To Do It: Project Rules and Handoff Between Chats

Updated: October 19, 2026. This file is the primary entry point for every new development chat.

## Purpose and Goal

Just To Do It is a web application for personal projects and tasks, with Markdown descriptions, list/grid/Kanban views, Telegram authentication, reminders, and Inbox capture. It supports local browser storage and a server mode with separate accounts, offline edits, and synchronization across devices and tabs.

The goal is a complete, consistent application that preserves user data, clearly explains pending operations and failures, and remains usable from 360 px to desktop widths. Preserve the established visual design and interaction rules. Shared projects, collaborative editing, an admin panel, and self-service account deletion are not implemented; do not describe them as available.

## Starting a New Chat

1. Read this file first: rules, current status, verification boundaries, and outstanding work.
2. Then read `.ua/knowledge-graph.json`, when available: start with `project`, `layers`, and `tour`, followed by nodes and relationships for the relevant module. Orientation does not require rereading the entire repository.
3. Check `git status --short`, the current HEAD, and `.ua/meta.json`, when present. Matching HEAD alone does not establish graph freshness or a clean working tree.
4. Read `docs/README.md` and the documents relevant to the task, then inspect the affected source files. The graph locates code; source files and checks establish actual behavior.
5. Briefly state the task and verification method. Continue authorized work without requesting approval again for routine reversible actions.

Source priority: current explicit user instructions; this file for working rules and handoff; the graph for architectural orientation; source code and checks for actual behavior. If information conflicts, establish the cause and correct the documentation. Do not describe planned work as implemented functionality.

Key references: `docs/architecture.md`, `docs/behavior.md`, `docs/data.md`, `docs/server.md`, `docs/security.md`, and `docs/development.md`. Use `docs/import.md` and `docs/templates/` for import formats, `docs/telegram.md` for bot behavior, and `docs/vps.md` for production deployment. `docs/vps-static.md` describes the separate static/local-storage deployment option.

## Current Status and Scope

- Implemented: React interface, Markdown editing and sanitized rendering, responsive navigation, project pinning and dashboard, import/export, list/grid/Kanban views, and task/project CRUD.
- Implemented server mode: Node.js with SQLite, Telegram confirmation-based sign-in, account isolation, daily reminders, bot messages to Inbox, a link to the website task form, and English/Russian interface and bot messages.
- Synchronization includes an IndexedDB queue per account, revision checks, operation IDs, field-level merging, explicit conflicts, SSE, polling, BroadcastChannel, and an offline application shell.
- Quick actions display immediately with pending feedback and rollback on an explicit write rejection. Forms preserve drafts until confirmation. Account operations share the pending-action guard. Check the current source and tests before changing these guarantees.
- At creation of this file, HEAD was `5ea1ce7` with commit title `v1.0.3`; `package.json` still declared `1.0.0`. Release identity is the exact Git SHA and the deployed `REVISION` file. Do not infer a package version or the running VPS revision from a commit title.
- The previous development-chat report on October 16 recorded 147 passing browser tests and 51 passing unit tests. These are historical results, not evidence that later changes or the current HEAD have been verified. This documentation task did not rerun application tests or inspect the VPS.
- No staged implementation plan or acceptance ledger is established for this project. Take the current task from the user's request; do not invent stage acceptance or start unrelated features automatically.

## Architecture and Module Boundaries

Stack: React 19, JavaScript ES modules, Webpack, `@uiw/react-md-editor`, and `rehype-sanitize`. Runtime: Node.js 24 with built-in SQLite. Tests: Node's test runner and Playwright. Prefer the existing stack and contracts over adding frameworks or dependencies.

```text
src/index.js                     browser entry point
src/app/App.jsx                  composition, workspace, account, and dialogs
src/app/components/              views, forms, Markdown, login, and sync controls
src/app/hooks/useWorkspace.js    commit, optimistic state, errors, and action guards
src/app/hooks/useKanbanDrag.js   pointer/keyboard movement and drop validation
src/app/model.js                 normalization, shared limits, dates, and sorting
src/app/workspace.js             pure snapshot mutations
src/app/selectors.js             derived dashboard data
src/app/description.js           compatibility for legacy descriptions
src/app/markdown.jsx             safe Markdown content policy
src/app/i18n.js                  language selection, translation, and subscriptions
src/app/i18n-messages.js         shared English/Russian interface and bot messages
src/app/import-project.js        import validation and append-only conversion
src/app/repository.js            local/server storage selection
src/app/sync/                    HTTP, IndexedDB, queue, merging, and subscriptions
src/app/styles/                  component styles and responsive rules
src/app/service-worker.js        registration of the offline shell
server/index.js                  configuration, startup, bot, and shutdown
server/app.js                    API, sessions, ownership, SSE, and static files
server/store.js                  SQLite transactions, sessions, and durable queues
server/validation.js             server-side snapshot and settings validation
server/telegram.js               sign-in, Inbox, commands, and daily delivery
scripts/                        dev/preview servers, builds, and release preparation
deploy/                         Nginx, systemd, deployment, backup, and restore
tests/                          unit, server, synchronization, and browser checks
docs/                           project knowledge base and operating instructions
```

UI components receive callbacks; do not put direct storage or HTTP writes into task/project cards. Route workspace mutations through `useWorkspace` and the repository contract. Keep pure transformations separate from React, networking, and persistence. Do not mutate props or save derived filtering, search, or layout measurements into snapshots.

## Data Preservation and Synchronization

- Local mode uses `localStorage` key `todo_app`. Server mode uses SQLite plus an IndexedDB cache and durable queue scoped to the authenticated Telegram account. Origin includes protocol, host, and port; changing it does not migrate browser data.
- Preserve schema and import compatibility. Current workspace `schemaVersion` is 2; the project-template format is `just-to-do-it/project`, version 1. Verify `docs/data.md` and actual validators before schema changes. Provide migration, backup, and rollback checks where needed.
- Preserve stable IDs and task ownership. Moving a task must leave exactly one copy in its destination project. Inbox and the last project are protected from deletion.
- Persist server edits locally before sending them. Preserve operation IDs, revision checks, and explicit field conflicts. A lost response can mean the write succeeded; retry through operation lookup and idempotency rather than creating a new operation blindly.
- Quick-action previews are temporary UI state, not proof of persistence. On explicit rejection, restore the confirmed snapshot and report the error. Forms and import previews remain open and retain user input when saving fails.
- Network failures and temporary server errors preserve queued edits for retry. HTTP response waits are bounded; do not apply short request timeouts to SSE connections. Do not clear a queue to make an error disappear.
- Block duplicate or incompatible actions while a write/account action is pending. Show visible, localized feedback inside the active dialog or drawer when applicable. Do not claim synchronization completed while a write or conflict remains unresolved.
- Never merge or send one account's cached data or pending edits into another account. Preserve the `X-Account-ID` checks, response ownership checks, session invalidation, and account-scoped storage.
- `selectedProjectId` is a device-local navigation choice in server mode. Navigating on one device must not navigate another or enqueue a server write. Other workspace data and account language continue to synchronize.
- Logout must not discard unsynchronized work. Expired/revoked sessions must preserve the original account's draft until that same account can authenticate again.
- Import is explicit and additive. Preview before saving, retain the original local data/file, generate new IDs for imported copies, merge Inbox tasks into Inbox, and validate all fields and limits. Never execute imported content.
- Do not use real tasks, browser profiles, SQLite files, or production accounts for tests. Use synthetic fixtures and separate temporary storage.

## Interface and Behavior Contracts

- The established design is the baseline. Keep spacing, typography, control sizes, icon centering, and focus indicators consistent. Do not redesign unrelated screens during a fix.
- Support widths from 360 px. Below 760 px, project navigation is a side drawer; its project list remains vertical. The mobile actions are vertical through 398 px and horizontal from 399 to 759 px. Date/time remain at the right of the header.
- Sidebar and main scroll independently. Dialogs block background scrolling; their own scrollbars and focus indicators stay inside rounded boundaries. Keep keyboard navigation and native dialog behavior accessible.
- Grid cards have a minimum width of 294 px where space allows. Below 399 px, use the single-column presentation and hide the redundant Grid selector. Desktop Kanban uses two columns, not four.
- Pinned projects form the first subgroup; newly pinned projects append to that subgroup. Unpinned projects form the second subgroup. Pin position and numeric project priority are distinct.
- Task ordering is group, due date, priority, then localized alphabetical title; creation time and ID resolve remaining ties. Groups are overdue, in process, pending, completed. Overdue is derived from the date, not a stored status.
- Kanban starts with empty columns collapsed and placed after populated columns. A column's entire header accepts a drop. A task in Overdue can move only to Completed. Do not change its due date implicitly. Cards do not repeat the column status as a selector.
- Mouse and touch movement must both work. Touch dragging uses Move so ordinary card scrolling remains available. Preserve cancellation, edge scrolling, keyboard support, and reliable release handling even when pointer capture is lost.
- Markdown descriptions render consistently in cards, project previews, and full details, including legacy content without resaving. Long descriptions show two lines and a quiet text toggle below the preview; no toggle appears without hidden text.
- Project navigation uses the card background. Text selection, links, and action buttons retain their own behavior and must not trigger navigation.
- The all-tasks page contains tasks; the project grid belongs in its separate dashboard. Full task details show styled Due and omit Created from the interface without deleting stored creation time.
- Keep English and Russian interface messages separate and complete. Use the shared dictionary, preserve placeholders, and never translate user-entered titles or descriptions. Language changes through account settings or the bot must remain compatible with synchronization and offline use.

For exact behavior and exceptions, read `docs/behavior.md`; update it when an intentional behavior change is implemented.

## Security, Telegram, and Production Boundaries

- Ownership comes from the authenticated server session, never a Telegram ID supplied in a workspace body. Registration is open to Telegram users, each with isolated data.
- Preserve browser-bound, expiring, one-time Telegram confirmation; HttpOnly/SameSite cookies; Secure/host-prefix behavior under HTTPS; parameterized SQL; Host/Origin checks; content-type checks; limits; and production CSP.
- Sanitize Markdown in every rendering path. Do not enable raw scripts, unsafe links, or automatic external image/tracker requests. External links retain their safe `rel` behavior.
- Service workers cache only the public application shell. Do not cache API responses, credentials, sessions, or private task data in Cache Storage. Browser offline data is not encrypted by the application; do not claim otherwise.
- Exclude `.env`, tokens, cookies, private keys, SQLite/WAL files, backups, personal tasks, and sensitive logs from Git, build output, the graph, and diagnostics. Configuration examples must contain placeholders, not live credentials.
- One backend instance serves one SQLite database and one Telegram long-polling process. Do not start a local poller with the production token or introduce a second poller for the same bot.
- Tests use the isolated Telegram simulator. Do not contact the real bot, send messages, alter reminders, or write to the production VPS unless the user explicitly authorizes that action.
- Preserve the configured `APP_ORIGIN`, including a nonstandard HTTPS port. Do not assume port 443 is free on the VPS; other services share that server.
- Deployment uses exact pushed commits and verified release archives. Do not deploy a working-tree build, reuse an old `/tmp` archive, bypass clean-tree/revision checks, or replace a release without preserving backup and rollback behavior.
- The user normally commits, pushes, and deploys. Do not commit, push, upload, install, restart production services, or change infrastructure merely because implementation is finished. Follow explicit authorization for those actions.

## Verification and Releases

Use Node.js 24 (`.nvmrc`) and `npm ci` for the locked dependency tree. Do not reinstall dependencies while an existing dev server is running; restart it after installation if needed. Preserve the user's existing browser origin and localStorage.

```sh
npm run dev                 # localhost:4000; separate development output
npm run build               # production files in dist/
npm run preview             # existing dist/ on localhost:4002
npm run server              # backend on localhost:4001; requires configuration
npm test                    # Node unit/server tests
npm run test:e2e             # isolated Playwright servers and synthetic data
npm run format:check
git diff --check
```

- Documentation-only changes require accurate paths, coherent references, and a whitespace check. Do not rebuild or run application tests without a reason.
- Run focused proof for the affected behavior first. Broaden checks for storage, synchronization, authentication, shared state, or cross-screen changes; do not rerun passing checks repeatedly without a new concern.
- Playwright starts its own dev server on 4012, production preview on 4013, and fake backend/control server on 4010/4011. Server unit tests also use 4018. Do not point tests at the user's dev profile, real bot, or VPS.
- For server mutations, cover pending responses, success, explicit rejection, draft/rollback preservation, and duplicate prevention. For synchronization changes, also cover offline reload, retry, conflicts, lost responses, tabs/devices, expired sessions, and account isolation.
- For UI changes, verify relevant mobile/desktop boundaries, keyboard focus, scrolling, and long content. For dragging, verify mouse and touch separately; passing keyboard tests is not proof of pointer behavior.
- `npm run test:visual -- capture` and `compare` supplement browser checks. Use the same environment and a baseline from before the change. Do not replace a baseline just to hide a regression.
- Production builds may warn about Markdown bundle size. Distinguish warnings from failures and report real limitations. An environment permission error is not an application defect or a passing check.
- Test reports and screenshots in `test-results/`, `.cache/`, and generated `dist/` are not source files. Do not commit them or present old reports as fresh evidence.
- Dependency/security claims must include the actual scope and date. Historical audit results do not establish current dependency safety or VPS security.

When the user authorizes deployment after commit/push, use the documented sequence:

```sh
npm run release:prepare
npm run release:upload
npm run release:install
```

Preparation builds the exact clean HEAD matching current `origin/main` into `.cache/releases/SHA/`. Upload/install use the configured SSH alias, normally `todo-vps`. Verify `REVISION`, health, and service status; retain the previous release and database backup. Read `docs/vps.md` for first installation, secrets, HTTPS, backup, and rollback. A successful local build does not prove production deployment.

## Working and Communication Rules

The user prefers a clear, nontechnical interface and short explanations. Communicate in **Russian**, unless explicitly asked otherwise. The application supports Russian and English; user-facing project documentation is Russian. This file, the knowledge graph, and graph descriptions are English.

Use the **Caveman** plugin (`caveman@openai-curated-remote`) in every project chat. Read and apply `caveman:caveman` at the start of the chat, using default `full` mode unless the user selects another mode or disables it. Keep responses concise and in Russian; preserve technical meaning, exact identifiers, numbers, units, and error strings. Prefer clarity over compression, especially for safety warnings, confirmations, and ordered instructions.

Write persisted material, including code, comments, commits, documentation, and handoff files, in normal, complete prose or appropriate code syntax. Follow the language rules for the artifact and the surrounding code. Caveman controls communication style; Ponytail controls implementation choices. Neither replaces required verification or permits unsupported claims about cost savings. If Caveman is unavailable, report the limitation and use concise communication without claiming the plugin ran. Do not configure tracing, change models, or run cost-optimization experiments without an explicit user request.

Use the **Ponytail** plugin (`engineering-suite-ponytail@openai-curated-remote`) for every coding task, including implementation, fixes, refactoring, code review, technical design, and dependency selection. Start with `engineering-suite-ponytail:entry-ponytail` and follow its routing to the relevant bundled workflow. For implementation and design, use `engineering-suite-ponytail:ponytail` in default `full` mode unless the user chooses another mode. Read applicable skill instructions before applying them. Ponytail is not required for unrelated prose or translation tasks.

Apply Ponytail by understanding the affected flow first, then choosing the smallest correct change. Reuse existing code, the standard library, and native browser/Node.js capabilities before adding dependencies or abstractions. Do not remove validation, data preservation, account isolation, accessibility, or required checks to shorten a solution. These project requirements and explicit user instructions remain binding. If the plugin is unavailable, report that limitation and follow these principles without claiming the plugin ran.

Do not ask again about agreed actions. Ask only for genuinely missing decisions that affect scope, data, or external systems. Do not create a new chat or message other chats without an explicit user request; transfer context through this file and the knowledge base.

Avoid broad reading, full rebuilds, and extra checks without a reason. Start with the graph and targeted searches. Use subagents only with explicit user authorization or applicable skill instructions. Do not present Caveman style as measured savings: no tracing or optimization setup has been verified for this project.

## Knowledge Graph and Handoff

Expected graph files: `.ua/knowledge-graph.json`; metadata: `.ua/meta.json`; structural baseline: `.ua/fingerprints.json`; language configuration: `.ua/config.json`; exclusions: `.ua/.understandignore`. Use the installed Understand Anything skill and its supported workflow. If the installed version uses another layout, document the actual paths here rather than inventing compatibility files.

At creation of this file on October 18, `.ua/` did not exist. No graph was generated or verified during this documentation task. Until an actual graph is available, use `docs/README.md` and `docs/architecture.md` for orientation and verify behavior against source. Initialize the graph through the standard Understand Anything workflow when that work is authorized or part of the agreed scope; do not claim it already exists.

- Keep the graph aligned with architecture and code changes. Use the standard Understand Anything skill; do not manually alter graph semantics, fingerprints, statistics, or commit markers to create an appearance of freshness.
- Include this file and relevant knowledge-base documentation in graph analysis. Inspect uncommitted changes as well as HEAD; matching a commit marker does not guarantee freshness.
- Preserve the last working graph if preparation or an update fails. Record the specific discrepancy, analyzed commit, missing changes, and next action here. Do not conceal a missed update or commit unrelated work merely to satisfy a graph preflight.
- Exclude secrets, databases, user tasks/backups, browser caches, generated bundles, dependencies, and temporary reports from analysis artifacts. Analyze source and safe example configuration, not private runtime data.
- Do not persist a dashboard URL containing a temporary token. The dashboard address is a local runtime detail and can change on restart.
- Graph descriptions and handoff summaries must distinguish implemented behavior, planned work, historical checks, and unverified assumptions.

At each handoff, update the relevant documentation and this file when status changes: date; current task; commit or uncommitted work; actual checks; limitations/blockers; graph freshness; and the specific next action. Passing tests is not user acceptance, and a committed change is not proof of deployment. Keep detailed logs and temporary user data out of this file.

Current handoff (October 19, 2026): The user requested a Ponytail audit, implementation of justified recommendations, then a knowledge graph. Three simplifications are uncommitted: Select accepts entry arrays directly at all nine call sites; Webpack uses Node.js 24 import.meta.dirname; mergeEdit calls structuredClone without a delegating wrapper. See docs/ponytail-audit.md. HEAD remains 5ea1ce778d75402eb33ceb1b40f6d406b8e11dfb. This AGENTS.md was already untracked at the start; preserve it.

Actual checks: npm test passed 51 tests; selected Playwright suites i18n, workflows, server-feedback, and layout passed 96 tests and built production assets; format:check and git diff --check passed. Initial sandboxed test runs failed with listen EPERM; authorized runs with local-port access passed. Full browser coverage, visual-baseline comparison, and production were not checked. No commit, push, or deployment was performed.

Graph handoff (October 19): the first standard Understand Anything analysis covers the working tree after the Ponytail audit, including uncommitted code, this file, and docs/ponytail-audit.md. The bundled generate-ignore.mjs created .ua/.understandignore, then project privacy and generated-output exclusions were added. The user confirmed these exclusions on October 19. Graph language is English under these project rules. The standard Understand Anything scanner, analysis, review, fingerprint, and save workflow is now authorized against the final working tree, including AGENTS.md and the audit report. The publication record is .ua/knowledge-graph.json together with .ua/fingerprints.json and .ua/meta.json; validation results and analysis counts are reported by the workflow. These artifacts describe an uncommitted working tree, not a clean release. Inspect all three files and current changes rather than inferring graph freshness from HEAD. Temporary intermediate, tmp, and .trash directories are excluded from Git. No automatic-update hook was enabled. Next action after successful publication: use project/layers/tour to locate future changes and update the graph through the standard workflow when relevant files change; investigate any reported failure before treating the graph as current.

Current handoff (October 21, 2026): HEAD is f73beb24bb3b087c76a6da109ac113d45f4ef136; the working tree was clean when this chat started. Uncommitted changes add task attachments (up to 10 files, 20 MiB each), separate account-scoped IndexedDB/SQLite storage, durable offline upload before snapshot operations, portable JSON backup/import, metadata/content validation and private API download. Referenced attachments are limited to 200 MiB per workspace; server storage including unreferenced uploads is capped at 400 MiB. Files older than seven days without current references are cleaned up; local file cache is retained. No workspace schema version change; SQLite receives an additive attachments table. Read docs/data.md and docs/server.md before changing preservation or rollback behavior.

The Markdown editor input and highlighting use 16 px; mobile search/filter/task selectors also use 16 px. App-shell and workspace clipping use overflow: clip to remove extra scroll containers above main. The reported intermittent lower-screen rendering artifact was in Telegram on iPhone; the user could not reproduce it again and offered a screenshot. Its exact cause and resolution on the physical phone remain unverified. Do not call that symptom conclusively fixed. Daily Telegram digest and /today now include all unfinished Inbox tasks, independently of due dates, with no empty section and no separate schedule.

Actual checks in this chat: 57 Node unit/server tests passed, including actual 20 MiB file content, rejected content, ownership, cleanup, portable import, offline reload, lost upload responses, explicit rejection account switch during blob read and bounded response-body waits. A Chromium run passed 109 browser tests covering attachments, layout, modal layout, import, server feedback, remote synchronization and touch. A later focused Chromium run passed 14 attachment/editor/scroll/touch scenarios. Targeted new attachment/editor/scroll scenarios also passed in WebKit; all six focused drawer boundary tests passed after using keyboard activation to establish focus. Existing focus tests now explicitly focus the menu toggle before checking focus restoration; CDP touch tests explicitly skip non-Chromium engines. Further browser results belong to the final chat report; do not infer a full cross-browser pass from these counts. Test servers use synthetic data; the attachment API unit test additionally uses localhost:4019. No baseline visual comparison, real Telegram messages, VPS inspection, commit, push or deployment was performed. The Nginx example permits 28 MiB request bodies for base64 uploads; applying that change to an existing VPS remains a separate authorized infrastructure action.

Graph freshness for this handoff: the installed incremental preparer rejects relevant uncommitted changes, so a standard full Understand Anything workflow is used against the final working tree with the existing approved exclusions and English language. Only a successfully validated publication of .ua/knowledge-graph.json, .ua/fingerprints.json and .ua/meta.json establishes this update; retain the prior publication on workflow failure. These artifacts describe uncommitted work, not a clean release. Next action: review the implementation and the optional iPhone screenshot, verify the intermittent artifact on the physical device when reproducible, then follow explicit user instructions for commit/push/deployment.

Release packaging handoff (October 21, 2026): the user supplied a failed deployment log for pushed HEAD a6ed7b7ea094660a6e87de8c1fc07c3cb7c36a37. The working tree was clean at the start of this follow-up. The original local release archive reproduces ERR_MODULE_NOT_FOUND for src/app/attachments.js when importing server/app.js. The archive omitted both attachments.js and its transitive dependency src/app/sync/client-store.js; copying those two exact committed modules into a separate temporary extraction allows imports of server/app.js and server/telegram.js to succeed. This is local evidence for the startup failure, not a VPS journal inspection. The user's installer log reports code rollback; post-rollback health was not independently checked.

Uncommitted fix: scripts/release.mjs includes both files and inspectRelease now extracts the archive and imports the two side-effect-free server modules before prepare/upload/install can proceed. The check does not import server/index.js, start a server, open a database or contact Telegram. The synthetic release test covers the transitive dependency and rejects a checksum-valid archive missing client-store.js. Actual verification: focused tests/release.test.js passed; the real failed archive import failed as expected and the temporary extraction with both dependencies passed. No production operation, commit or push was performed. After committing and pushing the fix, prepare a new exact-HEAD release, then upload/install; do not reuse the failed archive.

Graph limitation for this follow-up: standard prepare-incremental.mjs was attempted against the published f73beb24bb3b087c76a6da109ac113d45f4ef136 baseline and explicitly rejected relevant uncommitted changes in scripts/release.mjs, tests/release.test.js and docs/vps.md. This handoff is also newer than the graph. The prior graph, fingerprints and metadata are preserved; they do not include this packaging correction. Next graph action: run the standard incremental workflow after the user's commit, including this handoff and all release changes. Do not change publication markers merely to claim freshness.

Daily digest formatting handoff (October 21, 2026): starting HEAD was 53fcca176248e15dd9b491c14c031d18f001a019 with a clean working tree. Uncommitted changes format both scheduled Telegram digests and /today with a localized day/month heading, bold date and daily task numbers, a blank-line-separated `–––` divider, and an always-visible Inbox count/list or empty message. The user confirmed the Russian empty daily message should say «На сегодня нет незавершённых задач». Existing unfinished-task selection, account timezone and schedule are preserved. Telegram bold entities preserve literal task titles, and enqueueText adjusts entity offsets when splitting long Unicode messages. docs/telegram.md describes the new format.

Actual verification: all 13 tests in tests/server.test.js passed on Node.js 24, including the new digest formatting/delivery and Unicode chunk checks. The first sandboxed run passed 12 tests but could not bind localhost:4018 (listen EPERM); the authorized local-port run passed all 13. Targeted Prettier checks and git diff --check passed. No application build, browser tests, real Telegram messages, commit, push or deployment were performed.

Graph limitation: the standard Understand Anything prepare-incremental.mjs rejected relevant uncommitted changes in docs/telegram.md, server/telegram.js, src/app/i18n-messages.js and tests/server.test.js. The prior graph/fingerprints/meta publication remains unchanged and does not describe this format or this handoff; its recorded baseline remains f73beb24bb3b087c76a6da109ac113d45f4ef136. Next action: update through the standard incremental workflow after the user's commit, including this handoff and all changes since the graph baseline. Deployment remains a separate explicitly authorized action.
