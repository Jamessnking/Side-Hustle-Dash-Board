"""
Ultimate Deployment Dashboard - Core POC Test
Tests: Skool (Loom) video scrape+download + Pinterest video download + Dropbox upload
"""
import os
import json
import re
import requests
import hashlib
import tempfile
import subprocess
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

DROPBOX_TOKEN = os.getenv("DROPBOX_ACCESS_TOKEN")
SKOOL_COOKIES = os.getenv("SKOOL_COOKIES_PATH", "/app/backend/skool_cookies.txt")
DROPBOX_FOLDER = os.getenv("DROPBOX_UPLOAD_FOLDER", "/UltimateDashboard")

# Skool: The URL for a classroom lesson
SKOOL_CLASSROOM_URL = "https://www.skool.com/ai-creators-academy-8093/classroom/f197d3d5?md=99e0aa1f538d40649a09f537914fd4b6"
# Skool auth cookie (from cookies file)
SKOOL_AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3OTU3MjMzMDgsImlhdCI6MTc2NDE4NzMwOCwidXNlcl9pZCI6IjVmMDYzNDJkZDlkOTQ1MzI5ZWY4ZDNmYTM5MDVmMDhhIn0.56Tn2FIJSMzNKH7CslUQ864ARd09SDvZxDyFVTzhoN0"
SKOOL_CLIENT_ID = "616914c797264fc0bca8d98e5bf1d09f"

PINTEREST_TEST_URL = "https://pin.it/3r1lHaCuf"

results = {"skool": {}, "pinterest": {}, "dropbox": {}}

# ─── 1. DROPBOX CONNECTION ─────────────────────────────────────────────────────
def test_dropbox_connection():
    print("\n" + "="*60)
    print("TEST 1: Dropbox Connection")
    print("="*60)
    try:
        import dropbox
        dbx = dropbox.Dropbox(DROPBOX_TOKEN)
        account = dbx.users_get_current_account()
        display_name = account.name.display_name  # Fix: use name.display_name
        email = account.email
        print(f"✅ Connected as: {display_name} ({email})")
        results["dropbox"]["connection"] = "PASS"
        results["dropbox"]["account"] = display_name
        return dbx
    except Exception as e:
        print(f"❌ Dropbox connection failed: {e}")
        results["dropbox"]["connection"] = f"FAIL: {e}"
        return None

# ─── 2. DROPBOX UPLOAD TEST ────────────────────────────────────────────────────
def test_dropbox_upload(dbx):
    print("\n" + "="*60)
    print("TEST 2: Dropbox Upload (small test file)")
    print("="*60)
    if not dbx:
        print("⏭️  Skipping - no Dropbox connection")
        return False
    try:
        import dropbox as dbx_module
        test_content = f"Ultimate Dashboard POC Test - {datetime.now().isoformat()}".encode()
        test_path = f"{DROPBOX_FOLDER}/test/poc_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        try:
            dbx.files_create_folder_v2(f"{DROPBOX_FOLDER}/test")
        except:
            pass
        
        metadata = dbx.files_upload(
            test_content, test_path,
            mode=dbx_module.files.WriteMode("overwrite")
        )
        print(f"✅ Uploaded: {metadata.path_display}")
        
        # Shared link
        try:
            settings = dbx_module.sharing.SharedLinkSettings(
                requested_visibility=dbx_module.sharing.RequestedVisibility.public
            )
            link = dbx.sharing_create_shared_link_with_settings(test_path, settings=settings)
            print(f"✅ Shared link: {link.url}")
            results["dropbox"]["upload"] = "PASS"
            results["dropbox"]["test_link"] = link.url
        except dbx_module.exceptions.ApiError as e:
            if e.error.is_shared_link_already_exists():
                links = dbx.sharing_list_shared_links(path=test_path, direct_only=True)
                if links.links:
                    print(f"✅ Existing link: {links.links[0].url}")
                    results["dropbox"]["upload"] = "PASS"
            else:
                results["dropbox"]["upload"] = "PASS (no link)"
        return True
    except Exception as e:
        print(f"❌ Dropbox upload failed: {e}")
        results["dropbox"]["upload"] = f"FAIL: {e}"
        return False

# ─── 3. SKOOL: SCRAPE LOOM VIDEO URLS FROM CLASSROOM ─────────────────────────
def scrape_skool_videos(classroom_url):
    print("\n" + "="*60)
    print("TEST 3: Skool Classroom Scrape (extract Loom URLs)")
    print("="*60)
    try:
        session = requests.Session()
        session.cookies.set('auth_token', SKOOL_AUTH_TOKEN, domain='.skool.com')
        session.cookies.set('client_id', SKOOL_CLIENT_ID, domain='.skool.com')
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        resp = session.get(classroom_url, headers=headers, timeout=30)
        
        if resp.status_code != 200:
            print(f"❌ HTTP {resp.status_code}")
            results["skool"]["scrape"] = f"FAIL: HTTP {resp.status_code}"
            return []
        
        # Extract __NEXT_DATA__
        next_data_match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', resp.text, re.DOTALL)
        if not next_data_match:
            print("❌ No __NEXT_DATA__ found")
            results["skool"]["scrape"] = "FAIL: No __NEXT_DATA__"
            return []
        
        data = json.loads(next_data_match.group(1))
        
        # Recursively find all video links
        def find_videos(obj):
            found = []
            if isinstance(obj, dict):
                vid = obj.get('videoLink', '')
                if vid and ('loom.com' in str(vid) or 'youtube.com' in str(vid) or 'vimeo.com' in str(vid)):
                    title = obj.get('title', 'Untitled')
                    if isinstance(title, dict):
                        title = title.get('content', 'Untitled')
                    found.append({'title': str(title), 'url': vid})
                for v in obj.values():
                    found.extend(find_videos(v))
            elif isinstance(obj, list):
                for item in obj:
                    found.extend(find_videos(item))
            return found
        
        videos = find_videos(data)
        # Deduplicate
        seen_urls = set()
        unique_videos = []
        for v in videos:
            if v['url'] not in seen_urls:
                seen_urls.add(v['url'])
                unique_videos.append(v)
        
        print(f"✅ Found {len(unique_videos)} videos in Skool classroom:")
        for i, v in enumerate(unique_videos[:5]):
            print(f"   {i+1}. {v['title'][:60]} -> {v['url'][:60]}...")
        
        results["skool"]["scrape"] = "PASS"
        results["skool"]["videos_found"] = len(unique_videos)
        return unique_videos
        
    except Exception as e:
        print(f"❌ Skool scrape error: {e}")
        results["skool"]["scrape"] = f"FAIL: {e}"
        return []

# ─── 4. SKOOL: GET VIDEO INFO VIA yt-dlp (Loom) ───────────────────────────────
def test_skool_video_info(videos):
    print("\n" + "="*60)
    print("TEST 4: Skool Video Info (yt-dlp on Loom URL)")
    print("="*60)
    if not videos:
        print("⏭️  No videos to test")
        results["skool"]["info"] = "SKIPPED"
        return None
    
    # Use first video
    target = videos[0]
    print(f"Testing: {target['title']}")
    print(f"URL: {target['url']}")
    
    try:
        cmd = ["yt-dlp", "--dump-json", "--no-download", "--no-warnings", target['url']]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if proc.returncode == 0 and proc.stdout.strip():
            info = json.loads(proc.stdout.strip().split('\n')[0])
            print(f"✅ Video info extracted!")
            print(f"   Title: {info.get('title', 'Unknown')}")
            print(f"   Duration: {info.get('duration', 0)}s")
            print(f"   Format: {info.get('ext', 'mp4')}")
            results["skool"]["info"] = "PASS"
            results["skool"]["loom_url"] = target['url']
            return {**info, '_skool_title': target['title'], '_loom_url': target['url']}
        else:
            print(f"❌ yt-dlp error: {proc.stderr[:300]}")
            results["skool"]["info"] = f"FAIL: {proc.stderr[:200]}"
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        results["skool"]["info"] = f"FAIL: {e}"
        return None

# ─── 5. SKOOL: DOWNLOAD LOOM VIDEO ────────────────────────────────────────────
def test_skool_download(dbx, info):
    print("\n" + "="*60)
    print("TEST 5: Skool/Loom Video Download + Dropbox Upload")
    print("="*60)
    if not info:
        print("⏭️  Skipping")
        results["skool"]["download"] = "SKIPPED"
        return
    
    loom_url = info.get('_loom_url') or info.get('webpage_url', '')
    
    with tempfile.TemporaryDirectory() as tmpdir:
        safe_title = re.sub(r'[^\w\s-]', '', info.get('_skool_title', 'skool_video'))[:50]
        output_template = os.path.join(tmpdir, f"{safe_title}.%(ext)s")
        
        cmd = [
            "yt-dlp",
            "--output", output_template,
            "--format", "bestvideo[height<=480][ext=mp4]+bestaudio/best[height<=480]/best",
            "--no-warnings",
            loom_url
        ]
        
        print(f"Downloading (max 480p for POC speed)...")
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if proc.returncode == 0:
                files = list(Path(tmpdir).glob("*"))
                if files:
                    video_file = files[0]
                    file_size = video_file.stat().st_size
                    print(f"✅ Downloaded: {video_file.name} ({file_size/1024/1024:.1f} MB)")
                    results["skool"]["download"] = "PASS"
                    results["skool"]["file_size_mb"] = round(file_size/1024/1024, 2)
                    
                    if dbx:
                        upload_to_dropbox(dbx, str(video_file), "skool", video_file.name)
                else:
                    print("❌ No output file found")
                    results["skool"]["download"] = "FAIL: No file"
            else:
                print(f"❌ yt-dlp error: {proc.stderr[:400]}")
                results["skool"]["download"] = f"FAIL: {proc.stderr[:200]}"
        except subprocess.TimeoutExpired:
            print("❌ Download timeout - trying shorter format...")
            results["skool"]["download"] = "FAIL: Timeout"

# ─── 6. PINTEREST INFO ─────────────────────────────────────────────────────────
def test_pinterest_info():
    print("\n" + "="*60)
    print("TEST 6: Pinterest Video Info")
    print("="*60)
    try:
        cmd = ["yt-dlp", "--dump-json", "--no-download", "--no-warnings", PINTEREST_TEST_URL]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if proc.returncode == 0 and proc.stdout.strip():
            info = json.loads(proc.stdout.strip().split('\n')[0])
            print(f"✅ Pinterest video found!")
            print(f"   Title: {info.get('title', 'N/A')}")
            print(f"   Duration: {info.get('duration', 'N/A')}s")
            results["pinterest"]["info"] = "PASS"
            results["pinterest"]["title"] = info.get('title', '')
            return info
        else:
            print(f"❌ {proc.stderr[:300]}")
            results["pinterest"]["info"] = f"FAIL: {proc.stderr[:200]}"
            return None
    except Exception as e:
        print(f"❌ {e}")
        results["pinterest"]["info"] = f"FAIL: {e}"
        return None

# ─── 7. PINTEREST DOWNLOAD ─────────────────────────────────────────────────────
def test_pinterest_download(dbx, info):
    print("\n" + "="*60)
    print("TEST 7: Pinterest Video Download + Dropbox Upload")
    print("="*60)
    if not info:
        print("⏭️  Skipping")
        results["pinterest"]["download"] = "SKIPPED"
        return
    
    with tempfile.TemporaryDirectory() as tmpdir:
        output_template = os.path.join(tmpdir, "%(id)s.%(ext)s")
        
        # Use format ID directly from what we saw available
        cmd = [
            "yt-dlp",
            "--output", output_template,
            "--format", "V_HLSV3_MOBILE-1431+V_HLSV3_MOBILE-audio1-1/V_HLSV3_MOBILE-783+V_HLSV3_MOBILE-audio1-1/bestvideo+bestaudio/best",
            "--no-warnings",
            "--merge-output-format", "mp4",
            PINTEREST_TEST_URL
        ]
        
        print(f"Downloading Pinterest video...")
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if proc.returncode == 0:
                files = list(Path(tmpdir).glob("*"))
                if files:
                    video_file = files[0]
                    file_size = video_file.stat().st_size
                    print(f"✅ Downloaded: {video_file.name} ({file_size/1024/1024:.1f} MB)")
                    results["pinterest"]["download"] = "PASS"
                    results["pinterest"]["file_size_mb"] = round(file_size/1024/1024, 2)
                    
                    if dbx:
                        upload_to_dropbox(dbx, str(video_file), "pinterest", video_file.name)
                else:
                    print("❌ No file found")
                    results["pinterest"]["download"] = "FAIL: No file"
            else:
                # Fallback: try without format spec
                print(f"First attempt failed, trying fallback...")
                cmd2 = ["yt-dlp", "--output", output_template, "--no-warnings", PINTEREST_TEST_URL]
                proc2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=120)
                if proc2.returncode == 0:
                    files = list(Path(tmpdir).glob("*"))
                    if files:
                        video_file = files[0]
                        file_size = video_file.stat().st_size
                        print(f"✅ Downloaded (fallback): {video_file.name} ({file_size/1024/1024:.1f} MB)")
                        results["pinterest"]["download"] = "PASS"
                        if dbx:
                            upload_to_dropbox(dbx, str(video_file), "pinterest", video_file.name)
                    else:
                        results["pinterest"]["download"] = "FAIL: No file"
                else:
                    print(f"❌ {proc2.stderr[:400]}")
                    results["pinterest"]["download"] = f"FAIL: {proc2.stderr[:200]}"
        except subprocess.TimeoutExpired:
            print("❌ Timeout")
            results["pinterest"]["download"] = "FAIL: Timeout"

# ─── HELPER: Upload to Dropbox ─────────────────────────────────────────────────
def upload_to_dropbox(dbx, local_path, source_type, filename):
    import dropbox as dbx_module
    try:
        date_str = datetime.now().strftime("%Y-%m")
        # Clean filename
        clean_name = re.sub(r'[^\w\s.-]', '_', filename)
        dropbox_path = f"{DROPBOX_FOLDER}/{source_type}/{date_str}/{clean_name}"
        
        try:
            dbx.files_create_folder_v2(f"{DROPBOX_FOLDER}/{source_type}/{date_str}")
        except:
            pass
        
        file_size = os.path.getsize(local_path)
        CHUNK = 150 * 1024 * 1024
        
        print(f"   Uploading {filename} ({file_size/1024/1024:.1f}MB) to Dropbox...")
        
        if file_size <= CHUNK:
            with open(local_path, "rb") as f:
                metadata = dbx.files_upload(f.read(), dropbox_path, mode=dbx_module.files.WriteMode("overwrite"))
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
                        metadata = dbx.files_upload_session_finish(chunk, cursor, commit)
                        break
                    dbx.files_upload_session_append_v2(chunk, cursor)
                    cursor = dbx_module.files.UploadSessionCursor(session_id=cursor.session_id, offset=cursor.offset + len(chunk))
        
        print(f"   ✅ Uploaded: {dropbox_path}")
        
        # Create shared link
        try:
            settings = dbx_module.sharing.SharedLinkSettings(
                requested_visibility=dbx_module.sharing.RequestedVisibility.public
            )
            link = dbx.sharing_create_shared_link_with_settings(dropbox_path, settings=settings)
            print(f"   ✅ Dropbox link: {link.url}")
            results[source_type]["dropbox_upload"] = "PASS"
            results[source_type]["dropbox_link"] = link.url
        except dbx_module.exceptions.ApiError as e:
            if e.error.is_shared_link_already_exists():
                links = dbx.sharing_list_shared_links(path=dropbox_path, direct_only=True)
                if links.links:
                    print(f"   ✅ Link: {links.links[0].url}")
                    results[source_type]["dropbox_upload"] = "PASS"
            else:
                results[source_type]["dropbox_upload"] = "PASS (no link)"
    except Exception as e:
        print(f"   ❌ Dropbox error: {e}")
        results[source_type]["dropbox_upload"] = f"FAIL: {e}"

# ─── MAIN ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🚀 " * 20)
    print("ULTIMATE DEPLOYMENT DASHBOARD - CORE POC")
    print("🚀 " * 20)
    
    dbx = test_dropbox_connection()
    test_dropbox_upload(dbx)
    videos = scrape_skool_videos(SKOOL_CLASSROOM_URL)
    skool_info = test_skool_video_info(videos)
    test_skool_download(dbx, skool_info)
    pinterest_info = test_pinterest_info()
    test_pinterest_download(dbx, pinterest_info)
    
    print("\n" + "="*60)
    print("📊 RESULTS SUMMARY")
    print("="*60)
    print(json.dumps(results, indent=2))
    
    passes = sum(1 for s in results.values() for v in s.values() if v == "PASS")
    fails = sum(1 for s in results.values() for v in s.values() if isinstance(v, str) and v.startswith("FAIL"))
    
    print(f"\n✅ PASSES: {passes}  ❌ FAILURES: {fails}")
    if fails == 0:
        print("\n🎉 ALL CORE TESTS PASSED - Ready to build the app!")
    else:
        print("\n⚠️  Some tests failed - review above")
