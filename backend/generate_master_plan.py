"""
Instagram Automation Master Plan Generator
==========================================

Aggregates all 75 Skool video AI intelligence documents into two outputs:
  1. /app/INSTAGRAM_AUTOMATION_MASTER_PLAN.md   (human-readable strategy doc)
  2. /app/INSTAGRAM_AUTOMATION_MASTER_PLAN.json (machine-readable export)

Each output links back to the originating media_library.item_id so the master
plan is fully traceable to the source video.

Run:
    cd /app/backend && python3 generate_master_plan.py
"""
import os
import re
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ultimate_deployment")

MD_OUT = "/app/INSTAGRAM_AUTOMATION_MASTER_PLAN.md"
JSON_OUT = "/app/INSTAGRAM_AUTOMATION_MASTER_PLAN.json"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def normalize(text):
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def group_topics(topics_counter, threshold=1):
    """Return topics sorted by frequency, optionally filtered by min count."""
    return [
        {"topic": t, "count": c}
        for t, c in topics_counter.most_common()
        if c >= threshold
    ]


def dedupe_by_text(items, text_key="text", limit=None):
    """Deduplicate a list of dicts by normalized text (case-insensitive)."""
    seen = set()
    out = []
    for it in items:
        key = normalize(it.get(text_key, "")).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
        if limit and len(out) >= limit:
            break
    return out


# ─── Aggregation ──────────────────────────────────────────────────────────────

def aggregate():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    cursor = db.media_library.find(
        {
            "source": "skool",
            "intelligence_status": "complete",
            "intelligence": {"$ne": None},
        }
    ).sort("created_at", 1)

    videos = list(cursor)

    hooks_bank = []           # [{type, text, source_item_id, source_title}]
    reel_scripts_bank = []    # [{title, hook, body, cta, source_item_id, source_title}]
    carousels_bank = []       # [{title, slides, source_item_id, source_title}]
    learnings_bank = []       # [{text, source_item_id, source_title}]
    repurpose_bank = []       # [{idea, source_item_id, source_title}]

    topics_counter = Counter()
    audiences_counter = Counter()
    hook_type_counter = Counter()

    per_video = []

    for v in videos:
        item_id = v.get("item_id")
        title = v.get("title", "Untitled")
        dropbox_link = v.get("dropbox_link", "")
        duration = v.get("duration", 0) or 0
        intel = v.get("intelligence") or {}

        # Hooks
        for h in (intel.get("hooks") or []):
            if isinstance(h, dict):
                hook_type = normalize(h.get("type", "general"))
                text = normalize(h.get("text"))
                if text:
                    hook_type_counter[hook_type.lower()] += 1
                    hooks_bank.append({
                        "type": hook_type,
                        "text": text,
                        "source_item_id": item_id,
                        "source_title": title,
                    })

        # Reel scripts
        for rs in (intel.get("reel_scripts") or []):
            if isinstance(rs, dict):
                reel_scripts_bank.append({
                    "title": normalize(rs.get("title")),
                    "hook": normalize(rs.get("hook")),
                    "body": normalize(rs.get("body")),
                    "cta": normalize(rs.get("cta")),
                    "source_item_id": item_id,
                    "source_title": title,
                })

        # Carousel
        co = intel.get("carousel_outline") or {}
        if isinstance(co, dict) and (co.get("slides") or co.get("title")):
            slides = []
            for s in (co.get("slides") or []):
                if isinstance(s, dict):
                    slides.append({
                        "slide": s.get("slide"),
                        "headline": normalize(s.get("headline")),
                        "content": normalize(s.get("content")),
                    })
            if slides:
                carousels_bank.append({
                    "title": normalize(co.get("title")) or title,
                    "slides": slides,
                    "source_item_id": item_id,
                    "source_title": title,
                })

        # Key learnings
        for kl in (intel.get("key_learnings") or []):
            if isinstance(kl, str):
                txt = normalize(kl)
                if txt:
                    learnings_bank.append({
                        "text": txt,
                        "source_item_id": item_id,
                        "source_title": title,
                    })

        # Repurpose ideas
        for idea in (intel.get("repurposing_plan") or []):
            if isinstance(idea, str):
                txt = normalize(idea)
                if txt:
                    repurpose_bank.append({
                        "idea": txt,
                        "source_item_id": item_id,
                        "source_title": title,
                    })

        # Topics & audiences
        for t in (intel.get("content_topics") or []):
            if isinstance(t, str):
                topics_counter[normalize(t).lower()] += 1

        aud = intel.get("target_audience")
        if isinstance(aud, str) and aud:
            audiences_counter[normalize(aud).lower()[:120]] += 1

        per_video.append({
            "item_id": item_id,
            "title": title,
            "duration_sec": duration,
            "dropbox_link": dropbox_link,
            "summary": normalize(intel.get("summary")),
            "key_learnings_count": len(intel.get("key_learnings") or []),
            "hooks_count": len(intel.get("hooks") or []),
            "reel_scripts_count": len(intel.get("reel_scripts") or []),
            "carousel_slides_count": len((co.get("slides") if isinstance(co, dict) else []) or []),
            "topics": [normalize(t) for t in (intel.get("content_topics") or []) if isinstance(t, str)],
            "target_audience": normalize(aud) if isinstance(aud, str) else "",
        })

    # Dedupe + rank banks
    hooks_bank = dedupe_by_text(hooks_bank, "text")
    reel_scripts_bank = dedupe_by_text(reel_scripts_bank, "hook")
    learnings_bank = dedupe_by_text(learnings_bank, "text")
    repurpose_bank = dedupe_by_text(repurpose_bank, "idea")

    # Group hooks by type
    hooks_by_type = defaultdict(list)
    for h in hooks_bank:
        hooks_by_type[h["type"].lower() or "general"].append(h)

    # Weekly schedule (4-week / 28-post recommendation)
    # 3 reels + 2 carousels + 2 story/engagement posts per week (generic rhythm)
    weekly_structure = [
        {"day": "Mon", "format": "Reel", "notes": "High-hook awareness reel"},
        {"day": "Tue", "format": "Carousel", "notes": "Educational deep-dive"},
        {"day": "Wed", "format": "Reel", "notes": "Story / transformation"},
        {"day": "Thu", "format": "Story + Poll", "notes": "Audience engagement"},
        {"day": "Fri", "format": "Carousel", "notes": "Framework / step-by-step"},
        {"day": "Sat", "format": "Reel", "notes": "CTA / offer-adjacent"},
        {"day": "Sun", "format": "Story", "notes": "Behind-the-scenes / recap"},
    ]

    # Build 30-day schedule from banks
    schedule_30d = []
    reel_i = 0
    carousel_i = 0
    for day in range(1, 31):
        slot = weekly_structure[(day - 1) % 7]
        if slot["format"] == "Reel" and reel_i < len(reel_scripts_bank):
            r = reel_scripts_bank[reel_i]
            schedule_30d.append({
                "day": day,
                "format": "Reel",
                "title": r["title"],
                "hook": r["hook"],
                "body": r["body"],
                "cta": r["cta"],
                "source_item_id": r["source_item_id"],
                "source_title": r["source_title"],
            })
            reel_i += 1
        elif slot["format"] == "Carousel" and carousel_i < len(carousels_bank):
            c = carousels_bank[carousel_i]
            schedule_30d.append({
                "day": day,
                "format": "Carousel",
                "title": c["title"],
                "slides_count": len(c["slides"]),
                "source_item_id": c["source_item_id"],
                "source_title": c["source_title"],
            })
            carousel_i += 1
        else:
            schedule_30d.append({
                "day": day,
                "format": slot["format"],
                "notes": slot["notes"],
            })

    master = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "db": DB_NAME,
            "collection": "media_library",
            "filter": {"source": "skool", "intelligence_status": "complete"},
        },
        "stats": {
            "total_videos": len(videos),
            "unique_hooks": len(hooks_bank),
            "unique_reel_scripts": len(reel_scripts_bank),
            "carousel_outlines": len(carousels_bank),
            "unique_key_learnings": len(learnings_bank),
            "repurpose_ideas": len(repurpose_bank),
        },
        "content_pillars": group_topics(topics_counter),
        "target_audiences": [
            {"audience": a, "count": c}
            for a, c in audiences_counter.most_common(15)
        ],
        "hook_type_distribution": [
            {"type": t, "count": c} for t, c in hook_type_counter.most_common()
        ],
        "hooks_bank": hooks_bank,
        "hooks_by_type": {k: v for k, v in hooks_by_type.items()},
        "reel_scripts_bank": reel_scripts_bank,
        "carousels_bank": carousels_bank,
        "key_learnings_bank": learnings_bank,
        "repurpose_bank": repurpose_bank,
        "weekly_structure": weekly_structure,
        "schedule_30_day": schedule_30d,
        "per_video_index": per_video,
    }

    return master


# ─── Markdown Renderer ────────────────────────────────────────────────────────

def render_markdown(m):
    ts = m["generated_at"]
    s = m["stats"]

    lines = []
    lines.append(f"# Instagram Automation Master Plan\n")
    lines.append(f"_Generated: {ts}_\n")
    lines.append(
        f"> Data source: MongoDB `{m['source']['db']}.{m['source']['collection']}` "
        f"(filter: `source=skool`, `intelligence_status=complete`)\n"
    )

    # Exec summary
    lines.append("\n## Executive Summary\n")
    lines.append(
        f"This plan is synthesized from **{s['total_videos']} Skool videos** "
        f"fully transcribed and analyzed by the pipeline (OpenAI Whisper + Emergent LLM).\n"
    )
    lines.append(f"- **Unique hooks:** {s['unique_hooks']}")
    lines.append(f"- **Unique reel scripts:** {s['unique_reel_scripts']}")
    lines.append(f"- **Carousel outlines:** {s['carousel_outlines']}")
    lines.append(f"- **Key learnings:** {s['unique_key_learnings']}")
    lines.append(f"- **Repurpose ideas:** {s['repurpose_ideas']}\n")

    # Pillars
    lines.append("\n## Content Pillars (Top Topics)\n")
    if m["content_pillars"]:
        lines.append("| # | Topic | Frequency |")
        lines.append("|---|---|---|")
        for i, p in enumerate(m["content_pillars"][:25], 1):
            lines.append(f"| {i} | {p['topic']} | {p['count']} |")
    else:
        lines.append("_No topics extracted._")

    # Audiences
    lines.append("\n## Target Audiences\n")
    if m["target_audiences"]:
        for a in m["target_audiences"][:10]:
            lines.append(f"- **{a['audience']}** _(mentioned {a['count']}x)_")
    else:
        lines.append("_No audiences detected._")

    # Hook type distribution
    lines.append("\n## Hook Style Mix\n")
    for ht in m["hook_type_distribution"]:
        lines.append(f"- `{ht['type']}`: {ht['count']}")

    # Hook bank (grouped)
    lines.append("\n## Hook Bank (grouped by style)\n")
    for ht, hooks in m["hooks_by_type"].items():
        lines.append(f"\n### {ht.title()} ({len(hooks)})\n")
        for i, h in enumerate(hooks[:15], 1):
            lines.append(f"{i}. \"{h['text']}\"  \n   _source: {h['source_title']}_")

    # Reel scripts
    lines.append("\n## Reel Script Bank (Top 20)\n")
    for i, r in enumerate(m["reel_scripts_bank"][:20], 1):
        lines.append(f"\n### Reel {i}: {r['title'] or '(untitled)'}\n")
        lines.append(f"- **Hook:** {r['hook']}")
        lines.append(f"- **Body:** {r['body']}")
        lines.append(f"- **CTA:** {r['cta']}")
        lines.append(f"- _source: {r['source_title']}_")

    # Carousels
    lines.append("\n## Carousel Outlines (Top 10)\n")
    for i, c in enumerate(m["carousels_bank"][:10], 1):
        lines.append(f"\n### Carousel {i}: {c['title']}\n")
        for s in c["slides"]:
            lines.append(f"- **Slide {s['slide']} — {s['headline']}**: {s['content']}")
        lines.append(f"\n_source: {c['source_title']}_")

    # Key learnings
    lines.append("\n## Key Learnings Library (Top 30)\n")
    for i, kl in enumerate(m["key_learnings_bank"][:30], 1):
        lines.append(f"{i}. {kl['text']}  \n   _source: {kl['source_title']}_")

    # Repurpose ideas
    lines.append("\n## Repurpose Ideas (Top 25)\n")
    for i, rp in enumerate(m["repurpose_bank"][:25], 1):
        lines.append(f"{i}. {rp['idea']}  \n   _source: {rp['source_title']}_")

    # Weekly structure
    lines.append("\n## Recommended Weekly Posting Structure\n")
    lines.append("| Day | Format | Notes |")
    lines.append("|---|---|---|")
    for w in m["weekly_structure"]:
        lines.append(f"| {w['day']} | {w['format']} | {w['notes']} |")

    # 30-day schedule
    lines.append("\n## 30-Day Posting Schedule (Auto-Generated)\n")
    lines.append("| Day | Format | Title / Notes | Hook |")
    lines.append("|---|---|---|---|")
    for d in m["schedule_30_day"]:
        if d.get("format") in ("Reel", "Carousel"):
            title = d.get("title", "") or ""
            hook = (d.get("hook") or "")[:140].replace("|", "/")
            lines.append(f"| {d['day']} | {d['format']} | {title[:80]} | {hook} |")
        else:
            lines.append(f"| {d['day']} | {d['format']} | {d.get('notes','')} | — |")

    # Per-video appendix
    lines.append("\n## Appendix: Per-Video Index\n")
    lines.append("| # | Title | Duration (s) | Hooks | Reels | Learnings |")
    lines.append("|---|---|---|---|---|---|")
    for i, v in enumerate(m["per_video_index"], 1):
        t = (v["title"] or "")[:70].replace("|", "/")
        lines.append(
            f"| {i} | {t} | {v['duration_sec']} | "
            f"{v['hooks_count']} | {v['reel_scripts_count']} | {v['key_learnings_count']} |"
        )

    lines.append("\n---\n")
    lines.append("_Regenerate at any time with:_ `cd /app/backend && python3 generate_master_plan.py`\n")

    return "\n".join(lines)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("🔎 Aggregating Skool intelligence from MongoDB...")
    master = aggregate()
    s = master["stats"]
    print(
        f"✅ Loaded {s['total_videos']} videos → "
        f"{s['unique_hooks']} hooks, "
        f"{s['unique_reel_scripts']} reel scripts, "
        f"{s['carousel_outlines']} carousels."
    )

    print(f"📝 Writing Markdown → {MD_OUT}")
    with open(MD_OUT, "w", encoding="utf-8") as f:
        f.write(render_markdown(master))

    print(f"🧾 Writing JSON → {JSON_OUT}")
    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=2, default=str)

    # Quick verification
    md_size = os.path.getsize(MD_OUT)
    json_size = os.path.getsize(JSON_OUT)
    print(f"\n✅ Done.")
    print(f"   {MD_OUT}  ({md_size:,} bytes)")
    print(f"   {JSON_OUT}  ({json_size:,} bytes)")


if __name__ == "__main__":
    main()
