#!/usr/bin/env python3
"""
Requeue All Unprocessed Download Jobs
Processes queued and failed download jobs through Celery
"""
import os
from pymongo import MongoClient
from celery_tasks import download_video

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

def requeue_downloads():
    """Find all unprocessed downloads and requeue them via Celery"""
    
    # Find queued and failed jobs
    unprocessed = list(db.download_jobs.find({
        'status': {'$in': ['queued', 'failed']}
    }).sort('created_at', 1))
    
    print(f"\n{'='*80}")
    print(f"🔄 REQUEUING {len(unprocessed)} UNPROCESSED DOWNLOAD JOBS")
    print(f"{'='*80}\n")
    
    # Group by status
    queued = [j for j in unprocessed if j.get('status') == 'queued']
    failed = [j for j in unprocessed if j.get('status') == 'failed']
    
    print(f"📊 Breakdown:")
    print(f"   Queued (never processed): {len(queued)}")
    print(f"   Failed (needs retry): {len(failed)}")
    print()
    
    requeued = 0
    skipped = 0
    
    for job in unprocessed:
        job_id = job.get('job_id')
        url = job.get('url')
        source = job.get('source', 'skool')
        title = job.get('title', 'Unknown')[:60]
        
        if not job_id or not url:
            print(f"⚠️  Skipping {title} - missing job_id or url")
            skipped += 1
            continue
        
        # Build options from job data
        options = job.get('options', {})
        
        # Default to transcribe=True and analyze=True for all Skool videos
        if source == 'skool':
            options['transcribe'] = True
            options['analyze'] = True
        
        # Reset job status to processing
        db.download_jobs.update_one(
            {'job_id': job_id},
            {
                '$set': {
                    'status': 'queued',
                    'error': None,
                    'progress': 0
                }
            }
        )
        
        # Queue download task
        try:
            download_video.delay(job_id, url, source, options)
            print(f"✅ Requeued: {title}")
            requeued += 1
        except Exception as e:
            print(f"❌ Failed to requeue {title}: {e}")
            skipped += 1
    
    print(f"\n{'='*80}")
    print(f"✅ Successfully requeued {requeued}/{len(unprocessed)} jobs")
    if skipped > 0:
        print(f"⚠️  Skipped {skipped} jobs (missing data)")
    print(f"{'='*80}\n")
    
    print("📊 Monitor progress:")
    print("   python monitor_all_processing.py")
    print("\n💡 Check Celery worker:")
    print("   tail -f /var/log/supervisor/celery.out.log")
    print("\n⚙️  Check status:")
    print("   python -c 'from requeue_all_downloads import check_status; check_status()'")
    print()

def check_status():
    """Check current download processing status"""
    
    total_jobs = db.download_jobs.count_documents({})
    complete = db.download_jobs.count_documents({'status': 'complete'})
    downloading = db.download_jobs.count_documents({'status': 'downloading'})
    uploading = db.download_jobs.count_documents({'status': 'uploading'})
    queued = db.download_jobs.count_documents({'status': 'queued'})
    failed = db.download_jobs.count_documents({'status': 'failed'})
    
    print(f"\n📥 DOWNLOAD STATUS:")
    print(f"   Total jobs: {total_jobs}")
    print(f"   ✅ Complete: {complete}")
    print(f"   📥 Downloading: {downloading}")
    print(f"   ☁️  Uploading: {uploading}")
    print(f"   ⏳ Queued: {queued}")
    print(f"   ❌ Failed: {failed}")
    print()
    
    # Media library stats
    total_media = db.media_library.count_documents({})
    transcribed = db.media_library.count_documents({'transcription_status': 'complete'})
    with_intel = db.media_library.count_documents({'intelligence_status': 'complete'})
    
    print(f"📚 MEDIA LIBRARY:")
    print(f"   Total videos: {total_media}")
    print(f"   🎤 Transcribed: {transcribed}")
    print(f"   🧠 AI analyzed: {with_intel}")
    print()

if __name__ == '__main__':
    requeue_downloads()
