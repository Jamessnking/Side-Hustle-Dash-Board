#!/usr/bin/env python3
"""
STRICT 1-at-a-time transcription queue
Only queues next task after previous one COMPLETES
"""
import sys
import os
import time
sys.path.insert(0, '/app/backend')

from pymongo import MongoClient
from celery_tasks import transcribe_video

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

print("🎬 STRICT Single-Task Queue Manager")
print("=" * 60)
print("⚙️  Rule: ONE task at a time. Next queues ONLY after completion.")
print()

def get_status():
    """Get current status"""
    complete = db.media_library.count_documents({"transcription_status": "complete"})
    running = db.media_library.count_documents({"transcription_status": "running"})
    pending = db.media_library.count_documents({"transcription_status": "pending"})
    return complete, running, pending

def queue_next():
    """Queue exactly ONE pending task"""
    pending_item = db.media_library.find_one({"transcription_status": "pending"})
    
    if not pending_item:
        return None
    
    # Mark as running BEFORE queuing to prevent duplicates
    db.media_library.update_one(
        {"item_id": pending_item['item_id']},
        {"$set": {"transcription_status": "running"}}
    )
    
    # Queue task
    transcribe_video.delay(pending_item['item_id'], pending_item['source_url'])
    
    return pending_item

# Initial status
complete, running, pending = get_status()
print(f"📊 Starting Status:")
print(f"   ✅ Complete: {complete}/75")
print(f"   🔄 Running: {running}")
print(f"   ⏳ Pending: {pending}")
print()

# Queue first task if nothing running
if running == 0 and pending > 0:
    item = queue_next()
    if item:
        print(f"🚀 Queued first task: {item.get('title', 'Unknown')[:50]}")
        print()

# Monitor loop
print("👀 Monitoring (1 task at a time, Ctrl+C to stop)...")
print()

last_complete = complete
try:
    while True:
        time.sleep(10)
        
        complete, running, pending = get_status()
        
        # Print status
        print(f"\r⏱️  {time.strftime('%H:%M:%S')} | "
              f"✅ {complete}/75 | "
              f"🔄 Running: {running} | "
              f"⏳ Pending: {pending}", 
              end='', flush=True)
        
        # If task completed and more pending, queue next ONE
        if complete > last_complete and pending > 0 and running == 0:
            print()  # New line
            item = queue_next()
            if item:
                print(f"✅ Task completed! Queueing next: {item.get('title', 'Unknown')[:45]}")
            last_complete = complete
        
        # Exit if all done
        if running == 0 and pending == 0:
            print("\n\n🎉 ALL TASKS COMPLETE!")
            break
            
except KeyboardInterrupt:
    print("\n\n⏸️  Monitoring stopped. Current task will continue.")
    print(f"   Status: {complete} complete, {running} running, {pending} pending")
