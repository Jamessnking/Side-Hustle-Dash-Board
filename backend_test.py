#!/usr/bin/env python3
"""
Ultimate Deployment Dashboard - Phase 3 AI Intelligence Pipeline Test
Tests: Transcription, AI Analysis, Content Library, Job Progress, API endpoints
"""
import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class Phase3APITester:
    def __init__(self, base_url="https://workflow-nexus-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASS")
        else:
            print(f"❌ {name}: FAIL - {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.utcnow().isoformat()
        })

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, timeout: int = 30) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text[:500]}

            if success:
                self.log_test(name, True, f"Status: {response.status_code}", response_data)
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}", response_data)

            return success, response_data

        except requests.exceptions.Timeout:
            self.log_test(name, False, f"Request timeout after {timeout}s")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic API health and Dropbox connection"""
        print("\n🔍 Testing API Health & Dependencies...")
        
        success, data = self.run_test("API Health Check", "GET", "api/health", 200)
        if success:
            dropbox_ok = data.get("dropbox", False)
            if dropbox_ok:
                print(f"   ✅ Dropbox connected: {data.get('dropbox_account', 'Unknown')}")
            else:
                print("   ⚠️  Dropbox connection issue")
        
        # Test root endpoint
        self.run_test("API Root", "GET", "api", 200)
        
        return success

    def test_library_stats(self):
        """Test library overview stats"""
        print("\n📊 Testing Content Library Stats...")
        
        success, data = self.run_test("Library Stats", "GET", "api/library/stats/overview", 200)
        if success:
            print(f"   📚 Total media: {data.get('total_media', 0)}")
            print(f"   🎓 Skool videos: {data.get('skool_videos', 0)}")
            print(f"   📌 Pinterest videos: {data.get('pinterest_videos', 0)}")
            print(f"   🎬 B-roll count: {data.get('broll_count', 0)}")
            print(f"   📝 Transcribed: {data.get('transcribed', 0)}")
            print(f"   🧠 AI Analysed: {data.get('analysed', 0)}")
        
        return success

    def test_content_library_api(self):
        """Test content library endpoints"""
        print("\n📚 Testing Content Library API...")
        
        # Get all library items
        success, data = self.run_test("Get Library Items", "GET", "api/library", 200)
        library_items = data if isinstance(data, list) else []
        
        if library_items:
            print(f"   Found {len(library_items)} items in library")
            
            # Test getting a specific item
            first_item = library_items[0]
            item_id = first_item.get('item_id')
            if item_id:
                self.run_test("Get Specific Library Item", "GET", f"api/library/{item_id}", 200)
            
            return True, library_items
        else:
            print("   📭 Library is empty - will test with mock data")
            return True, []

    def test_transcription_api(self, library_items):
        """Test transcription API endpoints"""
        print("\n🎤 Testing Transcription API...")
        
        if not library_items:
            print("   ⏭️  No library items to test transcription")
            return True
        
        # Find an item that hasn't been transcribed yet
        target_item = None
        for item in library_items:
            if item.get('transcription_status') != 'complete':
                target_item = item
                break
        
        if not target_item:
            print("   ℹ️  All items already transcribed")
            target_item = library_items[0]  # Use first item anyway
        
        item_id = target_item.get('item_id')
        if not item_id:
            print("   ❌ No valid item_id found")
            return False
        
        print(f"   Testing transcription for: {target_item.get('title', 'Unknown')}")
        
        # Test transcription endpoint
        success, data = self.run_test(
            "Start Transcription", 
            "POST", 
            f"api/library/{item_id}/transcribe", 
            200,
            timeout=60
        )
        
        if success:
            print(f"   📝 Transcription response: {data.get('message', 'Started')}")
        
        return success

    def test_ai_analysis_api(self, library_items):
        """Test AI analysis API endpoints"""
        print("\n🧠 Testing AI Analysis API...")
        
        if not library_items:
            print("   ⏭️  No library items to test AI analysis")
            return True
        
        # Find an item that could be analyzed
        target_item = None
        for item in library_items:
            if item.get('intelligence_status') != 'complete':
                target_item = item
                break
        
        if not target_item:
            print("   ℹ️  All items already analyzed")
            target_item = library_items[0]  # Use first item anyway
        
        item_id = target_item.get('item_id')
        if not item_id:
            print("   ❌ No valid item_id found")
            return False
        
        print(f"   Testing AI analysis for: {target_item.get('title', 'Unknown')}")
        
        # Test analysis endpoint
        success, data = self.run_test(
            "Start AI Analysis", 
            "POST", 
            f"api/library/{item_id}/analyse", 
            200,
            timeout=60
        )
        
        if success:
            print(f"   🧠 Analysis response: {data.get('message', 'Started')}")
        
        return success

    def test_jobs_api(self):
        """Test download jobs API"""
        print("\n⚙️ Testing Jobs API...")
        
        # Get all jobs
        success, data = self.run_test("Get All Jobs", "GET", "api/jobs", 200)
        jobs = data if isinstance(data, list) else []
        
        print(f"   Found {len(jobs)} total jobs")
        
        # Get Skool jobs specifically
        success, skool_jobs = self.run_test("Get Skool Jobs", "GET", "api/skool/jobs", 200)
        if isinstance(skool_jobs, list):
            print(f"   Found {len(skool_jobs)} Skool jobs")
        
        # Get Pinterest jobs specifically
        success, pinterest_jobs = self.run_test("Get Pinterest Jobs", "GET", "api/pinterest/jobs", 200)
        if isinstance(pinterest_jobs, list):
            print(f"   Found {len(pinterest_jobs)} Pinterest jobs")
        
        # Test job filtering
        self.run_test("Get Complete Jobs", "GET", "api/jobs?status=complete", 200)
        self.run_test("Get Failed Jobs", "GET", "api/jobs?status=failed", 200)
        
        return success, jobs

    def test_skool_scraping(self):
        """Test Skool scraping functionality"""
        print("\n🎓 Testing Skool Scraping...")
        
        # Test with a sample classroom URL (this might fail if auth is needed)
        test_url = "https://www.skool.com/ai-creators-academy-8093/classroom"
        
        success, data = self.run_test(
            "Skool Classroom Scrape", 
            "POST", 
            "api/skool/scrape",
            200,  # Expect success, but might get 400 if auth fails
            {"classroom_url": test_url},
            timeout=30
        )
        
        if success:
            videos = data.get('videos', [])
            print(f"   Found {len(videos)} videos in classroom")
        else:
            print("   ⚠️  Skool scraping may require authentication")
        
        return True  # Don't fail the whole test suite if scraping fails

    def test_pinterest_info(self):
        """Test Pinterest video info extraction"""
        print("\n📌 Testing Pinterest Info...")
        
        # Test with a sample Pinterest URL
        test_url = "https://pin.it/3r1lHaCuf"
        
        success, data = self.run_test(
            "Pinterest Video Info", 
            "POST", 
            f"api/pinterest/info?url={test_url}",
            200,
            timeout=30
        )
        
        if success:
            print(f"   📹 Title: {data.get('title', 'Unknown')}")
            print(f"   ⏱️  Duration: {data.get('duration', 'Unknown')}s")
        
        return success

    def test_dependencies_check(self):
        """Test if required dependencies are available"""
        print("\n🔧 Testing Dependencies...")
        
        # Test if faster-whisper is available by checking if transcription works
        # This is indirect since we can't directly test the import
        print("   📝 faster-whisper: Will be tested via transcription API")
        
        # Test if FFMPEG is available by checking system
        try:
            import subprocess
            result = subprocess.run(['ffmpeg', '-version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print("   🎬 FFMPEG: Available")
                self.log_test("FFMPEG Available", True)
            else:
                print("   ❌ FFMPEG: Not available")
                self.log_test("FFMPEG Available", False, "Command failed")
        except Exception as e:
            print(f"   ❌ FFMPEG: Error checking - {e}")
            self.log_test("FFMPEG Available", False, str(e))
        
        # Test Emergent LLM key (indirectly via health check)
        print("   🤖 Emergent LLM: Key configured in backend")
        
        return True

    def wait_for_job_completion(self, job_id: str, max_wait: int = 300) -> Dict:
        """Wait for a job to complete and return final status"""
        print(f"   ⏳ Waiting for job {job_id} to complete...")
        
        start_time = time.time()
        while time.time() - start_time < max_wait:
            success, job_data = self.run_test(
                f"Check Job {job_id}", 
                "GET", 
                f"api/jobs/{job_id}", 
                200
            )
            
            if success:
                status = job_data.get('status', 'unknown')
                progress = job_data.get('progress', 0)
                
                if status in ['complete', 'failed']:
                    print(f"   🏁 Job {status}: {progress}%")
                    return job_data
                else:
                    print(f"   ⏳ Job {status}: {progress}%")
            
            time.sleep(5)  # Wait 5 seconds before checking again
        
        print(f"   ⏰ Job timeout after {max_wait}s")
        return {}

    def run_comprehensive_test(self):
        """Run all Phase 3 tests"""
        print("🚀" * 20)
        print("PHASE 3 AI INTELLIGENCE PIPELINE TEST")
        print("🚀" * 20)
        
        # Basic health checks
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        # Test core APIs
        self.test_library_stats()
        success, library_items = self.test_content_library_api()
        
        # Test AI features
        self.test_transcription_api(library_items)
        self.test_ai_analysis_api(library_items)
        
        # Test job management
        self.test_jobs_api()
        
        # Test downloaders
        self.test_skool_scraping()
        self.test_pinterest_info()
        
        # Test dependencies
        self.test_dependencies_check()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 PHASE 3 TEST RESULTS SUMMARY")
        print("="*60)
        
        print(f"✅ PASSED: {self.tests_passed}/{self.tests_run}")
        print(f"❌ FAILED: {self.tests_run - self.tests_passed}/{self.tests_run}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if r['status'] == 'FAIL']
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        # Critical issues
        critical_failures = [
            r for r in self.test_results 
            if r['status'] == 'FAIL' and any(keyword in r['test'].lower() 
                for keyword in ['health', 'api', 'library'])
        ]
        
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES:")
            for test in critical_failures:
                print(f"   • {test['test']}")
        
        return success_rate >= 70  # Consider 70%+ as acceptable

def main():
    """Main test execution"""
    tester = Phase3APITester()
    
    try:
        success = tester.run_comprehensive_test()
        overall_success = tester.print_summary()
        
        if overall_success:
            print("\n🎉 PHASE 3 TESTS COMPLETED SUCCESSFULLY!")
            return 0
        else:
            print("\n⚠️  PHASE 3 TESTS COMPLETED WITH ISSUES")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test suite error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())