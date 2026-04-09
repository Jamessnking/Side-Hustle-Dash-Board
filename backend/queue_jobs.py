#!/usr/bin/env python3
"""
Process all pending jobs using Celery workers
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from celery_tasks import transcribe_video, analyze_video

MONGO_URL = "mongodb://localhost:27017"

async def queue_pending_jobs():
    """Queue all pending transcriptions and analyses to Celery"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.ultimate_deployment
    
    print("🔄 QUEUING PENDING JOBS TO CELERY")
    print("="*60)
    
    # 1. Queue pending transcriptions
    print("\n1️⃣ Queueing transcriptions...")
    pending_transcribe = await db.media_library.find({
        "transcription_status": "pending"
    }).to_list(100)
    
    transcribe_queued = 0
    for item in pending_transcribe:
        item_id = item['item_id']
        source_url = item.get('source_url') or item.get('dropbox_link', '')
        
        if source_url:
            # Queue to Celery
            transcribe_video.delay(item_id, source_url)
            transcribe_queued += 1
            
            # Mark as queued in DB
            await db.media_library.update_one(
                {"item_id": item_id},
                {"$set": {"transcription_status": "queued"}}
            )
            
            if transcribe_queued <= 10:
                print(f"  ✅ Queued: {item.get('title')[:50]}")
    
    if transcribe_queued > 10:
        print(f"  ... and {transcribe_queued - 10} more")
    
    print(f"\n📊 Total transcriptions queued: {transcribe_queued}")
    
    # 2. Queue pending AI analyses
    print("\n2️⃣ Queueing AI analyses...")
    pending_analyze = await db.media_library.find({
        "transcription_status": "complete",
        "intelligence_status": "pending"
    }).to_list(100)
    
    analyze_queued = 0
    for item in pending_analyze:
        item_id = item['item_id']
        transcript = item.get('transcript', {})
        transcript_text = transcript.get('full_text', '')
        
        if transcript_text:
            # Queue to Celery
            analyze_video.delay(
                item_id,
                transcript_text,
                item.get('title', ''),
                item.get('source', ''),
                item.get('description', ''),
                item.get('resource_links', [])
            )
            analyze_queued += 1
            
            # Mark as queued
            await db.media_library.update_one(
                {"item_id": item_id},
                {"$set": {"intelligence_status": "queued"}}
            )
            
            if analyze_queued <= 10:
                print(f"  ✅ Queued: {item.get('title')[:50]}")
    
    if analyze_queued > 10:
        print(f"  ... and {analyze_queued - 10} more")
    
    print(f"\n📊 Total AI analyses queued: {analyze_queued}")
    
    print("\n" + "="*60)
    print(f"✅ TOTAL QUEUED: {transcribe_queued + analyze_queued} jobs")
    print("🔄 Celery workers will process these automatically")
    print("⏱️  Estimated completion: 6-10 hours")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(queue_pending_jobs())
