"""
Synchronous helper functions for Celery tasks
Uses PyMongo instead of Motor for compatibility with Celery workers
"""
import os
import uuid
import subprocess
import tempfile
import requests
import json
import re
import hashlib
from datetime import datetime, timezone
from pymongo import MongoClient
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('/app/backend/.env')

# MongoDB connection (sync)
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ultimate_deployment

# Environment variables
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-v1-prod-ff5vNJO7BQg2')
DROPBOX_TOKEN = os.environ.get('DROPBOX_ACCESS_TOKEN')
DROPBOX_FOLDER = os.environ.get('DROPBOX_UPLOAD_FOLDER', '/UltimateDashboard')

def make_url_fingerprint(url: str) -> str:
    """Create a consistent hash for deduplication"""
    return hashlib.sha256(url.strip().lower().encode()).hexdigest()[:16]

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

def upload_to_dropbox_sync(local_path: str, source_type: str, filename: str):
    """Synchronous Dropbox upload for Celery"""
    import dropbox
    
    try:
        dbx = dropbox.Dropbox(DROPBOX_TOKEN)
        date_str = datetime.now().strftime("%Y-%m")
        clean_name = re.sub(r'[^\w\s.-]', '_', filename)
        dropbox_path = f"{DROPBOX_FOLDER}/{source_type}/{date_str}/{clean_name}"
        
        # Create folder
        try:
            dbx.files_create_folder_v2(f"{DROPBOX_FOLDER}/{source_type}/{date_str}")
        except:
            pass
        
        file_size = os.path.getsize(local_path)
        CHUNK = 150 * 1024 * 1024  # 150MB chunks
        
        if file_size <= CHUNK:
            with open(local_path, "rb") as f:
                dbx.files_upload(f.read(), dropbox_path, mode=dropbox.files.WriteMode("overwrite"))
        else:
            # Chunked upload for large files
            with open(local_path, "rb") as f:
                first = f.read(CHUNK)
                sess = dbx.files_upload_session_start(first)
                cursor = dropbox.files.UploadSessionCursor(session_id=sess.session_id, offset=len(first))
                
                while True:
                    chunk = f.read(CHUNK)
                    if len(chunk) == 0:
                        break
                    dbx.files_upload_session_append_v2(chunk, cursor)
                    cursor.offset += len(chunk)
                
                commit = dropbox.files.CommitInfo(path=dropbox_path, mode=dropbox.files.WriteMode("overwrite"))
                dbx.files_upload_session_finish(b"", cursor, commit)
        
        # Get shareable link
        shared = dbx.sharing_create_shared_link_with_settings(dropbox_path)
        link = shared.url.replace("?dl=0", "?dl=1")
        
        return link, dropbox_path
        
    except Exception as e:
        print(f"❌ Dropbox upload failed: {e}")
        raise

def download_video_sync(job_id: str, url: str, source: str, options: dict):
    """Synchronous video download for Celery"""
    print(f"📥 Download job {job_id[:8]}: {url[:50]}...")
    
    try:
        # Dedup check
        url_fp = make_url_fingerprint(url)
        existing = db.media_library.find_one({"url_fingerprint": url_fp})
        if existing:
            db.download_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "complete",
                    "progress": 100,
                    "completed_at": datetime.utcnow(),
                    "dropbox_link": existing.get("dropbox_link"),
                    "media_item_id": existing.get("item_id"),
                    "title": existing.get("title", ""),
                    "filename": existing.get("filename", "")
                }}
            )
            print(f"  ⚠️  Duplicate detected, reusing existing item")
            return True
        
        # Update status
        db.download_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "downloading", "started_at": datetime.utcnow(), "progress": 5}}
        )
        
        # Create temp directory
        temp_dir = tempfile.mkdtemp()
        output_template = os.path.join(temp_dir, "%(title)s.%(ext)s")
        
        print(f"  📥 Downloading with yt-dlp...")
        
        # Build yt-dlp command
        cmd = [
            '/root/.venv/bin/yt-dlp',
            '--output', output_template,
            '--no-warnings',
            '--ffmpeg-location', '/usr/bin/ffmpeg'
        ]
        
        if source == "skool":
            cmd += ["--format", "bestvideo[height<=720][ext=mp4]+bestaudio/best[height<=720]/best"]
        elif source == "pinterest":
            cmd += [
                "--format",
                "V_HLSV3_MOBILE-1431+V_HLSV3_MOBILE-audio1-1/V_HLSV3_MOBILE-783+V_HLSV3_MOBILE-audio1-1/bestvideo+bestaudio/best",
                "--merge-output-format", "mp4"
            ]
        else:
            cmd += ["--format", "best[ext=mp4]/best"]
        
        cmd.append(url)
        
        # Run download
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600, cwd=temp_dir)
        
        if result.returncode != 0:
            raise Exception(f"yt-dlp failed: {result.stderr[:200]}")
        
        # Find downloaded file
        files = list(Path(temp_dir).glob("*"))
        video_files = [f for f in files if f.suffix.lower() in ['.mp4', '.mkv', '.webm', '.mov']]
        
        if not video_files:
            raise Exception("No video file found after download")
        
        video_file = video_files[0]
        file_size = video_file.stat().st_size
        
        print(f"  ✅ Downloaded: {video_file.name} ({file_size / 1024 / 1024:.1f} MB)")
        
        # Update progress
        db.download_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "uploading", "progress": 65, "filename": video_file.name, "file_size": file_size}}
        )
        
        # Upload to Dropbox
        print(f"  ☁️  Uploading to Dropbox...")
        dropbox_link, dropbox_path = upload_to_dropbox_sync(str(video_file), source, video_file.name)
        
        print(f"  ✅ Uploaded to Dropbox")
        
        # Update progress
        db.download_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"progress": 75, "dropbox_link": dropbox_link}}
        )
        
        # Get metadata
        print(f"  📋 Extracting metadata...")
        info_cmd = ['/root/.venv/bin/yt-dlp', '--dump-json', '--no-download', '--no-warnings', url]
        info_proc = subprocess.run(info_cmd, capture_output=True, text=True, timeout=30)
        
        title = video_file.stem
        duration = 0
        thumbnail = ""
        
        if info_proc.returncode == 0 and info_proc.stdout.strip():
            try:
                info = json.loads(info_proc.stdout.strip().split('\n')[0])
                title = info.get('title', title)
                duration = info.get('duration', 0) or 0
                thumbnail = info.get('thumbnail', '')
            except:
                pass
        
        # Create library item
        media_item = {
            "item_id": str(uuid.uuid4()),
            "url_fingerprint": url_fp,
            "title": title,
            "source": source,
            "source_url": url,
            "filename": video_file.name,
            "file_size": file_size,
            "duration": duration,
            "thumbnail": thumbnail,
            "dropbox_link": dropbox_link,
            "dropbox_path": dropbox_path,
            "tags": [],
            "is_broll": source == "pinterest",
            "notes": "",
            "description": options.get("description", ""),
            "resource_links": options.get("resource_links", []),
            "lesson_metadata": options.get("metadata", {}),
            "transcript": None,
            "intelligence": None,
            "transcription_status": "pending",
            "intelligence_status": "pending",
            "created_at": datetime.utcnow(),
            "job_id": job_id
        }
        
        db.media_library.insert_one(media_item)
        
        print(f"  ✅ Created library item: {media_item['item_id']}")
        
        # Mark download complete
        db.download_jobs.update_one(
            {"job_id": job_id},
            {"$set": {
                "status": "complete",
                "progress": 100,
                "completed_at": datetime.utcnow(),
                "media_item_id": media_item["item_id"],
                "title": title
            }}
        )
        
        # Queue transcription if requested
        transcribe = options.get("transcribe", False)
        if transcribe:
            print(f"  🎤 Queueing transcription...")
            from celery_tasks import transcribe_video
            transcribe_video.delay(media_item["item_id"], url)
        
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        print(f"  ✅ Download job complete!")
        return True
        
    except Exception as e:
        print(f"  ❌ Download failed: {e}")
        db.download_jobs.update_one(
            {"job_id": job_id},
            {"$set": {
                "status": "failed",
                "error": str(e)[:500],
                "completed_at": datetime.utcnow()
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

def analyze_text_content_sync(item_id: str, text_content: str, title: str, source: str):
    """Synchronous AI analysis for text content (non-video)"""
    print(f"🧠 Analyzing text: {title[:50]}")
    
    try:
        # Update status
        db.skool_text_content.update_one(
            {"item_id": item_id},
            {"$set": {"intelligence_status": "running"}}
        )
        
        # Generate AI intelligence using Emergent LLM
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Truncate text if too long
        truncated = text_content[:8000] if len(text_content) > 8000 else text_content
        
        prompt = f"""You are an expert content strategist analyzing educational content.

TITLE: {title}
SOURCE: {source}

CONTENT:
{truncated}

Generate strategic content intelligence for Instagram and social media marketing.
Return ONLY valid JSON:

{{
  "summary": "2-3 sentence summary",
  "key_learnings": ["learning 1", "learning 2", "learning 3", "learning 4", "learning 5"],
  "instagram_strategy_insights": ["specific Instagram tactic 1", "specific Instagram tactic 2", "specific Instagram tactic 3"],
  "content_hooks": [
    {{"type": "question", "text": "hook text"}},
    {{"type": "curiosity", "text": "hook text"}},
    {{"type": "bold", "text": "hook text"}}
  ],
  "actionable_steps": ["step 1", "step 2", "step 3"],
  "content_topics": ["topic 1", "topic 2", "topic 3"],
  "target_audience": "audience description",
  "viral_potential_tips": ["tip 1", "tip 2", "tip 3"]
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
        db.skool_text_content.update_one(
            {"item_id": item_id},
            {"$set": {
                "text_intelligence": intelligence,
                "intelligence_status": "complete",
                "analyzed_at": datetime.utcnow()
            }}
        )
        
        print(f"  ✅ Text analysis complete")
        return True
        
    except Exception as e:
        print(f"  ❌ Text analysis failed: {e}")
        db.skool_text_content.update_one(
            {"item_id": item_id},
            {"$set": {
                "intelligence_status": "failed",
                "intelligence_error": str(e)
            }}
        )
        return False
