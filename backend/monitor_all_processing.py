#!/usr/bin/env python3
"""
Monitor ALL video processing (Download → Transcribe → Analyze)
"""
import os
import time
from pymongo import MongoClient

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

def clear_screen():
    print("\033[2J\033[H", end="")

def get_comprehensive_status():
    # Download jobs
    total_jobs = db.download_jobs.count_documents({})
    dl_complete = db.download_jobs.count_documents({'status': 'complete'})
    dl_downloading = db.download_jobs.count_documents({'status': 'downloading'})
    dl_uploading = db.download_jobs.count_documents({'status': 'uploading'})
    dl_queued = db.download_jobs.count_documents({'status': 'queued'})
    dl_failed = db.download_jobs.count_documents({'status': 'failed'})
    
    # Media library
    total_media = db.media_library.count_documents({})
    trans_complete = db.media_library.count_documents({'transcription_status': 'complete'})
    trans_running = db.media_library.count_documents({'transcription_status': 'running'})
    trans_pending = db.media_library.count_documents({'transcription_status': 'pending'})
    trans_failed = db.media_library.count_documents({'transcription_status': 'failed'})
    
    intel_complete = db.media_library.count_documents({'intelligence_status': 'complete'})
    intel_running = db.media_library.count_documents({'intelligence_status': 'running'})
    intel_queued = db.media_library.count_documents({'intelligence_status': 'queued'})
    intel_pending = db.media_library.count_documents({'intelligence_status': 'pending'})
    
    return {
        'downloads': {
            'total': total_jobs,
            'complete': dl_complete,
            'downloading': dl_downloading,
            'uploading': dl_uploading,
            'queued': dl_queued,
            'failed': dl_failed
        },
        'media': {
            'total': total_media,
            'transcription': {
                'complete': trans_complete,
                'running': trans_running,
                'pending': trans_pending,
                'failed': trans_failed
            },
            'intelligence': {
                'complete': intel_complete,
                'running': intel_running,
                'queued': intel_queued,
                'pending': intel_pending
            }
        }
    }

def draw_progress_bar(current, total, width=50):
    if total == 0:
        return '░' * width + ' 0%'
    progress = current / total
    filled = int(width * progress)
    bar = '█' * filled + '░' * (width - filled)
    return f"{bar} {progress*100:.0f}%"

def display_status(stats):
    clear_screen()
    print(f"\n{'='*90}")
    print(f"🎬 COMPLETE VIDEO PROCESSING PIPELINE - Live Monitor")
    print(f"{'='*90}\n")
    
    dl = stats['downloads']
    media = stats['media']
    
    # PHASE 1: Downloads
    print(f"📥 PHASE 1: DOWNLOAD & UPLOAD TO DROPBOX")
    print(f"   Total jobs: {dl['total']}")
    print(f"   ✅ Complete:     {dl['complete']:3d}/{dl['total']}")
    print(f"   📥 Downloading:  {dl['downloading']:3d}")
    print(f"   ☁️  Uploading:    {dl['uploading']:3d}")
    print(f"   ⏳ Queued:       {dl['queued']:3d}")
    print(f"   ❌ Failed:       {dl['failed']:3d}")
    print(f"   {draw_progress_bar(dl['complete'], dl['total'])}")
    print()
    
    # PHASE 2: Transcription
    t = media['transcription']
    print(f"🎤 PHASE 2: TRANSCRIPTION (faster-whisper)")
    print(f"   Total videos: {media['total']}")
    print(f"   ✅ Complete:  {t['complete']:3d}/{media['total']}")
    print(f"   🔄 Running:   {t['running']:3d}")
    print(f"   ⏳ Pending:   {t['pending']:3d}")
    print(f"   ❌ Failed:    {t['failed']:3d}")
    print(f"   {draw_progress_bar(t['complete'], media['total'] if media['total'] > 0 else 1)}")
    print()
    
    # PHASE 3: AI Analysis
    i = media['intelligence']
    print(f"🧠 PHASE 3: AI INTELLIGENCE (Emergent LLM)")
    print(f"   Total videos: {media['total']}")
    print(f"   ✅ Complete:  {i['complete']:3d}/{media['total']}")
    print(f"   🔄 Running:   {i['running']:3d}")
    print(f"   📋 Queued:    {i['queued']:3d}")
    print(f"   ⏳ Pending:   {i['pending']:3d}")
    print(f"   {draw_progress_bar(i['complete'], media['total'] if media['total'] > 0 else 1)}")
    print()
    
    # Overall pipeline progress
    print(f"{'='*90}")
    print(f"📊 OVERALL PIPELINE PROGRESS")
    
    if dl['total'] > 0:
        fully_processed = i['complete']
        total_expected = dl['total']
        overall_progress = fully_processed / total_expected
        
        print(f"   Videos fully processed (all 3 phases): {fully_processed}/{total_expected}")
        print(f"   {draw_progress_bar(fully_processed, total_expected, width=70)}")
    else:
        print(f"   No jobs in system")
    
    print(f"\n{'='*90}")
    print(f"Press Ctrl+C to stop monitoring")
    print(f"Last update: {time.strftime('%H:%M:%S')}")
    print()

if __name__ == '__main__':
    try:
        while True:
            stats = get_comprehensive_status()
            display_status(stats)
            
            # Check if everything is complete
            dl = stats['downloads']
            media = stats['media']
            
            if (dl['total'] > 0 and 
                dl['complete'] == dl['total'] and 
                media['intelligence']['complete'] == media['total']):
                print("\n🎉 ALL VIDEOS FULLY PROCESSED!\n")
                print("📊 Final Summary:")
                print(f"   Total videos downloaded: {dl['complete']}")
                print(f"   Total transcribed: {media['transcription']['complete']}")
                print(f"   Total AI analyzed: {media['intelligence']['complete']}")
                print()
                break
            
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n\n👋 Monitoring stopped\n")
