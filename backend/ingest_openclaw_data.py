#!/usr/bin/env python3
"""
Ingest OpenClaw Scraped Text Content
Processes Skool lesson text data and runs AI analysis
"""
import os
import json
from pymongo import MongoClient
from datetime import datetime
import uuid

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

def ingest_openclaw_data(json_file_path='/app/backend/skool_text_content.json'):
    """Ingest OpenClaw scraped text content into database"""
    
    print(f"\n{'='*80}")
    print(f"📥 INGESTING OPENCLAW SKOOL TEXT CONTENT")
    print(f"{'='*80}\n")
    
    # Load OpenClaw output
    try:
        with open(json_file_path, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ File not found: {json_file_path}")
        print(f"\nPlease:")
        print(f"1. Download JSON from OpenClaw")
        print(f"2. Upload to: {json_file_path}")
        print(f"3. Run this script again\n")
        return
    
    lessons = data.get('lessons', [])
    print(f"📚 Found {len(lessons)} lessons to process\n")
    
    ingested = 0
    updated = 0
    analyzed = 0
    
    for lesson in lessons:
        url = lesson.get('url', '')
        title = lesson.get('title', 'Unknown')
        description = lesson.get('description', '')
        comments = lesson.get('comments', [])
        resources = lesson.get('resources', [])
        metadata = lesson.get('metadata', {})
        video_url = lesson.get('video_url', '')
        
        print(f"Processing: {title[:60]}")
        
        # Check if we already have this lesson
        existing = db.skool_text_content.find_one({'url': url})
        
        if existing:
            # Update existing
            db.skool_text_content.update_one(
                {'url': url},
                {'$set': {
                    'title': title,
                    'description': description,
                    'comments': comments,
                    'resources': resources,
                    'metadata': metadata,
                    'video_url': video_url,
                    'updated_at': datetime.utcnow()
                }}
            )
            print(f"  ✅ Updated existing lesson")
            updated += 1
            item_id = existing['item_id']
        else:
            # Create new
            item_id = str(uuid.uuid4())
            db.skool_text_content.insert_one({
                'item_id': item_id,
                'url': url,
                'title': title,
                'description': description,
                'comments': comments,
                'resources': resources,
                'metadata': metadata,
                'video_url': video_url,
                'text_intelligence': None,
                'intelligence_status': 'pending',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            print(f"  ✅ Created new lesson")
            ingested += 1
        
        # Queue AI analysis
        if description and len(description) > 50:
            # Build combined text for analysis
            combined_text = f"{title}\n\n{description}"
            
            # Add comments if available
            if comments:
                combined_text += "\n\nCOMMUNITY INSIGHTS:\n"
                for comment in comments[:5]:  # Top 5 comments
                    author = comment.get('author', 'Unknown')
                    text = comment.get('text', '')
                    combined_text += f"\n- {author}: {text}"
            
            # Add resources
            if resources:
                combined_text += "\n\nRESOURCES:\n"
                for resource in resources:
                    resource_title = resource.get('title', 'Link')
                    resource_url = resource.get('url', '')
                    combined_text += f"\n- {resource_title}: {resource_url}"
            
            # Queue for AI analysis
            from celery_tasks import analyze_text_content
            try:
                analyze_text_content.delay(item_id, combined_text, title, 'skool_text')
                print(f"  🧠 Queued for AI analysis")
                analyzed += 1
            except Exception as e:
                print(f"  ⚠️  Could not queue analysis: {e}")
    
    print(f"\n{'='*80}")
    print(f"✅ INGESTION COMPLETE")
    print(f"{'='*80}\n")
    print(f"📊 Summary:")
    print(f"   New lessons ingested: {ingested}")
    print(f"   Existing lessons updated: {updated}")
    print(f"   Queued for AI analysis: {analyzed}")
    print(f"\n💡 Monitor AI analysis:")
    print(f"   python monitor_text_analysis.py\n")
    print(f"{'='*80}\n")

if __name__ == '__main__':
    ingest_openclaw_data()
