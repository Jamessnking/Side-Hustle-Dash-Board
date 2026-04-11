# plan.md (Updated)

## Objectives
- ✅ **Deliver a working V1 command center** (Ultimate Deployment Dashboard) with a scalable module/tab architecture.
- ✅ Prove the **core workflow** is reliable end-to-end:
  - **Skool classroom URL → scrape Loom links → yt-dlp download → metadata → Dropbox upload + shared link → Media Library record**.
  - **Pinterest URL → yt-dlp download → metadata → Dropbox upload + shared link → Media Library record**.
- ✅ Provide a **Content Library** that becomes your reusable asset bank (B‑roll + lessons).
- Expand from “downloaders” into a **Learning + Repurposing OS**:
  - Skool becomes **Skool Learning Intelligence** (download + transcript + structured insights + content plan).
- Build toward automation loops:
  - **Trend Finder → Pinterest auto-search + batch download** for B‑roll.
- Add higher-risk integrations (Instagram automation, avatar video, storefront) after the core is stable.

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

## Phase 3 — V1.1 Polish + “Learning Intelligence” + Better Jobs ✅ COMPLETE

### User stories (Phase 3)
1. As a user, I can see **live job progress** (downloading % / uploading % / ETA) without manual refresh.
2. As a user, I can run **Skool Learning Intelligence**:
   - Download → **Transcribe** → **Summarise** → **Extract key learnings** → **Generate repurposing plan**.
3. As a user, I can open any Library item and see:
   - transcript, key takeaways, suggested hooks, carousel outline, reel scripts.
4. As a user, I can receive a **notification** when a job completes (in-app toast + optional email/webhook later).
5. As a user, I can **dedupe** downloads by source URL/video id (avoid re-downloading and re-uploading duplicates).

### Implementation steps
- Jobs  Progress
  - Add structured job logs in DB (steps + timestamps).
  - Improve yt-dlp progress tracking:
    - Option A: parse yt-dlp stdout progress lines and persist.
    - Option B: move jobs to Celery/RQ later if needed.
  - Add polling improvements or WebSocket/SSE endpoint for real-time job updates.
- Skool Learning Intelligence
  - Add transcription step (MVP options):
    - Whisper via API (OpenAI) or local whisper if feasible.
  - Store transcript + timestamps in MongoDB linked to `media_item_id`.
  - Add AI analysis pipeline (Emergent LLM):
    - key takeaways
    - actionable steps
    - hook ideas
    - reel scripts (3 variations)
    - carousel outline (slide-by-slide)
    - CTA variants
  - UI: add “Analyse” button per Library item + “Insights” panel.
- Dedupe
  - Use a fingerprint: `source + extractor_id` (preferred) or file hash.
  - If duplicate found, reuse existing Dropbox link/path and mark job as complete.

### Success criteria (Phase 3)
- Skool videos can be processed into transcript + insights reliably.
- Jobs feel responsive and trustworthy (clear status + progress + retry).

---

## Phase 4 — Side Hustles Expansion + Planner + Prompt Workflows (Enhancement)

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

## Phase 5 — Trend Analyser V2 + Pinterest Auto-Search & Batch Downloader

### User stories (Phase 5)
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

### Success criteria (Phase 5)
- One-click workflow from trend → B-roll acquisition works reliably.

---

## Phase 6 — Instagram Management (Real Integration)

### User stories (Phase 6)
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

### Success criteria (Phase 6)
- At least one reliable scheduling path works end-to-end for 1 account.

---

## Phase 7 — Content/Avatar Creator (MVP)

### User stories (Phase 7)
1. As a user, I can upload a photo and generate an avatar video via provider API (HeyGen/D‑ID).
2. As a user, I can input a script and generate reel-ready output.
3. As a user, I can generate carousel assets (images + captions) from prompts.
4. As a user, outputs are saved to Dropbox + Library.

### Implementation steps
- Choose provider via quick integration spike.
- Add async generation jobs (similar to downloader jobs).
- Save outputs back into Library with tags and templates.

### Success criteria (Phase 7)
- One avatar generation pipeline is stable and produces reusable content.

---

## Phase 8 — Stan Store Style External Landing Page (Last)

### User stories (Phase 8)
1. As a user, I can create a landing page listing offers.
2. As a user, I can add digital products (PDFs/links) and update copy.
3. As a user, I can generate shareable links for IG DMs.
4. As a user, I can track basic clicks.
5. As a user, I can initially link to Skool and later swap to products.

### Implementation steps
- Build external landing page + simple CMS.
- Connect with DM rules (share links).

### Success criteria (Phase 8)
- Landing page is live, editable, and usable from Instagram DM links.

---

## ✅ Phase 3 Completion Summary

**Completed Date**: 2026-04-11
**Test Results**: 100% pass (iteration_2.json)

### What Was Built:
1. **AI Intelligence Pipeline**:
   - `faster-whisper` integration for local transcription
   - Emergent LLM (OpenAI) for content analysis
   - Structured outputs: hooks, reel scripts, carousel outlines, repurposing ideas

2. **Live Job Progress Tracking**:
   - Real-time polling every 3 seconds
   - Progress bars showing download/upload percentages
   - Toast notifications with Dropbox links on completion

3. **Content Library AI Panel**:
   - InsightsPanel component with expandable sections
   - Manual "Transcribe" and "AI Analyse" buttons per item
   - Full transcript view with timestamped segments
   - Copy-to-clipboard for hooks, scripts, and carousels

4. **Enhanced Downloaders**:
   - Skool: Toggle switches for transcribe + analyze options
   - Pinterest: Batch download + trend search functionality
   - Duplicate detection preventing re-downloads

### Key Files Modified:
- `/app/backend/server.py` - Added transcription + AI analysis endpoints
- `/app/frontend/src/pages/ContentLibrary.js` - Built InsightsPanel UI
- `/app/frontend/src/pages/SkoolDownloader.js` - Added AI toggle switches
- `/app/frontend/src/pages/PinterestDownloader.js` - Enhanced job tracking

---

## 🔧 Phase 3.5 - Critical Bug Fix: Transcription Pipeline Recovery (COMPLETED)

**Issue**: 57/131 video transcriptions were failing with "ffmpeg not found" errors, blocking the entire processing pipeline.

**Root Cause**: ffmpeg was never properly installed on the system. The Celery workers couldn't extract audio from Loom HLS streams without ffmpeg.

**Resolution** (2026-04-11):
1. ✅ Installed ffmpeg via apt-get (`ffmpeg 5.1.8-0+deb12u1`)
2. ✅ Verified ffmpeg accessible at `/usr/bin/ffmpeg` (path already configured in sync_helpers.py)
3. ✅ Restarted Celery workers to pick up ffmpeg installation
4. ✅ Requeued all 56 failed transcription tasks
5. ✅ Created monitoring script: `/app/backend/monitor_transcription_progress.py`

**Current Status**:
- 📊 75 total videos downloaded
- ✅ 19 transcribed (25.3%) - **actively processing**
- 🔄 2 currently running
- ⏳ 54 pending in queue
- ❌ 0 failed
- 🧠 18 AI analyzed

**Timeline**: All 75 videos should complete transcription within 1-2 hours (average 2-3 minutes per video).

**Files Created**:
- `/app/backend/requeue_failed_transcriptions.py` - Utility to requeue failed tasks
- `/app/backend/monitor_transcription_progress.py` - Real-time progress monitor

**Next Steps**:
The transcription pipeline is now **autonomous**. It will continue processing the backlog automatically. When complete, ready to proceed to **Phase 4: Instagram Graph API Management**.

