# OpenClaw API Integration Guide

## 🎯 Your Deployment API Endpoints

### **Base URL:**
```
https://workflow-nexus-hub.preview.emergentagent.com
```

### **1. Submit Scraped Data (Main Endpoint)**
```
POST https://workflow-nexus-hub.preview.emergentagent.com/api/openclaw/submit
```

**What it does:**
- Receives scraped Skool lesson data from OpenClaw
- Automatically stores in database
- Queues AI analysis for each lesson
- Returns confirmation and stats

### **2. Check Processing Status**
```
GET https://workflow-nexus-hub.preview.emergentagent.com/api/openclaw/status
```

**What it does:**
- Shows how many lessons are ingested
- Analysis progress (pending/running/complete)
- Completion percentage

---

## 📝 How to Give This to OpenClaw

### **Via WhatsApp (Once Connected):**

Send this task to OpenClaw:

```
Task: Scrape Skool classroom lessons and submit to API

Target: [Your Skool community URL or specific lesson URLs]

For each lesson, extract:
- Lesson URL (the Skool page URL)
- Title
- Full text description/content
- Comments (if any)
- Embedded resources/links
- Any metadata (date, category, tags)
- Video URL (Loom link if embedded)

Important: Structure as JSON and POST to this API:

Endpoint: https://workflow-nexus-hub.preview.emergentagent.com/api/openclaw/submit

Method: POST

Headers:
Content-Type: application/json

Body format:
{
  "lessons": [
    {
      "url": "https://www.skool.com/classroom/lesson-url",
      "title": "Lesson title here",
      "description": "Full lesson text content here...",
      "video_url": "https://www.loom.com/... (if present)",
      "comments": [
        {"author": "User Name", "text": "Comment text", "date": "2026-04-10"}
      ],
      "resources": [
        {"title": "Resource name", "url": "https://..."}
      ],
      "metadata": {
        "category": "Marketing",
        "posted_date": "2026-03-15"
      }
    }
  ],
  "source": "openclaw_skool"
}

After POSTing to the API, report back with the API response showing how many lessons were ingested.
```

---

## 🔄 Workflow (What Happens Automatically)

**1. OpenClaw scrapes Skool** → Extracts lesson data

**2. OpenClaw POSTs to your API** → `https://workflow-nexus-hub.preview.emergentagent.com/api/openclaw/submit`

**3. Your API receives data** → Stores in `skool_text_content` collection

**4. Celery automatically queues AI analysis** → Each lesson gets analyzed for Instagram strategy insights

**5. Results available** → Combined with video insights in your database

**You do NOTHING manually!** 🎉

---

## ✅ Verification Commands

### **Check if API is working:**
```bash
curl https://workflow-nexus-hub.preview.emergentagent.com/api/openclaw/status
```

**Expected response:**
```json
{
  "total_lessons": 0,
  "analysis_status": {
    "pending": 0,
    "running": 0,
    "complete": 0,
    "failed": 0
  },
  "completion_percentage": 0
}
```

### **After OpenClaw submits data:**
```bash
curl https://workflow-nexus-hub.preview.emergentagent.com/api/openclaw/status
```

**You'll see:**
```json
{
  "total_lessons": 25,
  "analysis_status": {
    "pending": 20,
    "running": 2,
    "complete": 3,
    "failed": 0
  },
  "completion_percentage": 12.0
}
```

---

## 🎯 Priority URLs for OpenClaw

If scraping specific lessons, prioritize these topics:
- Instagram growth strategies
- Viral content creation
- Content hooks and storytelling
- Social media marketing
- Video editing and production
- Engagement tactics

---

## 💡 Testing the API

### **Manual test (optional):**

You can test by sending sample data:

```bash
curl -X POST https://workflow-nexus-hub.preview.emergentagent.com/api/openclaw/submit \
  -H "Content-Type: application/json" \
  -d '{
    "lessons": [
      {
        "url": "https://www.skool.com/test-lesson",
        "title": "Test Lesson",
        "description": "This is a test lesson to verify the API works.",
        "comments": [],
        "resources": [],
        "metadata": {}
      }
    ]
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "OpenClaw data received and processed",
  "summary": {
    "total_submitted": 1,
    "new_lessons": 1,
    "updated_lessons": 0,
    "queued_for_analysis": 1,
    "errors": []
  }
}
```

---

## 🚀 Next Steps

1. **Connect OpenClaw via WhatsApp** (if not done)
2. **Get your Skool community URL** or specific lesson URLs
3. **Send the task** (from the template above) to OpenClaw via WhatsApp
4. **OpenClaw autonomously scrapes and POSTs** to your API
5. **Monitor progress:** Check `/api/openclaw/status` or use the monitoring script
6. **AI analysis runs automatically** in the background

**You just wait for OpenClaw to finish - everything else is automated!** ✨

---

## 📊 Monitor Processing

Once OpenClaw submits data, monitor with:

```bash
# Check status
curl https://workflow-nexus-hub.preview.emergentagent.com/api/openclaw/status

# Or from backend
cd /app/backend
python -c "
from pymongo import MongoClient
import os
client = MongoClient(os.getenv('MONGO_URL'))
db = client.ultimate_deployment
complete = db.skool_text_content.count_documents({'intelligence_status': 'complete'})
total = db.skool_text_content.count_documents({})
print(f'Text analysis: {complete}/{total} complete')
"
```
