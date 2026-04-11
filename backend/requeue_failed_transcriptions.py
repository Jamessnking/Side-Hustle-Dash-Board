#!/usr/bin/env python3
"""
Requeue all failed transcription tasks after ffmpeg installation
"""
import sys
import os
sys.path.insert(0, '/app/backend')

from pymongo import MongoClient
from celery_tasks import transcribe_video

# Connect to MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

print("🔍 Finding failed transcriptions...")

# Find all media items with failed transcription
failed_items = list(db.media_library.find({
    "transcription_status": "failed"
}))

print(f"📊 Found {len(failed_items)} failed transcription tasks")

if not failed_items:
    print("✅ No failed transcriptions to requeue!")
    sys.exit(0)

print("\n🔄 Requeuing transcription tasks...")

# Reset status and requeue
requeued = 0
for item in failed_items:
    item_id = item['item_id']
    source_url = item.get('source_url', '')
    
    if not source_url:
        print(f"  ⚠️  Skipping {item_id[:8]} - no source URL")
        continue
    
    # Reset status to pending
    db.media_library.update_one(
        {"item_id": item_id},
        {"$set": {
            "transcription_status": "pending",
            "transcription_error": None
        }}
    )
    
    # Queue Celery task
    transcribe_video.delay(item_id, source_url)
    requeued += 1
    print(f"  ✅ Requeued: {item.get('title', 'Unknown')[:50]}")

print(f"\n🎉 Successfully requeued {requeued}/{len(failed_items)} transcription tasks!")
print(f"📊 Tasks will now process automatically with ffmpeg installed.")
print(f"⏱️  Monitor progress at: /api/library/stats/overview")
