from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import os, json, re, hashlib, uuid, subprocess, tempfile, requests
from pathlib import Path
from dotenv import load_dotenv
import asyncio

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
SKOOL_AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3OTU3MjMzMDgsImlhdCI6MTc2NDE4NzMwOCwidXNlcl9pZCI6IjVmMDYzNDJkZDlkOTQ1MzI5ZWY4ZDNmYTM5MDVmMDhhIn0.56Tn2FIJSMzNKH7CslUQ864ARd09SDvZxDyFVTzhoN0"
SKOOL_CLIENT_ID = "616914c797264fc0bca8d98e5bf1d09f"

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

async def upload_to_dropbox_async(local_path: str, source_type: str, filename: str):
    """Upload file to Dropbox and return shared link"""
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
        
        # Shared link
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
    """Scrape Loom video URLs from a Skool classroom page"""
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
        
        def find_videos(obj):
            found = []
            if isinstance(obj, dict):
                vid = obj.get('videoLink', '')
                if vid and any(p in str(vid) for p in ['loom.com', 'youtube.com', 'vimeo.com', 'wistia']):
                    title = obj.get('title', 'Untitled')
                    if isinstance(title, dict):
                        title = title.get('content', 'Untitled')
                    found.append({'title': str(title), 'url': vid, 'thumbnail': obj.get('videoThumbnail', '')})
                for v in obj.values():
                    found.extend(find_videos(v))
            elif isinstance(obj, list):
                for item in obj:
                    found.extend(find_videos(item))
            return found
        
        videos = find_videos(data)
        seen_urls = set()
        unique_videos = []
        for v in videos:
            if v['url'] not in seen_urls:
                seen_urls.add(v['url'])
                unique_videos.append(v)
        
        return unique_videos, None
    except Exception as e:
        return [], str(e)


async def run_download_job(job_id: str, url: str, source: str, options: dict):
    """Background task to download and process a video"""
    try:
        await db.download_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "downloading", "started_at": datetime.utcnow(), "progress": 10}}
        )
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_template = os.path.join(tmpdir, "%(title)s.%(ext)s")
            
            cmd = ["yt-dlp", "--output", output_template, "--no-warnings"]
            
            if source == "skool":
                # For Skool, the url is the Loom URL directly
                cmd += ["--format", "bestvideo[height<=720][ext=mp4]+bestaudio/best[height<=720]/best"]
            elif source == "pinterest":
                cmd += ["--format", "V_HLSV3_MOBILE-1431+V_HLSV3_MOBILE-audio1-1/V_HLSV3_MOBILE-783+V_HLSV3_MOBILE-audio1-1/bestvideo+bestaudio/best",
                        "--merge-output-format", "mp4"]
            else:
                cmd += ["--format", "best[ext=mp4]/best"]
            
            cmd.append(url)
            
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if proc.returncode != 0:
                raise Exception(f"yt-dlp error: {proc.stderr[:300]}")
            
            files = list(Path(tmpdir).glob("*"))
            if not files:
                raise Exception("No output file found")
            
            video_file = files[0]
            file_size = video_file.stat().st_size
            
            await db.download_jobs.update_one(
                {"job_id": job_id},
                {"$set": {"status": "uploading", "progress": 70, "filename": video_file.name, "file_size": file_size}}
            )
            
            # Upload to Dropbox
            dropbox_link, dropbox_path = await upload_to_dropbox_async(str(video_file), source, video_file.name)
            
            # Get video info
            info_cmd = ["yt-dlp", "--dump-json", "--no-download", "--no-warnings", url]
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
                "is_broll": False,
                "notes": "",
                "created_at": datetime.utcnow(),
                "job_id": job_id
            }
            await db.media_library.insert_one(media_item)
            
            await db.download_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "complete",
                    "progress": 100,
                    "completed_at": datetime.utcnow(),
                    "dropbox_link": dropbox_link,
                    "media_item_id": media_item["item_id"],
                    "title": title
                }}
            )
            
    except Exception as e:
        await db.download_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "failed", "error": str(e), "progress": 0}}
        )


# ─── MODELS ───────────────────────────────────────────────────────────────────

class SkoolDownloadRequest(BaseModel):
    loom_url: str
    lesson_title: Optional[str] = ""
    transcribe: bool = False
    analyze: bool = False

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
    analysis_type: Optional[str] = "full"  # full, audio, hook, structure


# ─── ROOT ─────────────────────────────────────────────────────────────────────

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


# ─── SKOOL ENDPOINTS ──────────────────────────────────────────────────────────

@app.post("/api/skool/scrape")
async def skool_scrape(req: SkoolScrapeRequest):
    """Scrape all Loom videos from a Skool classroom URL"""
    videos, error = scrape_skool_videos(req.classroom_url)
    if error and not videos:
        raise HTTPException(status_code=400, detail=f"Failed to scrape: {error}")
    return {"videos": videos, "count": len(videos)}


@app.post("/api/skool/download")
async def skool_download(req: SkoolDownloadRequest, background_tasks: BackgroundTasks):
    """Start a Skool/Loom video download job"""
    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "source": "skool",
        "url": req.loom_url,
        "title": req.lesson_title or "Skool Lesson",
        "status": "queued",
        "progress": 0,
        "options": {"transcribe": req.transcribe, "analyze": req.analyze},
        "created_at": datetime.utcnow(),
        "error": None,
        "dropbox_link": None
    }
    await db.download_jobs.insert_one(job)
    background_tasks.add_task(run_download_job, job_id, req.loom_url, "skool", {})
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/skool/jobs")
async def get_skool_jobs():
    jobs = await db.download_jobs.find({"source": "skool"}).sort("created_at", -1).limit(50).to_list(50)
    return [serialize_doc(j) for j in jobs]


# ─── PINTEREST ENDPOINTS ──────────────────────────────────────────────────────

@app.post("/api/pinterest/info")
async def pinterest_info(url: str = Query(...)):
    """Get video info from a Pinterest URL"""
    try:
        cmd = ["yt-dlp", "--dump-json", "--no-download", "--no-warnings", url]
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
        raise HTTPException(status_code=408, detail="Timeout extracting video info")


@app.post("/api/pinterest/download")
async def pinterest_download(req: PinterestDownloadRequest, background_tasks: BackgroundTasks):
    """Start a Pinterest video download job"""
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
        "dropbox_link": None
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
    """Search Pinterest for videos by keyword and queue batch download"""
    # Use yt-dlp with Pinterest search
    try:
        search_url = f"https://www.pinterest.com/search/pins/?q={req.keyword.replace(' ', '+')}&rs=typed"
        # For now, return the search URL for user to browse
        # In future: scrape search results and queue batch downloads
        return {
            "message": f"Search for '{req.keyword}' on Pinterest",
            "search_url": search_url,
            "tip": "Copy individual pin URLs and use the download form to batch download B-roll"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── JOBS (All) ───────────────────────────────────────────────────────────────

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


# ─── CONTENT LIBRARY ─────────────────────────────────────────────────────────

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
    return {
        "total_media": total,
        "skool_videos": skool_count,
        "pinterest_videos": pinterest_count,
        "broll_count": broll_count,
        "jobs_total": jobs_total,
        "jobs_complete": jobs_complete,
        "jobs_active": jobs_active
    }


# ─── PROMPT CREATOR ───────────────────────────────────────────────────────────

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
            {"tags": {"$in": [search]}}
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
    p = await db.prompts.find_one({"prompt_id": prompt_id})
    return serialize_doc(p)


@app.post("/api/prompts/{prompt_id}/use")
async def increment_prompt_use(prompt_id: str):
    await db.prompts.update_one({"prompt_id": prompt_id}, {"$inc": {"use_count": 1}})
    return {"success": True}


@app.delete("/api/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str):
    await db.prompts.delete_one({"prompt_id": prompt_id})
    return {"success": True}


# ─── KANBAN PLANNER ───────────────────────────────────────────────────────────

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
    card = await db.kanban_cards.find_one({"card_id": card_id})
    return serialize_doc(card)


@app.delete("/api/kanban/cards/{card_id}")
async def delete_kanban_card(card_id: str):
    await db.kanban_cards.delete_one({"card_id": card_id})
    return {"success": True}


# ─── API KEYS VAULT ───────────────────────────────────────────────────────────

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
    # Return with masked value
    result = serialize_doc(doc)
    result["key_masked"] = key_data.key_value[:8] + "..." + key_data.key_value[-4:] if len(key_data.key_value) > 12 else "****"
    result["key_value"] = None  # Never return full key
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


# ─── MODULES (Custom Side Hustles) ────────────────────────────────────────────

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
    m = await db.custom_modules.find_one({"module_id": module_id})
    return serialize_doc(m)


@app.delete("/api/modules/{module_id}")
async def delete_module(module_id: str):
    await db.custom_modules.delete_one({"module_id": module_id})
    return {"success": True}


# ─── TREND ANALYSER ───────────────────────────────────────────────────────────

@app.post("/api/trends/analyse")
async def analyse_trend(req: TrendAnalyseRequest):
    """AI-powered trend analysis of a URL (Instagram/TikTok post or video)"""
    try:
        # Extract video info
        cmd = ["yt-dlp", "--dump-json", "--no-download", "--no-warnings", req.url]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        video_info = {}
        if proc.returncode == 0 and proc.stdout.strip():
            try:
                video_info = json.loads(proc.stdout.strip().split('\n')[0])
            except:
                pass
        
        # Generate AI analysis using Emergent LLM
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
    """Generate AI analysis of a video/post"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        llm_key = os.getenv("EMERGENT_LLM_KEY", "")
        
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
            api_key=llm_key,
            session_id=str(uuid.uuid4()),
            system_message="You are an expert social media content strategist and trend analyser. Always respond with valid JSON."
        )
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        try:
            # Extract JSON from response
            text = response.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            return json.loads(text)
        except:
            return {"raw_analysis": response, "error": "Could not parse structured response"}
    except Exception as e:
        return {"error": str(e), "url": url, "basic_info": {"title": video_info.get('title', ''), "duration": video_info.get('duration', 0)}}


# ─── INSTAGRAM MANAGEMENT (Stub - ready for API integration) ──────────────────

class InstagramAccount(BaseModel):
    username: str
    account_type: str = "personal"  # personal, business, creator
    access_token: Optional[str] = ""
    notes: Optional[str] = ""

class DMRule(BaseModel):
    account_id: str
    trigger_keyword: str
    response_message: str
    send_link: Optional[str] = ""
    is_active: bool = True

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
