"""
Synchronous helper functions for Celery tasks
Uses PyMongo instead of Motor for compatibility with Celery workers
"""
import os
import uuid
import subprocess
import tempfile
import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from pathlib import Path

# MongoDB connection (sync)
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

# Environment variables
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-v1-prod-ff5vNJO7BQg2')
DROPBOX_TOKEN = os.environ.get('DROPBOX_ACCESS_TOKEN')

def transcribe_video_sync(item_id: str, source_url: str):
    """Synchronous video transcription for Celery"""
    print(f"🎤 Transcribing: {item_id}")
    
    try:
        # Update status to running
        db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {"transcription_status": "running"}}
        )
        
        # Create temp directory for download
        temp_dir = tempfile.mkdtemp()
        video_path = os.path.join(temp_dir, 'video.mp4')
        
        print(f"  📥 Downloading with yt-dlp: {source_url[:50]}...")
        
        # Use yt-dlp to download audio only (all we need for transcription)
        # Use full paths for Celery worker compatibility
        yt_dlp_cmd = [
            '/root/.venv/bin/yt-dlp',  # Full path to yt-dlp for Celery workers
            '-f', 'bestaudio/best',  # Audio only is fine for transcription
            '--extract-audio',
            '--audio-format', 'mp3',
            '--ffmpeg-location', '/usr/bin/ffmpeg',  # Explicitly set ffmpeg location for Celery workers
            '-o', video_path.replace('.mp4', '.mp3'),  # Save as mp3
            '--no-playlist',
            '--no-check-certificate',
            source_url
        ]
        
        # Update video_path to mp3
        audio_path = video_path.replace('.mp4', '.mp3')
        
        result = subprocess.run(yt_dlp_cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            raise Exception(f"yt-dlp failed: {result.stderr}")
        
        # Check if audio file exists and has content
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            raise Exception("Downloaded audio file is empty or missing")
        
        print(f"  🎤 Running faster-whisper on audio...")
        
        # Run faster-whisper on the audio file
        from faster_whisper import WhisperModel
        
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, info = model.transcribe(audio_path, beam_size=5)
        
        # Build transcript
        full_text = []
        segments_list = []
        
        for segment in segments:
            full_text.append(segment.text)
            segments_list.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
        
        transcript = {
            "full_text": " ".join(full_text),
            "segments": segments_list,
            "language": info.language,
            "duration": info.duration
        }
        
        # Save to database
        db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {
                "transcript": transcript,
                "transcription_status": "complete"
            }}
        )
        
        # Cleanup temp directory
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        print(f"  ✅ Transcription complete: {len(full_text)} segments")
        return True
        
    except Exception as e:
        print(f"  ❌ Transcription failed: {e}")
        db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {
                "transcription_status": "failed",
                "transcription_error": str(e)
            }}
        )
        # Cleanup on error
        try:
            import shutil
            if 'temp_dir' in locals():
                shutil.rmtree(temp_dir, ignore_errors=True)
        except:
            pass
        return False

def analyze_video_sync(item_id: str, transcript_text: str, title: str, source: str, 
                       description: str = "", resource_links: list = None):
    """Synchronous AI intelligence generation for Celery"""
    print(f"🧠 Analyzing: {title[:50]}")
    
    try:
        # Update status
        db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {"intelligence_status": "running"}}
        )
        
        # Generate AI intelligence using Emergent LLM
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Truncate transcript
        truncated = transcript_text[:6000] if len(transcript_text) > 6000 else transcript_text
        
        # Build context
        context_parts = [f"TITLE: {title}", f"SOURCE: {source}"]
        
        if description:
            context_parts.append(f"\nLESSON DESCRIPTION:\n{description[:500]}")
        
        if resource_links:
            instagram_links = [link for link in resource_links if 'instagram.com' in link]
            other_links = [link for link in resource_links if 'instagram.com' not in link]
            
            if instagram_links:
                context_parts.append(f"\nINSTAGRAM EXAMPLES:\n" + "\n".join(f"  - {link}" for link in instagram_links[:5]))
            if other_links:
                context_parts.append(f"\nRESOURCES:\n" + "\n".join(f"  - {link}" for link in other_links[:5]))
        
        context = "\n".join(context_parts)
        
        prompt = f"""You are an expert content strategist.

{context}

VIDEO TRANSCRIPT:
{truncated}

Generate strategic content intelligence. Return ONLY valid JSON:

{{
  "summary": "2-3 sentence summary",
  "key_learnings": ["learning 1", "learning 2", "learning 3", "learning 4", "learning 5"],
  "hooks": [
    {{"type": "question", "text": "hook text"}},
    {{"type": "curiosity", "text": "hook text"}},
    {{"type": "bold", "text": "hook text"}}
  ],
  "reel_scripts": [
    {{"title": "Reel 1", "hook": "opening", "body": "content", "cta": "action"}},
    {{"title": "Reel 2", "hook": "opening", "body": "content", "cta": "action"}},
    {{"title": "Reel 3", "hook": "opening", "body": "content", "cta": "action"}}
  ],
  "carousel_outline": {{
    "title": "carousel title",
    "slides": [
      {{"slide": 1, "headline": "headline", "content": "content"}},
      {{"slide": 2, "headline": "headline", "content": "content"}},
      {{"slide": 3, "headline": "headline", "content": "content"}},
      {{"slide": 4, "headline": "headline", "content": "content"}},
      {{"slide": 5, "headline": "CTA", "content": "action"}}
    ]
  }},
  "content_topics": ["topic 1", "topic 2", "topic 3"],
  "target_audience": "audience",
  "repurposing_plan": ["idea 1", "idea 2", "idea 3"],
  "instagram_insights": "insights if examples provided"
}}"""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message="You are an expert content strategist. Always respond with valid JSON only."
        )
        
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            response = loop.run_until_complete(chat.send_message(UserMessage(text=prompt)))
        finally:
            loop.close()
        
        # Parse JSON response
        import json
        text = response.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        intelligence = json.loads(text)
        
        # Save to database
        db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {
                "intelligence": intelligence,
                "intelligence_status": "complete"
            }}
        )
        
        print(f"  ✅ AI analysis complete")
        return True
        
    except Exception as e:
        print(f"  ❌ AI analysis failed: {e}")
        db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {
                "intelligence_status": "failed",
                "intelligence_error": str(e)
            }}
        )
        return False
