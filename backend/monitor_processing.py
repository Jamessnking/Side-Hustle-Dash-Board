#!/usr/bin/env python3
"""
Monitor video processing status in real-time
"""
import os
import time
from pymongo import MongoClient

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

def clear_screen():
    print("\033[2J\033[H", end="")

def get_status():
    total = db.media_library.count_documents({})
    
    # Transcription stats
    trans_complete = db.media_library.count_documents({'transcription_status': 'complete'})
    trans_running = db.media_library.count_documents({'transcription_status': 'running'})
    trans_pending = db.media_library.count_documents({'transcription_status': 'pending'})
    trans_failed = db.media_library.count_documents({'transcription_status': 'failed'})
    
    # Intelligence stats
    intel_complete = db.media_library.count_documents({'intelligence_status': 'complete'})
    intel_running = db.media_library.count_documents({'intelligence_status': 'running'})
    intel_queued = db.media_library.count_documents({'intelligence_status': 'queued'})
    intel_pending = db.media_library.count_documents({'intelligence_status': 'pending'})
    
    return {
        'total': total,
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

def display_status(stats):
    clear_screen()
    print(f"\n{'='*80}")
    print(f"📊 VIDEO PROCESSING STATUS - Live Monitor")
    print(f"{'='*80}\n")
    
    print(f"🎬 Total Videos: {stats['total']}")
    print()
    
    t = stats['transcription']
    print(f"🎤 TRANSCRIPTION:")
    print(f"   ✅ Complete:  {t['complete']:2d}/{stats['total']} ({t['complete']/stats['total']*100:.0f}%)")
    print(f"   🔄 Running:   {t['running']:2d}")
    print(f"   ⏳ Pending:   {t['pending']:2d}")
    print(f"   ❌ Failed:    {t['failed']:2d}")
    
    # Progress bar
    progress = t['complete'] / stats['total']
    bar_length = 50
    filled = int(bar_length * progress)
    bar = '█' * filled + '░' * (bar_length - filled)
    print(f"   Progress: [{bar}] {progress*100:.0f}%")
    print()
    
    i = stats['intelligence']
    print(f"🧠 AI INTELLIGENCE:")
    print(f"   ✅ Complete:  {i['complete']:2d}/{stats['total']} ({i['complete']/stats['total']*100:.0f}%)")
    print(f"   🔄 Running:   {i['running']:2d}")
    print(f"   📋 Queued:    {i['queued']:2d}")
    print(f"   ⏳ Pending:   {i['pending']:2d}")
    
    # Progress bar
    progress_i = i['complete'] / stats['total']
    filled_i = int(bar_length * progress_i)
    bar_i = '█' * filled_i + '░' * (bar_length - filled_i)
    print(f"   Progress: [{bar_i}] {progress_i*100:.0f}%")
    print()
    
    print(f"{'='*80}")
    print(f"Press Ctrl+C to stop monitoring")
    print(f"Last update: {time.strftime('%H:%M:%S')}")
    print()

if __name__ == '__main__':
    try:
        while True:
            stats = get_status()
            display_status(stats)
            
            # Check if all processing is complete
            if (stats['transcription']['complete'] == stats['total'] and 
                stats['intelligence']['complete'] == stats['total']):
                print("\n🎉 ALL VIDEOS PROCESSED SUCCESSFULLY!\n")
                break
            
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n\n👋 Monitoring stopped\n")
