#!/usr/bin/env python3
"""
Controlled transcription queue manager
Processes videos in small batches to prevent system overload
"""
import sys
import os
import time
sys.path.insert(0, '/app/backend')

from pymongo import MongoClient
from celery_tasks import transcribe_video

# Connect to MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

# Configuration
MAX_CONCURRENT = 2  # Maximum number of transcriptions running simultaneously
BATCH_SIZE = 1       # How many to add when slot opens (1 at a time for smooth flow)
CHECK_INTERVAL = 10  # Seconds between checks

def get_queue_status():
    """Get current transcription queue status"""
    running = db.media_library.count_documents({"transcription_status": "running"})
    pending = list(db.media_library.find(
        {"transcription_status": "pending"},
        {"item_id": 1, "title": 1, "source_url": 1}
    ).limit(50))
    
    return running, pending

def queue_next_batch(batch_size):
    """Queue next batch of transcriptions"""
    pending_items = list(db.media_library.find(
        {"transcription_status": "pending"},
        {"item_id": 1, "title": 1, "source_url": 1}
    ).limit(batch_size))
    
    queued = 0
    for item in pending_items:
        item_id = item['item_id']
        source_url = item.get('source_url', '')
        
        if not source_url:
            print(f"  ⚠️  Skipping {item_id[:8]} - no source URL")
            continue
        
        # Mark as running to prevent duplicate queuing
        db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {"transcription_status": "running"}}
        )
        
        # Queue Celery task
        transcribe_video.delay(item_id, source_url)
        queued += 1
        print(f"  ✅ Queued: {item.get('title', 'Unknown')[:50]}")
    
    return queued

def main():
    print("🎬 Controlled Transcription Queue Manager")
    print("=" * 60)
    print(f"⚙️  Config: MAX_CONCURRENT={MAX_CONCURRENT}, BATCH_SIZE={BATCH_SIZE}")
    print()
    
    # First, check current status
    running, pending = get_queue_status()
    total_pending = len(pending)
    
    print(f"📊 Current Status:")
    print(f"   🔄 Running: {running}")
    print(f"   ⏳ Pending: {total_pending}")
    print()
    
    if total_pending == 0:
        print("✅ No pending transcriptions. All done!")
        return
    
    # Initial queue
    if running < MAX_CONCURRENT:
        to_queue = min(BATCH_SIZE, MAX_CONCURRENT - running)
        print(f"🚀 Queueing initial batch of {to_queue}...")
        queued = queue_next_batch(to_queue)
        print(f"   ✅ Queued {queued} tasks")
        print()
    
    # Monitor and queue more as tasks complete
    print("👀 Monitoring queue (Ctrl+C to stop)...")
    print()
    
    try:
        last_running = running
        while True:
            time.sleep(CHECK_INTERVAL)
            
            running, pending = get_queue_status()
            total_pending = len(pending)
            
            # Print status
            print(f"\r⏱️  {time.strftime('%H:%M:%S')} | "
                  f"🔄 Running: {running} | "
                  f"⏳ Pending: {total_pending}", 
                  end='', flush=True)
            
            # If running count decreased, queue more
            if running < last_running and total_pending > 0:
                print()  # New line for queue action
                slots_available = MAX_CONCURRENT - running
                to_queue = min(slots_available, BATCH_SIZE)
                
                if to_queue > 0:
                    print(f"🔄 Task completed. Queueing {to_queue} more...")
                    queued = queue_next_batch(to_queue)
                    if queued > 0:
                        print(f"   ✅ Queued {queued} tasks")
            
            last_running = running
            
            # Exit if all done
            if running == 0 and total_pending == 0:
                print("\n\n🎉 All transcriptions complete!")
                break
                
    except KeyboardInterrupt:
        print("\n\n⏸️  Monitoring stopped. Tasks will continue in background.")
        print(f"   Current status: {running} running, {total_pending} pending")

if __name__ == "__main__":
    main()
