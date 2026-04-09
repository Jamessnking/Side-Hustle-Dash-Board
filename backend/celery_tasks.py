"""
Celery Configuration and Tasks for Video Processing
"""
from celery import Celery
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

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

@app.task(name='tasks.transcribe_video')
def transcribe_video(item_id, source_url):
    """Celery task for video transcription"""
    import asyncio
    from server import run_transcription
    
    # Create new event loop for this task
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(run_transcription(item_id, source_url))
        return f"Transcribed: {item_id}"
    finally:
        loop.close()

@app.task(name='tasks.analyze_video')
def analyze_video(item_id, transcript_text, title, source, description="", resource_links=None):
    """Celery task for AI intelligence generation"""
    import asyncio
    from server import run_intelligence
    
    # Create new event loop for this task
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(run_intelligence(
            item_id,
            transcript_text,
            title,
            source,
            description,
            resource_links or []
        ))
        return f"Analyzed: {item_id}"
    finally:
        loop.close()

@app.task(name='tasks.download_and_process')
def download_and_process(job_id, url, source, options):
    """Celery task for downloading and processing video"""
    import asyncio
    from server import run_download_job
    
    async def do_download():
        await run_download_job(job_id, url, source, options)
    
    asyncio.run(do_download())
    return f"Processed: {job_id}"

if __name__ == '__main__':
    app.start()
