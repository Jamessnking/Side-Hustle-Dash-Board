# OpenClaw Task: Skool Classroom Text Scraping

## 🎯 OBJECTIVE
Scrape text content from Skool classroom lessons to complement the video content we're processing.

## 📋 WHAT TO SCRAPE

From each Skool lesson page, extract:

1. **Lesson Title** - The main heading
2. **Lesson Description** - Full text content/body of the lesson
3. **Comments/Discussions** - Any community comments on the lesson
4. **Resources/Links** - Any embedded links, resources, or references
5. **Instructor Notes** - Any additional notes or context provided
6. **Metadata** - Lesson category, tags, date posted

## 📝 WHATSAPP COMMAND FOR OPENCLAW

Once your WhatsApp is connected to OpenClaw, send this task:

```
Task: Scrape Skool classroom lessons

URLs: [Paste your Skool classroom lesson URLs here - the actual classroom pages, not the Loom video links]

For each lesson page, extract:
1. Lesson title
2. Full lesson description/text content
3. Any comments or discussions
4. All embedded links and resources
5. Instructor notes
6. Metadata (category, date, tags)

Output format: JSON file with structured data
Include: URL, title, description, comments[], resources[], metadata{}

Save output as: skool_text_content.json
```

## 🔗 HOW TO GET SKOOL CLASSROOM URLs

Since we only have Loom video URLs, you need to:

1. Go to your Skool classroom
2. Navigate to each lesson/module
3. Copy the Skool page URL (e.g., `https://www.skool.com/your-community/classroom/...`)
4. These are the URLs OpenClaw needs to scrape

## 📊 EXPECTED OUTPUT FORMAT

OpenClaw should return JSON like this:

```json
{
  "lessons": [
    {
      "url": "https://www.skool.com/...",
      "title": "Lesson Title",
      "description": "Full lesson text content here...",
      "video_url": "https://www.loom.com/...",
      "comments": [
        {
          "author": "User Name",
          "text": "Comment text",
          "date": "2026-04-10"
        }
      ],
      "resources": [
        {
          "title": "Resource name",
          "url": "https://..."
        }
      ],
      "metadata": {
        "category": "Marketing",
        "tags": ["instagram", "growth"],
        "posted_date": "2026-03-15"
      }
    }
  ]
}
```

## 🔄 ONCE OPENCLAW COMPLETES

1. Download the JSON file from OpenClaw
2. Upload it to this project at: `/app/backend/skool_text_content.json`
3. Run the ingestion script: `python ingest_openclaw_data.py`
4. Text content will be analyzed with AI (same as videos)
5. Insights combined with video learning for Instagram strategy

## 💡 ALTERNATIVE: If you don't have Skool classroom URLs

If the videos were scraped from a different source and you don't have the original Skool classroom URLs:

**Option A:** Use the Skool community URL
- Give OpenClaw your Skool community homepage
- Ask it to: "Navigate to classroom, list all lessons, and scrape text from each"

**Option B:** Manual approach
- You provide 5-10 example Skool lesson URLs
- We analyze those for now
- Complete classroom scraping later

## ⚡ PRIORITY LESSONS

If you want to start small, focus on Instagram/content strategy lessons first:
- Any lessons with "Instagram" in the title
- Lessons about viral content, growth strategies
- Content creation and editing guides
- Social media marketing fundamentals

These will give maximum value for building your Instagram Manager strategy.

---

**Next Steps:**
1. Get Skool classroom lesson URLs (not Loom video URLs)
2. Send task to OpenClaw via WhatsApp
3. Download OpenClaw's output JSON
4. Upload to this project
5. I'll create the ingestion script to process it
