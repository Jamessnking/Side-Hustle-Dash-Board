from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os, json, re, hashlib, uuid, subprocess, tempfile, requests, asyncio, time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Ultimate Deployment Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ultimate_deployment")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Env
DROPBOX_TOKEN = os.getenv("DROPBOX_ACCESS_TOKEN", "")
SKOOL_COOKIES = os.getenv("SKOOL_COOKIES_PATH", "/app/backend/skool_cookies.txt")
DROPBOX_FOLDER = os.getenv("DROPBOX_UPLOAD_FOLDER", "/UltimateDashboard")
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "")
SKOOL_AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3OTU3MjMzMDgsImlhdCI6MTc2NDE4NzMwOCwidXNlcl9pZCI6IjVmMDYzNDJkZDlkOTQ1MzI5ZWY4ZDNmYTM5MDVmMDhhIn0.56Tn2FIJSMzNKH7CslUQ864ARd09SDvZxDyFVTzhoN0"
SKOOL_CLIENT_ID = "616914c797264fc0bca8d98e5bf1d09f"

# Whisper model cache (load once)
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        print("Loading Whisper 'base' model...")
        _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        print("Whisper model ready.")
    return _whisper_model

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def serialize_doc(doc):
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if k == "_id":
            result["id"] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, list):
            result[k] = [serialize_doc(i) if isinstance(i, dict) else i for i in v]
        elif isinstance(v, dict):
            result[k] = serialize_doc(v)
        else:
            result[k] = v
    return result

def get_dropbox_client():
    import dropbox
    return dropbox.Dropbox(DROPBOX_TOKEN)

def make_url_fingerprint(url: str) -> str:
    """Create a consistent hash for deduplication"""
    return hashlib.sha256(url.strip().lower().encode()).hexdigest()[:16]

async def upload_to_dropbox_async(local_path: str, source_type: str, filename: str):
    import dropbox as dbx_module
    try:
        dbx = get_dropbox_client()
        date_str = datetime.now().strftime("%Y-%m")
        clean_name = re.sub(r'[^\w\s.-]', '_', filename)
        dropbox_path = f"{DROPBOX_FOLDER}/{source_type}/{date_str}/{clean_name}"

        try:
            dbx.files_create_folder_v2(f"{DROPBOX_FOLDER}/{source_type}/{date_str}")
        except:
            pass

        file_size = os.path.getsize(local_path)
        CHUNK = 150 * 1024 * 1024

        if file_size <= CHUNK:
            with open(local_path, "rb") as f:
                dbx.files_upload(f.read(), dropbox_path, mode=dbx_module.files.WriteMode("overwrite"))
        else:
            with open(local_path, "rb") as f:
                first = f.read(CHUNK)
                sess = dbx.files_upload_session_start(first)
                cursor = dbx_module.files.UploadSessionCursor(session_id=sess.session_id, offset=len(first))
                while True:
                    chunk = f.read(CHUNK)
                    if not chunk:
                        break
                    if cursor.offset + len(chunk) >= file_size:
                        commit = dbx_module.files.CommitInfo(path=dropbox_path, mode=dbx_module.files.WriteMode("overwrite"))
                        dbx.files_upload_session_finish(chunk, cursor, commit)
                        break
                    dbx.files_upload_session_append_v2(chunk, cursor)
                    cursor = dbx_module.files.UploadSessionCursor(session_id=cursor.session_id, offset=cursor.offset + len(chunk))

        try:
            settings = dbx_module.sharing.SharedLinkSettings(
                requested_visibility=dbx_module.sharing.RequestedVisibility.public
            )
            link = dbx.sharing_create_shared_link_with_settings(dropbox_path, settings=settings)
            return link.url, dropbox_path
        except dbx_module.exceptions.ApiError as e:
            if e.error.is_shared_link_already_exists():
                links = dbx.sharing_list_shared_links(path=dropbox_path, direct_only=True)
                if links.links:
                    return links.links[0].url, dropbox_path
        return None, dropbox_path
    except Exception as e:
        print(f"Dropbox upload error: {e}")
        return None, None


def scrape_skool_videos(classroom_url: str):
    """
    Enhanced Skool scraper that captures:
    - Video URLs and titles
    - Lesson descriptions
    - Resource links (Instagram examples, tools, etc.)
    - Any additional context from the lesson page
    """
    try:
        session = requests.Session()
        session.cookies.set('auth_token', SKOOL_AUTH_TOKEN, domain='.skool.com')
        session.cookies.set('client_id', SKOOL_CLIENT_ID, domain='.skool.com')
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
        }
        resp = session.get(classroom_url, headers=headers, timeout=30)
        if resp.status_code != 200:
            return [], f"HTTP {resp.status_code}"

        next_data_match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', resp.text, re.DOTALL)
        if not next_data_match:
            return [], "No __NEXT_DATA__ found"

        data = json.loads(next_data_match.group(1))

        def extract_text_content(obj):
            """Recursively extract text content from nested content objects"""
            if isinstance(obj, str):
                return obj
            elif isinstance(obj, dict):
                if 'content' in obj:
                    content = obj['content']
                    if isinstance(content, str):
                        return content
                    elif isinstance(content, list):
                        return ' '.join(extract_text_content(item) for item in content)
                    elif isinstance(content, dict):
                        return extract_text_content(content)
                # Also check for 'text' field
                if 'text' in obj:
                    return str(obj['text'])
                # Recursively search all values
                texts = []
                for v in obj.values():
                    result = extract_text_content(v)
                    if result:
                        texts.append(result)
                return ' '.join(texts) if texts else ''
            elif isinstance(obj, list):
                return ' '.join(extract_text_content(item) for item in obj)
            return ''

        def extract_links(obj, found_links=None):
            """Extract all URLs from the data structure"""
            if found_links is None:
                found_links = []
            
            if isinstance(obj, str):
                # Look for URLs in strings
                url_pattern = r'https?://[^\s<>"{}|\\^\[\]`]+'
                urls = re.findall(url_pattern, obj)
                found_links.extend(urls)
            elif isinstance(obj, dict):
                # Check for 'href' or 'url' keys
                if 'href' in obj and isinstance(obj['href'], str):
                    found_links.append(obj['href'])
                if 'url' in obj and isinstance(obj['url'], str) and obj['url'].startswith('http'):
                    found_links.append(obj['url'])
                # Recursively search all values
                for v in obj.values():
                    extract_links(v, found_links)
            elif isinstance(obj, list):
                for item in obj:
                    extract_links(item, found_links)
            
            return found_links

        def find_videos(obj, parent_obj=None):
            """Find videos and their associated metadata (description, links)"""
            found = []
            if isinstance(obj, dict):
                vid = obj.get('videoLink', '')
                if vid and any(p in str(vid) for p in ['loom.com', 'youtube.com', 'vimeo.com', 'wistia']):
                    title = obj.get('title', 'Untitled')
                    if isinstance(title, dict):
                        title = title.get('content', 'Untitled')
                    
                    # Extract description/body content
                    description = ''
                    body = obj.get('body') or obj.get('description') or obj.get('content')
                    if body:
                        description = extract_text_content(body)
                    
                    # Extract links from the lesson
                    lesson_links = extract_links(obj)
                    # Filter out the video link itself and duplicates
                    resource_links = [link for link in set(lesson_links) if link != vid and 'skool.com' not in link]
                    
                    video_data = {
                        'title': str(title),
                        'url': vid,
                        'thumbnail': obj.get('videoThumbnail', ''),
                        'description': description.strip() if description else '',
                        'resource_links': resource_links,
                        'has_instagram_examples': any('instagram.com' in link for link in resource_links),
                        'metadata': {
                            'lesson_id': obj.get('id', ''),
                            'created_at': obj.get('createdAt', ''),
                        }
                    }
                    found.append(video_data)
                
                for v in obj.values():
                    found.extend(find_videos(v, obj))
            elif isinstance(obj, list):
                for item in obj:
                    found.extend(find_videos(item, obj))
            return found

        videos = find_videos(data)
        seen_urls = set()
        unique_videos = []
        for v in videos:
            if v['url'] not in seen_urls:
                seen_urls.add(v['url'])
                unique_videos.append(v)
        
        # Log what we found for debugging
        print(f"✅ Scraped {len(unique_videos)} videos from Skool classroom")
        for v in unique_videos:
            print(f"  - {v['title']}")
            if v.get('description'):
                print(f"    Description: {v['description'][:100]}...")
            if v.get('resource_links'):
                print(f"    Links found: {len(v['resource_links'])}")
                for link in v['resource_links'][:3]:  # Show first 3
                    print(f"      → {link}")
        
        return unique_videos, None
    except Exception as e:
        print(f"❌ Scraper error: {str(e)}")
        return [], str(e)


def transcribe_audio_file(audio_path: str) -> dict:
    """Transcribe an audio file using faster-whisper"""
    try:
        model = get_whisper_model()
        segments, info = model.transcribe(audio_path, beam_size=5, language="en")
        
        full_text = ""
        timestamped = []
        for segment in segments:
            full_text += segment.text + " "
            timestamped.append({
                "start": round(segment.start, 1),
                "end": round(segment.end, 1),
                "text": segment.text.strip()
            })
        
        return {
            "full_text": full_text.strip(),
            "segments": timestamped,
            "duration": info.duration,
            "language": info.language
        }
    except Exception as e:
        return {"error": str(e), "full_text": ""}


async def generate_content_intelligence(transcript: str, title: str, source: str, description: str = "", resource_links: list = None) -> dict:
    """
    Generate structured content intelligence from a transcript using AI
    Now includes lesson description and resource links for richer context
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        # Truncate very long transcripts to avoid token limits
        truncated = transcript[:6000] if len(transcript) > 6000 else transcript
        
        # Build context string
        context_parts = [f"TITLE: {title}", f"SOURCE: {source}"]
        
        if description:
            context_parts.append(f"\nLESSON DESCRIPTION:\n{description[:500]}")
        
        if resource_links:
            instagram_links = [link for link in resource_links if 'instagram.com' in link]
            other_links = [link for link in resource_links if 'instagram.com' not in link]
            
            if instagram_links:
                context_parts.append(f"\nINSTAGRAM EXAMPLES REFERENCED:\n" + "\n".join(f"  - {link}" for link in instagram_links[:5]))
            if other_links:
                context_parts.append(f"\nADDITIONAL RESOURCES:\n" + "\n".join(f"  - {link}" for link in other_links[:5]))

        context = "\n".join(context_parts)

        prompt = f"""You are an expert content strategist and social media coach.

Analyse this educational content and generate actionable intelligence:

{context}

VIDEO TRANSCRIPT:
{truncated}

Generate strategic content based on BOTH the transcript AND the lesson context (description & examples).

If Instagram profiles or posts are referenced, note that these are INSTRUCTOR-PROVIDED EXAMPLES of good content. 
Use them to inform your hook/script recommendations.

Return ONLY a JSON object with these exact fields:
{{
  "summary": "2-3 sentence summary of the core topic and key takeaway",
  "key_learnings": ["learning 1", "learning 2", "learning 3", "learning 4", "learning 5"],
  "hooks": [
    {{"type": "question", "text": "hook text"}},
    {{"type": "curiosity", "text": "hook text"}},
    {{"type": "bold", "text": "hook text"}}
  ],
  "reel_scripts": [
    {{"title": "Reel 1 title", "hook": "opening line", "body": "main content (2-3 sentences)", "cta": "call to action"}},
    {{"title": "Reel 2 title", "hook": "opening line", "body": "main content", "cta": "call to action"}},
    {{"title": "Reel 3 title", "hook": "opening line", "body": "main content", "cta": "call to action"}}
  ],
  "carousel_outline": {{
    "title": "carousel title",
    "slides": [
      {{"slide": 1, "headline": "slide headline", "content": "slide content"}},
      {{"slide": 2, "headline": "slide headline", "content": "slide content"}},
      {{"slide": 3, "headline": "slide headline", "content": "slide content"}},
      {{"slide": 4, "headline": "slide headline", "content": "slide content"}},
      {{"slide": 5, "headline": "CTA slide", "content": "call to action"}}
    ]
  }},
  "content_topics": ["topic 1", "topic 2", "topic 3"],
  "target_audience": "who this content is for",
  "repurposing_plan": ["idea 1", "idea 2", "idea 3"],
  "instagram_insights": "If Instagram examples were provided, note key patterns or strategies observed"
}}"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message="You are an expert content strategist. Always respond with valid JSON only."
        )
        response = await chat.send_message(UserMessage(text=prompt))

        try:
            text = response.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            return json.loads(text)
        except:
            return {"raw_analysis": response, "summary": "Analysis complete - see raw output", "error": "JSON parse issue"}
    except Exception as e:
        return {"error": str(e), "summary": "AI analysis unavailable"}


async def run_download_job(job_id: str, url: str, source: str, options: dict):
    """Background task: download → upload to Dropbox → optionally transcribe → save to library"""
    try:
        # Dedup check
        url_fp = make_url_fingerprint(url)
        existing = await db.media_library.find_one({"url_fingerprint": url_fp})
        if existing:
            await db.download_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "complete",
                    "progress": 100,
                    "completed_at": datetime.utcnow(),
                    "dropbox_link": existing.get("dropbox_link"),
                    "media_item_id": existing.get("item_id"),
                    "title": existing.get("title", ""),
                    "note": "Duplicate: reused existing media item"
                }}
            )
            return

        await db.download_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "downloading", "started_at": datetime.utcnow(), "progress": 5,
                       "log": ["Started download"]}}
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            output_template = os.path.join(tmpdir, "%(title)s.%(ext)s")

            cmd = ["/root/.venv/bin/yt-dlp", "--output", output_template, "--no-warnings", "--progress"]
            if source == "skool":
                cmd += ["--format", "bestvideo[height<=720][ext=mp4]+bestaudio/best[height<=720]/best"]
            elif source == "pinterest":
                cmd += ["--format",
                        "V_HLSV3_MOBILE-1431+V_HLSV3_MOBILE-audio1-1/V_HLSV3_MOBILE-783+V_HLSV3_MOBILE-audio1-1/bestvideo+bestaudio/best",
                        "--merge-output-format", "mp4"]
            else:
                cmd += ["--format", "best[ext=mp4]/best"]
            cmd.append(url)

            # Run with real-time progress parsing
            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, cwd=tmpdir
            )

            progress_val = 5
            logs = ["Download started"]
            for line in process.stdout:
                line = line.strip()
                if not line:
                    continue
                # Parse yt-dlp progress: "[download]  45.2% of   23.45MiB ..."
                match = re.search(r'\[download\]\s+(\d+\.?\d*)%', line)
                if match:
                    pct = float(match.group(1))
                    progress_val = int(5 + pct * 0.55)  # map 0-100% to 5-60%
                    # Skip live progress updates during download to avoid async issues
                    # Final progress will be updated after download completes
                if "[download]" in line or "[Merger]" in line or "Destination" in line:
                    logs.append(line[:100])

            process.wait()

            if process.returncode != 0:
                raise Exception(f"yt-dlp failed (code {process.returncode}): {' '.join(logs[-2:])}")

            # Find downloaded file
            files = list(Path(tmpdir).glob("*"))
            if not files:
                raise Exception("No output file found after download")

            video_file = files[0]
            file_size = video_file.stat().st_size

            await db.download_jobs.update_one(
                {"job_id": job_id},
                {"$set": {"status": "uploading", "progress": 65,
                           "filename": video_file.name, "file_size": file_size,
                           "log": ["Uploading to Dropbox..."]}}
            )

            # Upload to Dropbox
            dropbox_link, dropbox_path = await upload_to_dropbox_async(
                str(video_file), source, video_file.name
            )

            await db.download_jobs.update_one(
                {"job_id": job_id},
                {"$set": {"progress": 75, "log": ["Dropbox upload complete. Extracting metadata..."]}}
            )

            # Get video metadata
            info_cmd = ["/root/.venv/bin/yt-dlp", "--dump-json", "--no-download", "--no-warnings", url]
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
                # NEW: Store lesson context
                "description": options.get("description", ""),
                "resource_links": options.get("resource_links", []),
                "lesson_metadata": options.get("metadata", {}),
                # AI fields
                "transcript": None,
                "intelligence": None,
                "transcription_status": "pending",
                "intelligence_status": "pending",
                "created_at": datetime.utcnow(),
                "job_id": job_id
            }
            await db.media_library.insert_one(media_item)

            # Auto-transcribe if requested
            transcribe = options.get("transcribe", False)
            analyze = options.get("analyze", False)

            if transcribe or analyze:
                await db.download_jobs.update_one(
                    {"job_id": job_id},
                    {"$set": {"progress": 80, "log": ["Transcribing audio..."]}}
                )
                await db.media_library.update_one(
                    {"item_id": media_item["item_id"]},
                    {"$set": {"transcription_status": "running"}}
                )

                # Extract audio for transcription
                audio_path = os.path.join(tmpdir, "audio.mp3")
                ffmpeg_cmd = ["ffmpeg", "-i", str(video_file), "-vn", "-acodec", "mp3", "-ar", "16000", "-ac", "1", audio_path, "-y"]
                audio_proc = subprocess.run(ffmpeg_cmd, capture_output=True, timeout=300)

                transcript_result = {}
                if audio_proc.returncode == 0 and os.path.exists(audio_path):
                    transcript_result = transcribe_audio_file(audio_path)
                    await db.media_library.update_one(
                        {"item_id": media_item["item_id"]},
                        {"$set": {
                            "transcript": transcript_result,
                            "transcription_status": "complete" if not transcript_result.get("error") else "failed"
                        }}
                    )

                if analyze and transcript_result.get("full_text"):
                    await db.download_jobs.update_one(
                        {"job_id": job_id},
                        {"$set": {"progress": 90, "log": ["Generating AI content intelligence..."]}}
                    )
                    await db.media_library.update_one(
                        {"item_id": media_item["item_id"]},
                        {"$set": {"intelligence_status": "running"}}
                    )
                    intelligence = await generate_content_intelligence(
                        transcript_result["full_text"], title, source
                    )
                    await db.media_library.update_one(
                        {"item_id": media_item["item_id"]},
                        {"$set": {
                            "intelligence": intelligence,
                            "intelligence_status": "complete" if not intelligence.get("error") else "failed"
                        }}
                    )

            await db.download_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "complete",
                    "progress": 100,
                    "completed_at": datetime.utcnow(),
                    "dropbox_link": dropbox_link,
                    "media_item_id": media_item["item_id"],
                    "title": title,
                    "log": ["Complete! Saved to Dropbox and library."]
                }}
            )

    except Exception as e:
        await db.download_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "failed", "error": str(e), "progress": 0,
                       "log": [f"Error: {str(e)[:200]}"]}}
        )


# ─── MODELS ────────────────────────────────────────────────────────────────────

class SkoolDownloadRequest(BaseModel):
    loom_url: str
    lesson_title: Optional[str] = ""
    transcribe: bool = False
    analyze: bool = False
    description: Optional[str] = ""
    resource_links: Optional[List[str]] = []
    metadata: Optional[dict] = {}

class SkoolScrapeRequest(BaseModel):
    classroom_url: str

class PinterestDownloadRequest(BaseModel):
    url: str
    title: Optional[str] = ""

class PinterestSearchRequest(BaseModel):
    keyword: str
    count: int = 5

class MediaItemUpdate(BaseModel):
    tags: Optional[List[str]] = None
    is_broll: Optional[bool] = None
    notes: Optional[str] = None
    title: Optional[str] = None

class PromptCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    tags: Optional[List[str]] = []

class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None

class KanbanCardCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    column: str
    priority: Optional[str] = "medium"
    tags: Optional[List[str]] = []

class KanbanCardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    column: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = None

class ApiKeyCreate(BaseModel):
    name: str
    service: str
    key_value: str
    notes: Optional[str] = ""

class ModuleCreate(BaseModel):
    name: str
    description: str
    icon: Optional[str] = "Layers"
    color: Optional[str] = "teal"
    links: Optional[List[dict]] = []
    notes: Optional[str] = ""

class TrendAnalyseRequest(BaseModel):
    url: str
    analysis_type: Optional[str] = "full"

class TranscribeRequest(BaseModel):
    item_id: str

class InstagramAccount(BaseModel):
    username: str
    account_type: str = "personal"
    access_token: Optional[str] = ""
    notes: Optional[str] = ""

class DMRule(BaseModel):
    account_id: str
    trigger_keyword: str
    response_message: str
    send_link: Optional[str] = ""
    is_active: bool = True


# ─── ROOT ──────────────────────────────────────────────────────────────────────

@app.get("/api")
async def root():
    return {"status": "ok", "app": "Ultimate Deployment Dashboard"}

@app.get("/api/health")
async def health():
    try:
        dbx = get_dropbox_client()
        acct = dbx.users_get_current_account()
        dropbox_ok = True
        dropbox_name = acct.name.display_name
    except:
        dropbox_ok = False
        dropbox_name = ""

    return {
        "status": "ok",
        "dropbox": dropbox_ok,
        "dropbox_account": dropbox_name,
        "timestamp": datetime.utcnow().isoformat()
    }


# ─── SKOOL ─────────────────────────────────────────────────────────────────────

@app.post("/api/skool/scrape")
async def skool_scrape(req: SkoolScrapeRequest):
    videos, error = scrape_skool_videos(req.classroom_url)
    if error and not videos:
        raise HTTPException(status_code=400, detail=f"Failed to scrape: {error}")
    return {"videos": videos, "count": len(videos)}

@app.post("/api/skool/download")
async def skool_download(req: SkoolDownloadRequest, background_tasks: BackgroundTasks):
    # Dedup check
    url_fp = make_url_fingerprint(req.loom_url)
    existing = await db.media_library.find_one({"url_fingerprint": url_fp})
    if existing:
        return {
            "job_id": None,
            "status": "duplicate",
            "message": "Already downloaded",
            "media_item_id": existing["item_id"],
            "dropbox_link": existing.get("dropbox_link")
        }

    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "source": "skool",
        "url": req.loom_url,
        "title": req.lesson_title or "Skool Lesson",
        "status": "queued",
        "progress": 0,
        "options": {
            "transcribe": req.transcribe,
            "analyze": req.analyze,
            "description": req.description,
            "resource_links": req.resource_links or [],
            "metadata": req.metadata or {}
        },
        "created_at": datetime.utcnow(),
        "error": None,
        "dropbox_link": None,
        "log": ["Queued"]
    }
    await db.download_jobs.insert_one(job)
    background_tasks.add_task(
        run_download_job,
        job_id,
        req.loom_url,
        "skool",
        {
            "transcribe": req.transcribe,
            "analyze": req.analyze,
            "description": req.description,
            "resource_links": req.resource_links or [],
            "metadata": req.metadata or {}
        }
    )
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/skool/jobs")
async def get_skool_jobs():
    jobs = await db.download_jobs.find({"source": "skool"}).sort("created_at", -1).limit(50).to_list(50)
    return [serialize_doc(j) for j in jobs]


# ─── PINTEREST ─────────────────────────────────────────────────────────────────

@app.post("/api/pinterest/info")
async def pinterest_info(url: str = Query(...)):
    try:
        cmd = ["/root/.venv/bin/yt-dlp", "--dump-json", "--no-download", "--no-warnings", url]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if proc.returncode == 0 and proc.stdout.strip():
            info = json.loads(proc.stdout.strip().split('\n')[0])
            return {
                "title": info.get('title', 'Pinterest Video'),
                "duration": info.get('duration'),
                "thumbnail": info.get('thumbnail', ''),
                "url": url
            }
        raise HTTPException(status_code=400, detail="Could not extract video info")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Timeout")

@app.post("/api/pinterest/download")
async def pinterest_download(req: PinterestDownloadRequest, background_tasks: BackgroundTasks):
    # Dedup check
    url_fp = make_url_fingerprint(req.url)
    existing = await db.media_library.find_one({"url_fingerprint": url_fp})
    if existing:
        return {
            "job_id": None,
            "status": "duplicate",
            "message": "Already downloaded",
            "media_item_id": existing["item_id"],
            "dropbox_link": existing.get("dropbox_link")
        }

    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "source": "pinterest",
        "url": req.url,
        "title": req.title or "Pinterest Video",
        "status": "queued",
        "progress": 0,
        "options": {},
        "created_at": datetime.utcnow(),
        "error": None,
        "dropbox_link": None,
        "log": ["Queued"]
    }
    await db.download_jobs.insert_one(job)
    background_tasks.add_task(run_download_job, job_id, req.url, "pinterest", {})
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/pinterest/jobs")
async def get_pinterest_jobs():
    jobs = await db.download_jobs.find({"source": "pinterest"}).sort("created_at", -1).limit(50).to_list(50)
    return [serialize_doc(j) for j in jobs]

@app.post("/api/pinterest/search-download")
async def pinterest_search_download(req: PinterestSearchRequest, background_tasks: BackgroundTasks):
    search_url = f"https://www.pinterest.com/search/pins/?q={req.keyword.replace(' ', '+')}&rs=typed"
    return {
        "message": f"Search for '{req.keyword}' on Pinterest",
        "search_url": search_url,
        "tip": "Copy individual pin URLs and use the download form to batch download B-roll"
    }


# ─── JOBS ──────────────────────────────────────────────────────────────────────

@app.get("/api/jobs")
async def get_all_jobs(source: Optional[str] = None, status: Optional[str] = None, limit: int = 50):
    query = {}
    if source:
        query["source"] = source
    if status:
        query["status"] = status
    jobs = await db.download_jobs.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [serialize_doc(j) for j in jobs]

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = await db.download_jobs.find_one({"job_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return serialize_doc(job)

@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    await db.download_jobs.delete_one({"job_id": job_id})
    return {"success": True}

@app.get("/api/jobs/{job_id}/stream")
async def stream_job_progress(job_id: str):
    """SSE endpoint for real-time job progress"""
    async def event_generator():
        last_status = None
        timeout = 600  # 10 min max
        start = time.time()

        while time.time() - start < timeout:
            job = await db.download_jobs.find_one({"job_id": job_id})
            if not job:
                yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
                break

            job_data = serialize_doc(job)
            status = job_data.get("status")

            yield f"data: {json.dumps(job_data)}\n\n"

            if status in ("complete", "failed"):
                break

            await asyncio.sleep(1.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ─── CONTENT LIBRARY ───────────────────────────────────────────────────────────

@app.get("/api/library")
async def get_library(
    source: Optional[str] = None,
    is_broll: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 100
):
    query = {}
    if source:
        query["source"] = source
    if is_broll is not None:
        query["is_broll"] = is_broll
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    items = await db.media_library.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [serialize_doc(i) for i in items]

@app.get("/api/library/{item_id}")
async def get_library_item(item_id: str):
    item = await db.media_library.find_one({"item_id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_doc(item)

@app.patch("/api/library/{item_id}")
async def update_library_item(item_id: str, update: MediaItemUpdate):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    await db.media_library.update_one({"item_id": item_id}, {"$set": update_data})
    item = await db.media_library.find_one({"item_id": item_id})
    return serialize_doc(item)

@app.delete("/api/library/{item_id}")
async def delete_library_item(item_id: str):
    await db.media_library.delete_one({"item_id": item_id})
    return {"success": True}

@app.get("/api/library/stats/overview")
async def library_stats():
    total = await db.media_library.count_documents({})
    skool_count = await db.media_library.count_documents({"source": "skool"})
    pinterest_count = await db.media_library.count_documents({"source": "pinterest"})
    broll_count = await db.media_library.count_documents({"is_broll": True})
    jobs_total = await db.download_jobs.count_documents({})
    jobs_complete = await db.download_jobs.count_documents({"status": "complete"})
    jobs_active = await db.download_jobs.count_documents({"status": {"$in": ["queued", "downloading", "uploading"]}})
    transcribed = await db.media_library.count_documents({"transcription_status": "complete"})
    analysed = await db.media_library.count_documents({"intelligence_status": "complete"})
    return {
        "total_media": total,
        "skool_videos": skool_count,
        "pinterest_videos": pinterest_count,
        "broll_count": broll_count,
        "jobs_total": jobs_total,
        "jobs_complete": jobs_complete,
        "jobs_active": jobs_active,
        "transcribed": transcribed,
        "analysed": analysed
    }


# ─── TRANSCRIBE & INTELLIGENCE ─────────────────────────────────────────────────

@app.post("/api/library/{item_id}/transcribe")
async def transcribe_item(item_id: str, background_tasks: BackgroundTasks):
    """Transcribe audio from a media library item"""
    item = await db.media_library.find_one({"item_id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.get("transcription_status") == "running":
        return {"message": "Transcription already in progress"}

    await db.media_library.update_one(
        {"item_id": item_id},
        {"$set": {"transcription_status": "running"}}
    )
    background_tasks.add_task(run_transcription, item_id, item.get("source_url", ""))
    return {"message": "Transcription started", "item_id": item_id}

@app.post("/api/library/{item_id}/analyse")
async def analyse_item(item_id: str, background_tasks: BackgroundTasks):
    """Generate AI content intelligence for a library item"""
    item = await db.media_library.find_one({"item_id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.get("intelligence_status") == "running":
        return {"message": "Analysis already in progress"}

    # If no transcript yet, start transcription first then analyse
    transcript_text = ""
    if item.get("transcript") and item["transcript"].get("full_text"):
        transcript_text = item["transcript"]["full_text"]

    await db.media_library.update_one(
        {"item_id": item_id},
        {"$set": {"intelligence_status": "running"}}
    )

    # Get lesson context
    description = item.get("description", "")
    resource_links = item.get("resource_links", [])

    if transcript_text:
        background_tasks.add_task(
            run_intelligence,
            item_id,
            transcript_text,
            item.get("title", ""),
            item.get("source", ""),
            description,
            resource_links
        )
    else:
        # Need to transcribe first
        background_tasks.add_task(
            run_transcribe_then_analyse,
            item_id,
            item.get("source_url", ""),
            item.get("title", ""),
            item.get("source", ""),
            description,
            resource_links
        )

    return {"message": "Analysis started", "item_id": item_id}


async def run_transcription(item_id: str, source_url: str):
    """Background task: download audio and transcribe"""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # Download audio only
            audio_out = os.path.join(tmpdir, "audio.%(ext)s")
            cmd = ["/root/.venv/bin/yt-dlp", "--output", audio_out, "--format", "bestaudio",
                   "--extract-audio", "--audio-format", "mp3", "--no-warnings", source_url]
            proc = subprocess.run(cmd, capture_output=True, timeout=300)

            audio_files = list(Path(tmpdir).glob("*.mp3"))
            if not audio_files:
                # Try different extension
                audio_files = list(Path(tmpdir).glob("*.m4a")) + list(Path(tmpdir).glob("*.webm"))

            if not audio_files:
                raise Exception("Could not extract audio")

            transcript_result = transcribe_audio_file(str(audio_files[0]))
            await db.media_library.update_one(
                {"item_id": item_id},
                {"$set": {
                    "transcript": transcript_result,
                    "transcription_status": "complete" if not transcript_result.get("error") else "failed"
                }}
            )
    except Exception as e:
        await db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {"transcription_status": "failed", "transcript": {"error": str(e)}}}
        )

async def run_intelligence(item_id: str, transcript_text: str, title: str, source: str, description: str = "", resource_links: list = None):
    """Background task: generate AI intelligence from transcript with lesson context"""
    try:
        intelligence = await generate_content_intelligence(
            transcript_text, title, source, description, resource_links or []
        )
        await db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {
                "intelligence": intelligence,
                "intelligence_status": "complete" if not intelligence.get("error") else "failed"
            }}
        )
    except Exception as e:
        await db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {"intelligence_status": "failed", "intelligence": {"error": str(e)}}}
        )

async def run_transcribe_then_analyse(item_id: str, source_url: str, title: str, source: str, description: str = "", resource_links: list = None):
    """Transcribe then immediately analyse with lesson context"""
    await run_transcription(item_id, source_url)
    item = await db.media_library.find_one({"item_id": item_id})
    if item and item.get("transcript", {}).get("full_text"):
        await run_intelligence(
            item_id,
            item["transcript"]["full_text"],
            title,
            source,
            item.get("description", ""),
            item.get("resource_links", [])
        )
    else:
        await db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {"intelligence_status": "failed", "intelligence": {"error": "No transcript available"}}}
        )


# ─── PROMPTS ───────────────────────────────────────────────────────────────────

@app.post("/api/prompts")
async def create_prompt(prompt: PromptCreate):
    doc = {
        "prompt_id": str(uuid.uuid4()),
        **prompt.dict(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "use_count": 0
    }
    await db.prompts.insert_one(doc)
    return serialize_doc(doc)

@app.get("/api/prompts")
async def get_prompts(category: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
        ]
    prompts = await db.prompts.find(query).sort("created_at", -1).to_list(200)
    return [serialize_doc(p) for p in prompts]

@app.get("/api/prompts/{prompt_id}")
async def get_prompt(prompt_id: str):
    p = await db.prompts.find_one({"prompt_id": prompt_id})
    if not p:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return serialize_doc(p)

@app.put("/api/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, update: PromptUpdate):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    await db.prompts.update_one({"prompt_id": prompt_id}, {"$set": update_data})
    return serialize_doc(await db.prompts.find_one({"prompt_id": prompt_id}))

@app.post("/api/prompts/{prompt_id}/use")
async def increment_prompt_use(prompt_id: str):
    await db.prompts.update_one({"prompt_id": prompt_id}, {"$inc": {"use_count": 1}})
    return {"success": True}

@app.delete("/api/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str):
    await db.prompts.delete_one({"prompt_id": prompt_id})
    return {"success": True}


# ─── KANBAN ────────────────────────────────────────────────────────────────────

@app.post("/api/kanban/cards")
async def create_kanban_card(card: KanbanCardCreate):
    doc = {
        "card_id": str(uuid.uuid4()),
        **card.dict(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db.kanban_cards.insert_one(doc)
    return serialize_doc(doc)

@app.get("/api/kanban/cards")
async def get_kanban_cards():
    cards = await db.kanban_cards.find({}).sort("created_at", 1).to_list(500)
    return [serialize_doc(c) for c in cards]

@app.put("/api/kanban/cards/{card_id}")
async def update_kanban_card(card_id: str, update: KanbanCardUpdate):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    await db.kanban_cards.update_one({"card_id": card_id}, {"$set": update_data})
    return serialize_doc(await db.kanban_cards.find_one({"card_id": card_id}))

@app.delete("/api/kanban/cards/{card_id}")
async def delete_kanban_card(card_id: str):
    await db.kanban_cards.delete_one({"card_id": card_id})
    return {"success": True}


# ─── API VAULT ────────────────────────────────────────────────────────────────

@app.post("/api/vault/keys")
async def store_api_key(key_data: ApiKeyCreate):
    doc = {
        "key_id": str(uuid.uuid4()),
        "name": key_data.name,
        "service": key_data.service,
        "key_value": key_data.key_value,
        "notes": key_data.notes,
        "created_at": datetime.utcnow()
    }
    await db.api_vault.insert_one(doc)
    result = serialize_doc(doc)
    result["key_masked"] = key_data.key_value[:8] + "..." + key_data.key_value[-4:] if len(key_data.key_value) > 12 else "****"
    result["key_value"] = None
    return result

@app.get("/api/vault/keys")
async def get_api_keys():
    keys = await db.api_vault.find({}).sort("created_at", -1).to_list(200)
    result = []
    for k in keys:
        doc = serialize_doc(k)
        kv = doc.get("key_value", "")
        doc["key_masked"] = kv[:8] + "..." + kv[-4:] if kv and len(kv) > 12 else "****"
        doc["key_value"] = None
        result.append(doc)
    return result

@app.get("/api/vault/keys/{key_id}/reveal")
async def reveal_api_key(key_id: str):
    key = await db.api_vault.find_one({"key_id": key_id})
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"key_value": key["key_value"]}

@app.delete("/api/vault/keys/{key_id}")
async def delete_api_key(key_id: str):
    await db.api_vault.delete_one({"key_id": key_id})
    return {"success": True}


# ─── MODULES ───────────────────────────────────────────────────────────────────

@app.post("/api/modules")
async def create_module(module: ModuleCreate):
    doc = {
        "module_id": str(uuid.uuid4()),
        **module.dict(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True
    }
    await db.custom_modules.insert_one(doc)
    return serialize_doc(doc)

@app.get("/api/modules")
async def get_modules():
    modules = await db.custom_modules.find({}).sort("created_at", 1).to_list(100)
    return [serialize_doc(m) for m in modules]

@app.put("/api/modules/{module_id}")
async def update_module(module_id: str, module: ModuleCreate):
    update_data = module.dict()
    update_data["updated_at"] = datetime.utcnow()
    await db.custom_modules.update_one({"module_id": module_id}, {"$set": update_data})
    return serialize_doc(await db.custom_modules.find_one({"module_id": module_id}))

@app.delete("/api/modules/{module_id}")
async def delete_module(module_id: str):
    await db.custom_modules.delete_one({"module_id": module_id})
    return {"success": True}


# ─── TREND ANALYSER ───────────────────────────────────────────────────────────

@app.post("/api/trends/analyse")
async def analyse_trend(req: TrendAnalyseRequest):
    try:
        cmd = ["/root/.venv/bin/yt-dlp", "--dump-json", "--no-download", "--no-warnings", req.url]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        video_info = {}
        if proc.returncode == 0 and proc.stdout.strip():
            try:
                video_info = json.loads(proc.stdout.strip().split('\n')[0])
            except:
                pass

        analysis = await generate_trend_analysis(req.url, video_info, req.analysis_type)
        doc = {
            "analysis_id": str(uuid.uuid4()),
            "url": req.url,
            "analysis_type": req.analysis_type,
            "video_title": video_info.get('title', 'Unknown'),
            "video_duration": video_info.get('duration'),
            "thumbnail": video_info.get('thumbnail', ''),
            "analysis": analysis,
            "created_at": datetime.utcnow()
        }
        await db.trend_analyses.insert_one(doc)
        return serialize_doc(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trends")
async def get_trends():
    trends = await db.trend_analyses.find({}).sort("created_at", -1).limit(50).to_list(50)
    return [serialize_doc(t) for t in trends]

async def generate_trend_analysis(url: str, video_info: dict, analysis_type: str) -> dict:
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        title = video_info.get('title', 'Unknown video')
        duration = video_info.get('duration', 0)
        description = video_info.get('description', '')[:500]

        prompt = f"""Analyse this content creator video for business intelligence:

URL: {url}
Title: {title}
Duration: {duration}s
Description: {description[:300]}

Provide a JSON analysis with these fields:
1. hook_analysis: What is the opening hook strategy?
2. content_structure: How is the content structured?
3. engagement_triggers: What makes this engaging?
4. trending_audio_clues: Any references to trending audio/music?
5. content_ideas: 5 content ideas inspired by this
6. viral_factors: What could make this viral?
7. niche_relevance: What niche/audience is this for?
8. replication_strategy: How could you replicate this for your brand?

Return ONLY valid JSON."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message="You are an expert social media content strategist. Always respond with valid JSON."
        )
        response = await chat.send_message(UserMessage(text=prompt))
        try:
            text = response.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            return json.loads(text)
        except:
            return {"raw_analysis": response}
    except Exception as e:
        return {"error": str(e)}


# ─── INSTAGRAM ─────────────────────────────────────────────────────────────────

@app.post("/api/instagram/accounts")
async def add_instagram_account(account: InstagramAccount):
    doc = {
        "account_id": str(uuid.uuid4()),
        **account.dict(),
        "status": "active",
        "followers": 0,
        "posts": 0,
        "created_at": datetime.utcnow()
    }
    await db.instagram_accounts.insert_one(doc)
    return serialize_doc(doc)

@app.get("/api/instagram/accounts")
async def get_instagram_accounts():
    accounts = await db.instagram_accounts.find({}).sort("created_at", -1).to_list(20)
    return [serialize_doc(a) for a in accounts]

@app.delete("/api/instagram/accounts/{account_id}")
async def delete_instagram_account(account_id: str):
    await db.instagram_accounts.delete_one({"account_id": account_id})
    return {"success": True}

@app.post("/api/instagram/dm-rules")
async def create_dm_rule(rule: DMRule):
    doc = {
        "rule_id": str(uuid.uuid4()),
        **rule.dict(),
        "trigger_count": 0,
        "created_at": datetime.utcnow()
    }
    await db.dm_rules.insert_one(doc)
    return serialize_doc(doc)

@app.get("/api/instagram/dm-rules")
async def get_dm_rules(account_id: Optional[str] = None):
    query = {}
    if account_id:
        query["account_id"] = account_id
    rules = await db.dm_rules.find(query).sort("created_at", -1).to_list(100)
    return [serialize_doc(r) for r in rules]

@app.delete("/api/instagram/dm-rules/{rule_id}")
async def delete_dm_rule(rule_id: str):
    await db.dm_rules.delete_one({"rule_id": rule_id})
    return {"success": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
