#!/usr/bin/env python3
"""
Split large audio file and transcribe with OpenAI Whisper API
"""
import sys
import os
import tempfile
import subprocess
sys.path.insert(0, '/app/backend')

from pymongo import MongoClient
from openai import OpenAI
from pydub import AudioSegment
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
OPENAI_KEY = os.environ.get('OPENAI_API_KEY')

# Target chunk size: 20MB (to stay under 25MB limit with some buffer)
MAX_CHUNK_SIZE_MB = 20
MAX_CHUNK_SIZE_BYTES = MAX_CHUNK_SIZE_MB * 1024 * 1024

def download_audio(url, output_path):
    """Download audio from URL using yt-dlp"""
    print(f"📥 Downloading audio from: {url[:60]}...")
    
    cmd = [
        '/root/.venv/bin/yt-dlp',
        '-f', 'bestaudio/best',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--ffmpeg-location', '/usr/bin/ffmpeg',
        '-o', output_path,
        '--no-playlist',
        '--no-check-certificate',
        url
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    
    if result.returncode != 0:
        raise Exception(f"Download failed: {result.stderr[:200]}")
    
    if not os.path.exists(output_path):
        raise Exception("Downloaded file not found")
    
    file_size = os.path.getsize(output_path)
    print(f"   ✅ Downloaded: {file_size / 1024 / 1024:.1f} MB")
    
    return file_size

def split_audio(audio_path, chunk_dir):
    """Split audio file into chunks under 20MB each"""
    print(f"\n✂️  Splitting audio into chunks...")
    
    # Load audio
    audio = AudioSegment.from_mp3(audio_path)
    duration_ms = len(audio)
    file_size = os.path.getsize(audio_path)
    
    print(f"   Duration: {duration_ms / 1000 / 60:.1f} minutes")
    print(f"   Size: {file_size / 1024 / 1024:.1f} MB")
    
    # Calculate chunk duration based on file size
    # bytes_per_ms = file_size / duration_ms
    # chunk_duration_ms = int((MAX_CHUNK_SIZE_BYTES / bytes_per_ms) * 0.9)  # 90% to be safe
    
    # Simpler approach: split into equal time chunks
    num_chunks = (file_size // MAX_CHUNK_SIZE_BYTES) + 1
    chunk_duration_ms = duration_ms // num_chunks
    
    print(f"   Splitting into ~{num_chunks} chunks of ~{chunk_duration_ms / 1000 / 60:.1f} min each")
    
    chunks = []
    for i in range(0, duration_ms, chunk_duration_ms):
        chunk = audio[i:i + chunk_duration_ms]
        
        # Skip chunks shorter than 1 second
        if len(chunk) < 1000:
            continue
            
        chunk_path = os.path.join(chunk_dir, f'chunk_{len(chunks):03d}.mp3')
        chunk.export(chunk_path, format='mp3', bitrate='128k')
        
        chunk_size = os.path.getsize(chunk_path)
        
        # Skip empty chunks
        if chunk_size < 10000:  # Less than 10KB
            continue
            
        print(f"   ✅ Chunk {len(chunks)+1}: {chunk_size / 1024 / 1024:.1f} MB")
        chunks.append(chunk_path)
    
    return chunks

def transcribe_chunk(chunk_path, chunk_num, total_chunks):
    """Transcribe a single chunk with OpenAI Whisper"""
    print(f"\n🎤 Transcribing chunk {chunk_num}/{total_chunks}...")
    
    client = OpenAI(api_key=OPENAI_KEY)
    
    with open(chunk_path, 'rb') as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment"]
        )
    
    segments_count = len(transcription.segments) if hasattr(transcription, 'segments') else 0
    print(f"   ✅ Complete: {segments_count} segments")
    
    return transcription

def merge_transcripts(transcriptions, chunk_duration_ms):
    """Merge multiple transcriptions into one"""
    print(f"\n🔗 Merging {len(transcriptions)} transcripts...")
    
    all_segments = []
    full_text_parts = []
    time_offset = 0
    
    for i, transcription in enumerate(transcriptions):
        full_text_parts.append(transcription.text)
        
        if hasattr(transcription, 'segments') and transcription.segments:
            for segment in transcription.segments:
                # Adjust timestamps based on chunk position
                adjusted_segment = {
                    "start": (segment.get('start', 0) if isinstance(segment, dict) else getattr(segment, 'start', 0)) + time_offset,
                    "end": (segment.get('end', 0) if isinstance(segment, dict) else getattr(segment, 'end', 0)) + time_offset,
                    "text": segment.get('text', '') if isinstance(segment, dict) else getattr(segment, 'text', '')
                }
                all_segments.append(adjusted_segment)
        
        # Update offset for next chunk (use chunk duration in seconds)
        time_offset += chunk_duration_ms / 1000
    
    merged = {
        "full_text": " ".join(full_text_parts),
        "segments": all_segments,
        "language": getattr(transcriptions[0], 'language', 'en') if transcriptions else 'en',
        "duration": time_offset
    }
    
    print(f"   ✅ Merged: {len(all_segments)} total segments")
    
    return merged

def main(item_id, source_url):
    """Main function to split and transcribe"""
    print(f"🎬 Processing Large Video")
    print(f"   Item ID: {item_id}")
    print("=" * 80)
    
    # Connect to DB
    client = MongoClient(MONGO_URL)
    db = client.ultimate_deployment
    
    # Update status
    db.media_library.update_one(
        {"item_id": item_id},
        {"$set": {"transcription_status": "running"}}
    )
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Download audio
        audio_path = os.path.join(temp_dir, 'full_audio.mp3')
        file_size = download_audio(source_url, audio_path)
        
        # Split into chunks
        chunk_dir = os.path.join(temp_dir, 'chunks')
        os.makedirs(chunk_dir, exist_ok=True)
        chunks = split_audio(audio_path, chunk_dir)
        
        # Calculate chunk duration for timestamp adjustment
        audio = AudioSegment.from_mp3(audio_path)
        chunk_duration_ms = len(audio) // len(chunks)
        
        # Transcribe each chunk
        transcriptions = []
        for i, chunk_path in enumerate(chunks):
            transcription = transcribe_chunk(chunk_path, i+1, len(chunks))
            transcriptions.append(transcription)
        
        # Merge results
        merged_transcript = merge_transcripts(transcriptions, chunk_duration_ms)
        
        # Save to database
        db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {
                "transcript": merged_transcript,
                "transcription_status": "complete"
            }}
        )
        
        print(f"\n✅ SUCCESS!")
        print(f"   Total segments: {len(merged_transcript['segments'])}")
        print(f"   Total duration: {merged_transcript['duration'] / 60:.1f} minutes")
        print(f"   Transcript length: {len(merged_transcript['full_text'])} characters")
        
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        db.media_library.update_one(
            {"item_id": item_id},
            {"$set": {
                "transcription_status": "failed",
                "transcription_error": f"Split transcription failed: {str(e)}"
            }}
        )
        return False
        
    finally:
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    item_id = "8b45f47d-6e0e-4020-81b5-df12be23ebc3"
    source_url = "https://www.loom.com/share/071bff2fe7724d8c869c318539adf582?sid=e3659bfa-fc99-44d2-8e35-e337db7b55f8"
    
    success = main(item_id, source_url)
    sys.exit(0 if success else 1)
