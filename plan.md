# plan.md

## Objectives
- Prove the **core workflow** works reliably: **Skool/Pinterest URL → yt-dlp download → metadata → Dropbox upload → Content Library record**.
- Deliver a V1 **Ultimate Deployment Dashboard** with tabs for Downloaders + Content Library, designed to scale into additional “side hustles” (modules).
- Add higher-risk integrations (Instagram, trends, avatar video) only after the download/storage core is stable.

---

## Phase 1 — Core POC (Isolation): yt-dlp + Skool/Pinterest + Dropbox

### User stories (POC)
1. As a user, I can paste a **Skool video URL** and download the source file successfully.
2. As a user, I can paste a **Pinterest URL** and download the video successfully.
3. As a user, I can choose **Dropbox as the destination** and see the file appear in a folder.
4. As a user, I can see **basic metadata** (title, source, duration if available) captured alongside the file.
5. As a user, I can rerun a download and the system **deduplicates** (doesn’t re-upload identical content).

### Implementation steps
- Web research / integration playbook
  - Validate current best practices for: yt-dlp cookies-based auth, Pinterest support, Dropbox upload limits/chunked uploads.
- POC script (single Python file)
  - Inputs: `source_type (skool|pinterest)`, `url`, `output_dir`, `dropbox_target_path`.
  - yt-dlp download using:
    - Pinterest: direct URL support.
    - Skool: attempt yt-dlp with **cookies.txt** / session cookies flow.
  - Extract metadata via yt-dlp info-json.
  - Upload to Dropbox via Dropbox SDK:
    - Small files: simple upload.
    - Large files: chunked upload.
  - Persist a local JSON manifest for results + dedupe fingerprint (hash or yt-dlp id).
- Fix-until-works loop
  - Iterate on Skool auth approach (cookies export vs. credential-based) until repeatable.
  - Confirm Pinterest variants (pin URL, board URL, video pin URL).

### Next actions (POC)
- Request/confirm from user (sensitive):
  - Skool URL examples + preferred method: provide **cookies.txt** export (recommended) vs. login.
  - Dropbox app token (scoped) + target folder structure.
- Implement and run POC script against at least:
  - 2 Skool video URLs
  - 2 Pinterest URLs (different formats)

### Success criteria (POC)
- ≥90% success on test URLs with clean error messages for failures.
- Dropbox uploads confirmed with returned shareable path/link.
- Manifest shows correct metadata + dedupe behavior.

---

## Phase 2 — V1 App Development (Dashboard + Downloaders + Library)

### User stories (V1)
1. As a user, I can open the dashboard and use a **Skool Downloader tab** to submit URLs and see job progress.
2. As a user, I can use a **Pinterest Downloader tab** the same way.
3. As a user, I can view a **Content Library** of downloaded items with filters (source, date, tag).
4. As a user, I can click an item to see **file details** and a **Dropbox link**.
5. As a user, I can manage a **B-roll folder** concept (tag items as b-roll, add notes).

### Implementation steps
- Backend (FastAPI + MongoDB)
  - Models: `DownloadJob`, `MediaItem`, `SourceAccount/Settings` (minimal), `Module` (stub for later).
  - Endpoints:
    - `POST /download/skool` and `POST /download/pinterest`
    - `GET /jobs`, `GET /jobs/{id}`
    - `GET /library`, `GET /library/{id}`, `PATCH /library/{id}` (tags/notes/broll)
    - `POST /settings/dropbox/test` (validate token)
  - Worker execution (MVP): background tasks / simple queue (single process) to run yt-dlp + Dropbox upload.
  - Storage conventions in Dropbox: `/UltimateDashboard/{source}/{yyyy-mm}/{filename}`.
- Frontend (React + shadcn/ui)
  - Layout: sidebar tabs (Downloaders, Library, Settings).
  - Downloader forms: URL input, optional destination subfolder, start button.
  - Job UI: status (queued/downloading/uploading/done/failed) + logs.
  - Library UI: table/grid, filters, detail drawer.
- Incremental test
  - Manual end-to-end: submit URL → observe job → confirm Dropbox link → item appears in Library.
- Testing agent: 1 full E2E pass for V1.

### Next actions (V1)
- Build V1 using the proven POC code path (no re-implementation divergence).
- Add robust error mapping (yt-dlp errors, auth errors, Dropbox errors) into user-friendly UI messages.

### Success criteria (V1)
- Users can complete the full loop for both sources without leaving the app.
- Library is consistent with Dropbox uploads (no orphaned records).
- Clear retries and failure states.

---

## Phase 3 — “Side Hustles” Framework + Planner + Prompt Creator

### User stories (Phase 3)
1. As a user, I can create a **new module/tab** by entering a name, description, and links.
2. As a user, I can pin key resources (URLs, docs) inside a module.
3. As a user, I can create and save **prompt templates** and reuse them quickly.
4. As a user, I can manage work on a **Kanban board** (To do / Doing / Done).
5. As a user, I can store integration keys in a **secure settings area** (MVP: env-backed + masked UI).

### Implementation steps
- Modules system (MVP)
  - CRUD for `Module` and render as sidebar items.
  - Each module has: notes, links, basic tasks.
- Prompt Creator
  - Prompt templates CRUD + tags + “copy to clipboard”.
- Trello-style planner
  - Kanban board CRUD + drag/drop.
- Testing agent: E2E regression covering downloaders + new modules + prompts + kanban.

### Success criteria (Phase 3)
- New modules can be added without code changes.
- Prompts and tasks persist reliably and are easy to navigate.

---

## Phase 4 — Instagram Management (MVP Scheduling + DM Automation stub)

### User stories (Phase 4)
1. As a user, I can connect 1 Instagram account and confirm the connection works.
2. As a user, I can add additional accounts (up to 5–6) and switch between them.
3. As a user, I can schedule a post from items in my Library.
4. As a user, I can set simple DM keyword rules (trigger → response).
5. As a user, I can see a log of automation actions and failures.

### Implementation steps
- Research Graph API vs Buffer/Later (choose lowest-friction MVP).
- Implement connection + minimal scheduling flow.
- DM automation: start as “rules + inbox logging” if API limits prevent full automation.
- Testing agent: verify multi-account switching + scheduling flow.

### Success criteria (Phase 4)
- At least one reliable posting/scheduling path works end-to-end.

---

## Phase 5 — Trend Analyser (Competitors + Trending Audio)

### User stories (Phase 5)
1. As a user, I can paste competitor URLs and get a summarized breakdown (hook, structure, CTA).
2. As a user, I can detect and list **trending audio** references from provided URLs.
3. As a user, I can receive **content ideas** tailored to my niche.
4. As a user, I can save analyses to a module and turn them into tasks.
5. As a user, I can export ideas as prompts for the Prompt Creator.

### Implementation steps
- Start URL-based analysis (no scraping-heavy automation initially).
- AI pipeline: summarize → extract patterns → suggest variants.
- Store analyses and link to tasks.
- Testing agent: validate outputs and persistence.

### Success criteria (Phase 5)
- Analyses are reproducible, saved, and actionable (tasks/prompts).

---

## Phase 6 — Content/Avatar Creator (MVP)

### User stories (Phase 6)
1. As a user, I can upload a photo and generate an avatar video via a provider API.
2. As a user, I can input a script and get a short reel-ready video.
3. As a user, I can generate a carousel (images + captions) from a prompt.
4. As a user, I can add text overlays and export.
5. As a user, I can save outputs directly into the Library + Dropbox.

### Implementation steps
- Choose provider (HeyGen/D-ID) via a small integration test.
- Implement job-based generation (async) + storage back into Dropbox/Library.
- Testing agent: run one generation end-to-end.

### Success criteria (Phase 6)
- One avatar video generation pipeline works reliably and lands in Library.

---

## Phase 7 — Stan Store Style External Landing Page (Last)

### User stories (Phase 7)
1. As a user, I can create a simple landing page listing offers.
2. As a user, I can add digital products (PDFs/links) and update copy.
3. As a user, I can generate shareable links for IG DMs.
4. As a user, I can track clicks/conversions at a basic level.
5. As a user, I can initially link to Skool and later swap to products.

### Implementation steps
- Build external landing page + product listings.
- Hook into DM rules to share links.
- Testing agent: verify link routing + page rendering.

### Success criteria (Phase 7)
- Landing page is live, editable, and usable from IG DM links.
