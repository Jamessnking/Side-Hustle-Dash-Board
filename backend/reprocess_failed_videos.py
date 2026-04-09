"""
Reprocess Failed Videos
Requeue transcription for all videos that failed due to ffmpeg issues
"""
import os
from pymongo import MongoClient
from celery_tasks import transcribe_video

# Connect to MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

def reprocess_failed_videos():
    """Find all failed videos and requeue them for transcription"""
    
    # Find all videos with failed transcription
    failed_videos = list(db.media_library.find({
        'transcription_status': 'failed'
    }))
    
    print(f"\n{'='*80}")
    print(f"🔄 REPROCESSING {len(failed_videos)} FAILED VIDEOS")
    print(f"{'='*80}\n")
    
    requeued = 0
    
    for video in failed_videos:
        item_id = video.get('item_id')
        title = video.get('title', 'Unknown')
        source_url = video.get('source_url')
        
        if not item_id or not source_url:
            print(f"⚠️  Skipping {title} - missing item_id or source_url")
            continue
        
        # Reset status to pending
        db.media_library.update_one(
            {'item_id': item_id},
            {
                '$set': {
                    'transcription_status': 'pending',
                    'transcription_error': None
                }
            }
        )
        
        # Queue transcription task
        try:
            transcribe_video.delay(item_id, source_url)
            print(f"✅ Requeued: {title[:60]}")
            requeued += 1
        except Exception as e:
            print(f"❌ Failed to requeue {title[:60]}: {e}")
    
    print(f"\n{'='*80}")
    print(f"✅ Successfully requeued {requeued}/{len(failed_videos)} videos")
    print(f"{'='*80}\n")
    
    print("📊 Monitor progress:")
    print("   tail -f /var/log/supervisor/celery.out.log")
    print("\n💡 Check status:")
    print("   python -c 'from reprocess_failed_videos import check_status; check_status()'")
    print()

def check_status():
    """Check current processing status"""
    
    total = db.media_library.count_documents({})
    complete = db.media_library.count_documents({'transcription_status': 'complete'})
    failed = db.media_library.count_documents({'transcription_status': 'failed'})
    pending = db.media_library.count_documents({'transcription_status': 'pending'})
    running = db.media_library.count_documents({'transcription_status': 'running'})
    
    print(f"\n📊 TRANSCRIPTION STATUS:")
    print(f"   Total videos: {total}")
    print(f"   ✅ Complete: {complete}")
    print(f"   🔄 Running: {running}")
    print(f"   ⏳ Pending: {pending}")
    print(f"   ❌ Failed: {failed}")
    print()
    
    # Check intelligence status
    intel_complete = db.media_library.count_documents({'intelligence_status': 'complete'})
    intel_pending = db.media_library.count_documents({'intelligence_status': 'pending'})
    intel_running = db.media_library.count_documents({'intelligence_status': 'running'})
    
    print(f"🧠 AI INTELLIGENCE STATUS:")
    print(f"   ✅ Complete: {intel_complete}")
    print(f"   🔄 Running: {intel_running}")
    print(f"   ⏳ Pending: {intel_pending}")
    print()

if __name__ == '__main__':
    reprocess_failed_videos()
