"""
Celery Configuration and Tasks for Video Processing
Uses synchronous PyMongo for compatibility with forked workers
"""
from celery import Celery

# Initialize Celery
app = Celery(
    'video_processor',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1'
)

# Celery configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=1800,  # 30 minutes max per task
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
)

@app.task(name='tasks.transcribe_video', bind=True)
def transcribe_video(self, item_id, source_url):
    """Celery task for video transcription"""
    import sys
    import os
    sys.path.insert(0, '/app/backend')
    
    from sync_helpers import transcribe_video_sync
    
    try:
        result = transcribe_video_sync(item_id, source_url)
        return f"Transcribed: {item_id} - Success: {result}"
    except Exception as e:
        return f"Transcribed: {item_id} - Failed: {str(e)}"

@app.task(name='tasks.analyze_video', bind=True)
def analyze_video(self, item_id, transcript_text, title, source, description="", resource_links=None):
    """Celery task for AI intelligence generation"""
    import sys
    import os
    sys.path.insert(0, '/app/backend')
    
    from sync_helpers import analyze_video_sync
    
    try:
        result = analyze_video_sync(
            item_id,
            transcript_text,
            title,
            source,
            description,
            resource_links or []
        )
        return f"Analyzed: {item_id} - Success: {result}"
    except Exception as e:
        return f"Analyzed: {item_id} - Failed: {str(e)}"

@app.task(name='tasks.download_video', bind=True)
def download_video(self, job_id, url, source, options=None):
    """Celery task for video download"""
    import sys
    import os
    sys.path.insert(0, '/app/backend')
    
    from sync_helpers import download_video_sync
    
    if options is None:
        options = {}
    
    try:
        result = download_video_sync(job_id, url, source, options)
        return f"Downloaded: {job_id} - Success: {result}"
    except Exception as e:
        return f"Downloaded: {job_id} - Failed: {str(e)}"

if __name__ == '__main__':
    app.start()
