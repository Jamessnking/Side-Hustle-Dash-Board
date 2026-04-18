#!/usr/bin/env python3
"""
Fetch titles for failed Loom videos
"""
import requests
from bs4 import BeautifulSoup
import time

failed_loom_ids = [
    "8bd5f78ed0674cd899c77a59aba9e7e5",
    "4097ed6e2ebb47f080e7ec893bf4b39e",
    "1f9e9dbb76c447c195e3d12c1e64aecb",
    "0d8bcfc92a6e42bda7a65df8df1cef27",
    "78f43cd054ab4b63a61aa72bb93b7e09",
    "0e71fca82b094eb18e6bfe64b23758fa",
    "6d2ec78fb35e4b66bf3ff6db81ba17b8",
    "77d96a6c6dd84c2786eb5f7ce9e9b2a2",
    "62bf73b14d034b92ae9f1db59ff7ad7e",
    "41d79e68125e479692cb7f10f3695ad8",
    "dbd68d5c764f480299a51f26ee623dd0",
    "e2c0f50d68384f0ab07e3b5d22b70c22",
    "3f9bc48fa20b49558af6ebf8f58e4aec",
    "04c2ecad02584c078a2a84e7c93e3f85",
    "c2f5cf5cd44544e3a4ead35bedb90c58",
    "0f3bf6f5b33e4af5add36e1fae1e6fa1",
    "ae5fdc4e06d54df7900becc7d3af7e91",
    "60c68c61050e4276adaf00bb2c7d1b00",
    "a72a9113e3ae4a689015ad3c9f8df806",
    "70d456047e8d40368d695490ba3aa802"
]

print("📋 Fetching titles for 20 failed Loom videos...")
print("=" * 80)

results = []

for i, loom_id in enumerate(failed_loom_ids, 1):
    url = f"https://www.loom.com/share/{loom_id}"
    
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Try to find title in meta tags
            title = None
            
            # Method 1: og:title meta tag
            og_title = soup.find('meta', property='og:title')
            if og_title and og_title.get('content'):
                title = og_title['content']
            
            # Method 2: title tag
            if not title:
                title_tag = soup.find('title')
                if title_tag:
                    title = title_tag.text.strip()
            
            # Method 3: Twitter title
            if not title:
                twitter_title = soup.find('meta', {'name': 'twitter:title'})
                if twitter_title and twitter_title.get('content'):
                    title = twitter_title['content']
            
            if title:
                # Clean up title
                title = title.replace(' | Loom', '').strip()
                results.append({
                    'id': loom_id,
                    'title': title,
                    'status': 'Found',
                    'url': url
                })
                print(f"{i}. ✅ {title[:60]}")
            else:
                results.append({
                    'id': loom_id,
                    'title': 'Title not found in page',
                    'status': 'No title',
                    'url': url
                })
                print(f"{i}. ⚠️  Video exists but no title found")
        
        elif response.status_code == 404:
            results.append({
                'id': loom_id,
                'title': 'Video deleted or not found',
                'status': 'Deleted',
                'url': url
            })
            print(f"{i}. ❌ Video deleted/not found (404)")
        
        elif response.status_code == 403:
            results.append({
                'id': loom_id,
                'title': 'Access forbidden (private video)',
                'status': 'Private',
                'url': url
            })
            print(f"{i}. 🔒 Private/forbidden (403)")
        
        else:
            results.append({
                'id': loom_id,
                'title': f'HTTP {response.status_code}',
                'status': 'Error',
                'url': url
            })
            print(f"{i}. ⚠️  HTTP {response.status_code}")
        
        time.sleep(1)  # Be nice to Loom's servers
        
    except Exception as e:
        results.append({
            'id': loom_id,
            'title': f'Error: {str(e)[:50]}',
            'status': 'Error',
            'url': url
        })
        print(f"{i}. ❌ Error: {str(e)[:50]}")

print("\n" + "=" * 80)
print("\n📊 Summary by Status:")
found = len([r for r in results if r['status'] == 'Found'])
deleted = len([r for r in results if r['status'] == 'Deleted'])
private = len([r for r in results if r['status'] == 'Private'])
error = len([r for r in results if r['status'] in ['Error', 'No title']])

print(f"   ✅ Titles found: {found}")
print(f"   ❌ Deleted: {deleted}")
print(f"   🔒 Private: {private}")
print(f"   ⚠️  Errors: {error}")

# Save to file
with open('/app/FAILED_VIDEOS_WITH_TITLES.txt', 'w') as f:
    f.write("FAILED DOWNLOADS - Video Titles\n")
    f.write("=" * 80 + "\n\n")
    
    for i, result in enumerate(results, 1):
        f.write(f"{i}. {result['title']}\n")
        f.write(f"   URL: {result['url']}\n")
        f.write(f"   Status: {result['status']}\n\n")

print(f"\n✅ Results saved to: /app/FAILED_VIDEOS_WITH_TITLES.txt")
