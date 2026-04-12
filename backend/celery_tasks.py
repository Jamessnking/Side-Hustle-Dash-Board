"""
Celery Configuration and Tasks for Video Processing
Uses MongoDB as broker for persistence across container restarts
Uses synchronous PyMongo for compatibility with forked workers
"""
from celery import Celery
import os

# Get MongoDB URL from environment
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

# Initialize Celery with MongoDB as broker (persistent across restarts)
app = Celery(
    'video_processor',
    broker=f'{MONGO_URL}/celery_broker',
    backend=f'{MONGO_URL}/celery_backend'
)

# Celery configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    # MongoDB-specific settings
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    # Task settings for reliability
    task_acks_late=True,  # Don't lose tasks on worker crash
    task_reject_on_worker_lost=True,
    task_track_started=True,
    task_time_limit=7200,  # 2 hours max per task (long videos need time)
    task_soft_time_limit=6900,  # Warning at 115 min
    worker_prefetch_multiplier=1,  # Don't prefetch tasks
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks (prevent memory leaks)
)

@app.task(name='tasks.transcribe_video', bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
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

@app.task(name='tasks.analyze_video', bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 30})
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

@app.task(name='tasks.download_video', bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 2, 'countdown': 120})
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

@app.task(name='tasks.analyze_text_content', bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 30})
def analyze_text_content(self, item_id, text_content, title, source):
    """Celery task for analyzing text content from OpenClaw"""
    import sys
    import os
    sys.path.insert(0, '/app/backend')
    
    from sync_helpers import analyze_text_content_sync
    
    try:
        result = analyze_text_content_sync(item_id, text_content, title, source)
        return f"Analyzed text: {item_id} - Success: {result}"
    except Exception as e:
        return f"Analyzed text: {item_id} - Failed: {str(e)}"

if __name__ == '__main__':
    app.start()
