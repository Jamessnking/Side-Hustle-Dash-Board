#!/usr/bin/env python3
"""
Persistent Job Worker
Processes queued jobs and pending transcriptions/analysis
Runs independently of the web server
"""

import os
import sys
import asyncio
import time
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Will call functions directly without importing
# (to avoid circular dependencies)

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

async def process_pending_transcriptions():
    """Process videos that need transcription"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.ultimate_deployment
    
    # Find videos needing transcription
    items = await db.media_library.find({
        "transcription_status": "pending"
    }).limit(5).to_list(5)
    
    for item in items:
        item_id = item['item_id']
        source_url = item.get('source_url', item.get('dropbox_link', ''))
        
        print(f"📝 Transcribing: {item.get('title')}")
        
        # Mark as running
        await db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {"transcription_status": "running"}}
        )
        
        try:
            await run_transcription(item_id, source_url)
            print(f"  ✅ Transcription complete")
        except Exception as e:
            print(f"  ❌ Transcription failed: {e}")
            await db.media_library.update_one(
                {"item_id": item_id},
                {"$set": {"transcription_status": "failed"}}
            )
    
    client.close()

async def process_pending_intelligence():
    """Process videos that need AI analysis"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.ultimate_deployment
    
    # Find videos with transcript but no intelligence
    items = await db.media_library.find({
        "transcription_status": "complete",
        "intelligence_status": "pending"
    }).limit(5).to_list(5)
    
    for item in items:
        item_id = item['item_id']
        transcript = item.get('transcript', {})
        transcript_text = transcript.get('full_text', '')
        
        if not transcript_text:
            continue
        
        print(f"🧠 Analyzing: {item.get('title')}")
        
        # Mark as running
        await db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {"intelligence_status": "running"}}
        )
        
        try:
            await run_intelligence(
                item_id,
                transcript_text,
                item.get('title', ''),
                item.get('source', ''),
                item.get('description', ''),
                item.get('resource_links', [])
            )
            print(f"  ✅ AI analysis complete")
        except Exception as e:
            print(f"  ❌ AI analysis failed: {e}")
            await db.media_library.update_one(
                {"item_id": item_id},
                {"$set": {"intelligence_status": "failed"}}
            )
    
    client.close()

async def main_loop():
    """Main worker loop"""
    print("🚀 JOB WORKER STARTED")
    print("="*60)
    
    iteration = 0
    
    while True:
        iteration += 1
        print(f"\n⏰ Worker iteration #{iteration} - {datetime.now().strftime('%H:%M:%S')}")
        
        try:
            # Process transcriptions
            await process_pending_transcriptions()
            
            # Process AI intelligence
            await process_pending_intelligence()
            
        except Exception as e:
            print(f"❌ Worker error: {e}")
        
        # Wait before next iteration
        print("  ⏳ Waiting 30 seconds...")
        await asyncio.sleep(30)

if __name__ == "__main__":
    asyncio.run(main_loop())
