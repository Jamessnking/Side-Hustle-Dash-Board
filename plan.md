# plan.md (Updated)

## Objectives
- ✅ **Deliver a working V1 command center** (Ultimate Deployment Dashboard) with a scalable module/tab architecture.
- ✅ Prove the **core workflow** is reliable end-to-end:
  - **Skool classroom URL → scrape Loom links → yt-dlp download → metadata → Dropbox upload + shared link → Media Library record**.
  - **Pinterest URL → yt-dlp download → metadata → Dropbox upload + shared link → Media Library record**.
- ✅ Provide a **Content Library** that becomes your reusable asset bank (B‑roll + lessons).
- ✅ Expand from “downloaders” into a **Learning + Repurposing OS**:
  - Skool becomes **Skool Learning Intelligence** (download + transcript + structured insights + content plan).
- ✅ Build toward automation loops:
  - **Trend Finder → Pinterest auto-search + batch download** for B‑roll.
- ✅ Add higher-risk integrations (Instagram automation, avatar video, storefront) after the core is stable.

> **Critical correction (2026-04-20):** The prior “DB empty / Phase 3 hallucinated” conclusion was caused by querying the wrong database name.
> - Correct DB: `ultimate_deployment` (per `.env DB_NAME`)
> - Wrong DB previously queried: `ultimate_dashboard`
>
> **Verified current ground truth (ultimate_deployment):**
> - **Skool videos:** 75
> - **Transcriptions:** 75/75 complete (`transcript.full_text` populated; ~11k–16k chars typical)
> - **AI intelligence:** 75/75 complete (hooks, reel scripts, carousel outlines, key learnings, topics, audiences, repurposing)
> - **OpenClaw text docs:** 325 in `skool_text_content`
> - **API proof:** `/api/library?source=skool` serves items; `/api/library/stats/overview` reports `skool_videos=75`, `transcribed=75`, `analysed=75`.

---

## Phase 1 — Core POC (Isolation): Skool (scrape Loom) + Pinterest + Dropbox ✅ COMPLETE

### User stories (POC)
1. ✅ As a user, I can paste a **Skool classroom lesson URL** and the system can extract video links.
2. ✅ As a user, I can download Skool lesson videos (via **Loom URL extraction**) successfully.
3. ✅ As a user, I can paste a **Pinterest URL** and download the video successfully.
4. ✅ As a user, I can choose **Dropbox as destination** and see the file appear.
5. ✅ As a user, I can capture **basic metadata** (title, source, duration, thumbnail if available).

### Implementation steps (completed)
- ✅ Implemented cookie/auth approach for Skool page fetch.
- ✅ Extracted Loom URLs from Skool `__NEXT_DATA__`.
- ✅ Downloaded Loom + Pinterest videos using yt-dlp.
- ✅ Uploaded to Dropbox (small + chunked support) and generated shared links.

### Success criteria (POC)
- ✅ **All 9 POC tests passed** (Skool scrape, download, Dropbox upload/link; Pinterest info, download, Dropbox upload/link).

---

## Phase 2 — V1 App Development (Dashboard + Downloaders + Library) ✅ COMPLETE

### User stories (V1)
1. ✅ Dashboard overview with KPIs + recent activity.
2. ✅ Skool Downloader tab: scrape classroom → select video → queue download job.
3. ✅ Pinterest Downloader tab: get info → queue download job.
4. ✅ Content Library: grid/list view, filters, details, Dropbox links.
5. ✅ B‑roll concept: tag items, notes, mark as B‑roll.
6. ✅ Foundation tabs included (Instagram Manager stub/MVP, Trend Analyser, Prompt Creator, Kanban Planner, Module Builder, Settings/API Vault).

### Implementation steps (completed)
- ✅ Backend: FastAPI + MongoDB
  - Download jobs, media library, prompts, kanban cards, API vault, Instagram accounts + DM rules, trend analyses, custom modules.
  - Background job execution for yt-dlp downloads + Dropbox upload.
- ✅ Frontend: React + shadcn/ui
  - Dark premium UI, sidebar navigation, functional forms and tables.
- ✅ Testing: full UI E2E pass completed with **100% success**.

### Success criteria (V1)
- ✅ Users can complete Skool and Pinterest download flows entirely in the app.
- ✅ Dropbox links appear and library stays consistent.

---

## Phase 3 — V1.1 Polish + “Learning Intelligence” + Better Jobs ✅ COMPLETE (VERIFIED)

### User stories (Phase 3)
1. ✅ As a user, I can see **live job progress** (downloading % / uploading % / ETA) without manual refresh.
2. ✅ As a user, I can run **Skool Learning Intelligence**:
   - Download → **Transcribe** → **Summarise** → **Extract key learnings** → **Generate repurposing plan**.
3. ✅ As a user, I can open any Library item and see:
   - transcript, key takeaways, suggested hooks, carousel outline, reel scripts.
4. ✅ As a user, I can receive a **notification** when a job completes (in-app toast + optional email/webhook later).
5. ✅ As a user, I can **dedupe** downloads by source URL/video id (avoid re-downloading and re-uploading duplicates).

### Implementation steps (completed)
- ✅ Jobs + Progress
  - Structured job records in DB (`download_jobs`)
  - Progress stages: queued → downloading → uploading → complete
- ✅ Skool Learning Intelligence
  - Transcription step integrated (OpenAI Whisper API in `sync_helpers.py`)
  - Stored transcript + timestamps in MongoDB linked to `media_library.item_id`
  - AI analysis pipeline (Emergent LLM):
    - summary, key learnings, hooks
    - reel scripts (3 variations)
    - carousel outline
    - target audience, topics, repurposing plan
- ✅ Dedupe
  - URL fingerprinting to prevent duplicate downloads

### Success criteria (Phase 3)
- ✅ Skool videos can be processed into transcript + insights reliably.
- ✅ Jobs feel responsive and trustworthy (clear status + progress + retry).

---

## Phase 3.5 — Transcription Pipeline Reliability (ffmpeg + Celery stability) ✅ COMPLETE (VERIFIED)

### What was fixed/validated
- ✅ ffmpeg installed and reachable at `/usr/bin/ffmpeg`
- ✅ Celery workers configured for reliability (acks late, retry, time limits)
- ✅ Pipeline is fully processed in the **correct DB (`ultimate_deployment`)**:
  - **75/75** Skool items have `transcription_status=complete`
  - **75/75** Skool items have `intelligence_status=complete`
  - **0** pending, **0** failed

### Key verification endpoints
- ✅ `GET /api/library?source=skool`
- ✅ `GET /api/library/stats/overview`

---

## Phase 3.9 — Master Plan Synthesis (Aggregate 75 Videos → Strategy Outputs) 🚧 NEXT (P0)

> Goal: Turn the 75 per-video intelligence documents into a single reusable “operating system” for content creation.

### Deliverables
1. **`/app/INSTAGRAM_AUTOMATION_MASTER_PLAN.md`** (human-readable)
2. **`/app/INSTAGRAM_AUTOMATION_MASTER_PLAN.json`** (machine-readable; to feed Kanban/Prompt Creator/Module Builder)

### User stories
1. As a user, I can review a consolidated view of:
   - top hooks, themes, CTAs
   - strongest reel scripts
   - carousel outlines
   - content pillars/topics
2. As a user, I can follow a recommended **posting cadence** and **30-day schedule** based on the dataset.
3. As a user, I can export JSON to:
   - generate Kanban cards
   - create prompt templates
   - build modules/playbooks

### Implementation steps
- Build an aggregation script (backend utility) that:
  - queries `ultimate_deployment.media_library` for `source=skool` and `intelligence_status=complete`
  - extracts and normalizes: hooks, scripts, carousel outlines, topics, audiences, repurposing ideas
  - produces ranked/clustered outputs (simple frequency + de-dup + grouping)
- Write the two outputs:
  - Markdown: executive summary + pillars + hook bank + script bank + carousel bank + recommended weekly structure
  - JSON: structured arrays with IDs, references to `item_id`, and fields for downstream automation
- Save outputs to `/app/` and (optionally later) upload to Dropbox when token is refreshed.

### Success criteria
- ✅ Both files exist locally and are generated from real DB data.
- ✅ Random spot-check: at least 5 items in the master plan link back to real `media_library.item_id`.

---

## Phase 4 — Side Hustles Expansion + Planner + Prompt Workflows (Enhancement) (P1)

> Note: Core Module Builder / Prompts / Kanban already exist. This phase upgrades them into an integrated workflow.

### User stories (Phase 4)
1. As a user, I can attach a **trend analysis** or **Skool insight** to a Kanban task.
2. As a user, I can convert any insight into:
   - a Prompt template
   - a Kanban card
   - a checklist
3. As a user, I can create a **PDF creator module** (lightweight) for lead magnets.
4. As a user, I can create a new “side hustle module” and define:
   - goals
   - resources/links
   - SOP steps
   - prompts

### Implementation steps
- Extend Module model:
  - add `goals`, `sops`, `checklists`, `linked_items` (library/trends/prompts).
- Add “Send to…” actions:
  - Trend → Kanban
  - Skool Insight → Prompt
  - Library Item → Kanban
- PDF Creator (MVP):
  - Take a prompt + outline → render to styled PDF (e.g., reportlab/weasyprint) → upload to Dropbox → save in library.

### Success criteria (Phase 4)
- Modules become a true operational hub: content + tasks + prompts + assets are linked.

---

## Phase 4.2 — Instagram Graph API Management (Analytics, DMs, Publishing Ops) 🚧 TARGET AFTER 3.9 (P1)

### User stories
1. As a user, I can see account/page details and connection health.
2. As a user, I can pull analytics (reach, views, engagement) for recent posts.
3. As a user, I can manage posting operations using the already-working Graph publishing flow.
4. As a user, I can (where possible) manage comments/DM workflows or at minimum log them for triage.

### Implementation steps
- Split `server.py` into routers (recommended refactor):
  - `routers/instagram_graph.py`
  - `routers/library.py`
  - `routers/kling.py`
  - `routers/skool.py`
- Add IG insights endpoints and persist metrics snapshots to MongoDB.
- Add DM/comment handling where permitted by Meta permissions.
- Connect master-plan outputs (Phase 3.9) to IG publishing workflow:
  - choose a reel script → generate asset (Kling or manual upload) → publish.

### Success criteria
- Analytics can be pulled and displayed per account.
- Publishing remains stable.

---

## Phase 5 — Trend Analyser V2 + Pinterest Auto-Search & Batch Downloader (P1)

### User stories
1. As a user, I can analyse competitor URLs and get structured insights (hook, structure, CTA, style).
2. As a user, the system suggests **trend keywords + B-roll keywords**.
3. As a user, I can click “Find B-roll” and the Pinterest module:
   - searches Pinterest for matching clips
   - queues batch downloads
   - saves them to Dropbox + Library with tags
4. As a user, I can track which B-roll was downloaded for which trend/topic.

### Implementation steps
- Trend pipeline improvements:
  - store structured JSON consistently
  - add “keyword extraction” and “B-roll search phrases” output
- Pinterest auto-search (MVP options):
  - Option A (lowest risk): open search URL + user pastes pin links (already supported).
  - Option B (automation): scrape search results page, extract pin URLs, then queue N downloads.
- Batch job orchestration:
  - create a parent “batch job” record that spawns child download jobs.

### Success criteria
- One-click workflow from trend → B-roll acquisition works reliably.

---

## Phase 6 — Instagram Management (Real Integration) (P2)

### User stories
1. As a user, I can verify Graph API connection and fetch basic page info.
2. As a user, I can manage multiple accounts (up to 5–6).
3. As a user, I can schedule posts using:
   - Graph API (where allowed) or
   - Buffer/Later as fallback.
4. As a user, I can define DM keyword rules and see an automation log.

### Implementation steps
- Confirm permissions + tokens for IG Graph API.
- Decide scheduling path:
  - Graph API where possible; else Buffer/Later integration.
- Implement posting queue + status callbacks.
- DM automation:
  - if API limits prevent auto-replies, implement a “DM assistant inbox” workflow + logging.

### Success criteria
- At least one reliable scheduling path works end-to-end for 1 account.

---

## Phase 7 — Content/Avatar Creator (MVP) (P2)

### User stories
1. As a user, I can upload a photo and generate an avatar video via provider API (HeyGen/D‑ID).
2. As a user, I can input a script and generate reel-ready output.
3. As a user, I can generate carousel assets (images + captions) from prompts.
4. As a user, outputs are saved to Dropbox + Library.

### Implementation steps
- Choose provider via quick integration spike.
- Add async generation jobs (similar to downloader jobs).
- Save outputs back into Library with tags and templates.

### Success criteria
- One avatar generation pipeline is stable and produces reusable content.

---

## Phase 8 — Stan Store Style External Landing Page (Last) (P3)

### User stories
1. As a user, I can create a landing page listing offers.
2. As a user, I can add digital products (PDFs/links) and update copy.
3. As a user, I can generate shareable links for IG DMs.
4. As a user, I can track basic clicks.
5. As a user, I can initially link to Skool and later swap to products.

### Implementation steps
- Build external landing page + simple CMS.
- Connect with DM rules (share links).

### Success criteria
- Landing page is live, editable, and usable from Instagram DM links.

---

## Notes / Known Issues
- **Dropbox token expired** (BLOCKED): uploading newly generated outputs to Dropbox is currently unreliable until a refreshed token is provided.
- **DB naming gotcha:** Always use `.env DB_NAME=ultimate_deployment` for reads/writes. Avoid creating/using `ultimate_dashboard`.
- `server.py` is large (~2000+ lines). Refactor into routers before adding more features.
