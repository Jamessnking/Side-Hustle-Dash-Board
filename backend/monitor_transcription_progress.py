#!/usr/bin/env python3
"""
Real-time transcription progress monitor
"""
import sys
import os
import time
sys.path.insert(0, '/app/backend')

from pymongo import MongoClient

# Connect to MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

def get_stats():
    """Get current transcription statistics"""
    total = db.media_library.count_documents({})
    
    transcribed = db.media_library.count_documents({
        "transcription_status": "complete"
    })
    
    running = db.media_library.count_documents({
        "transcription_status": "running"
    })
    
    pending = db.media_library.count_documents({
        "transcription_status": "pending"
    })
    
    failed = db.media_library.count_documents({
        "transcription_status": "failed"
    })
    
    analyzed = db.media_library.count_documents({
        "intelligence_status": "complete"
    })
    
    return {
        "total": total,
        "transcribed": transcribed,
        "running": running,
        "pending": pending,
        "failed": failed,
        "analyzed": analyzed
    }

def main():
    print("🎬 Transcription Progress Monitor")
    print("=" * 60)
    print()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--watch":
        print("📊 Live monitoring mode (Ctrl+C to stop)...")
        print()
        try:
            while True:
                stats = get_stats()
                progress_pct = (stats['transcribed'] / stats['total'] * 100) if stats['total'] > 0 else 0
                
                print(f"\r⏱️  {time.strftime('%H:%M:%S')} | "
                      f"✅ {stats['transcribed']}/{stats['total']} ({progress_pct:.1f}%) | "
                      f"🔄 Running: {stats['running']} | "
                      f"⏳ Pending: {stats['pending']} | "
                      f"❌ Failed: {stats['failed']} | "
                      f"🧠 Analyzed: {stats['analyzed']}", 
                      end='', flush=True)
                time.sleep(3)
        except KeyboardInterrupt:
            print("\n\n✅ Monitoring stopped.")
    else:
        stats = get_stats()
        progress_pct = (stats['transcribed'] / stats['total'] * 100) if stats['total'] > 0 else 0
        
        print(f"📊 Total videos:        {stats['total']}")
        print(f"✅ Transcribed:         {stats['transcribed']} ({progress_pct:.1f}%)")
        print(f"🔄 Currently running:   {stats['running']}")
        print(f"⏳ Pending:             {stats['pending']}")
        print(f"❌ Failed:              {stats['failed']}")
        print(f"🧠 AI Analyzed:         {stats['analyzed']}")
        print()
        
        if stats['running'] > 0 or stats['pending'] > 0:
            print("💡 Tip: Run with --watch flag for live monitoring")
            print("   Example: python3 monitor_transcription_progress.py --watch")

if __name__ == "__main__":
    main()
