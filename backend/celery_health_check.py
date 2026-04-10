#!/usr/bin/env python3
"""
Celery Health Check and Auto-Recovery
Monitors Celery worker health and auto-restarts if needed
"""
import subprocess
import time
import sys

def check_celery_health():
    """Check if Celery worker is responding"""
    try:
        # Try to inspect Celery
        result = subprocess.run(
            ['celery', '-A', 'celery_tasks', 'inspect', 'ping'],
            cwd='/app/backend',
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and 'pong' in result.stdout.lower():
            return True, "Healthy"
        else:
            return False, f"No response: {result.stderr[:100]}"
    except subprocess.TimeoutExpired:
        return False, "Timeout - worker not responding"
    except Exception as e:
        return False, f"Error: {str(e)}"

def restart_celery():
    """Restart Celery worker via supervisorctl"""
    try:
        print("🔄 Restarting Celery worker...")
        result = subprocess.run(
            ['supervisorctl', 'restart', 'celery'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ Celery restarted successfully")
            time.sleep(5)  # Give it time to start
            return True
        else:
            print(f"❌ Failed to restart: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Restart error: {e}")
        return False

def main():
    """Main health check loop"""
    print("🏥 Celery Health Monitor Started")
    print("Checking worker health...\n")
    
    healthy, message = check_celery_health()
    
    if healthy:
        print(f"✅ Celery is healthy: {message}")
        sys.exit(0)
    else:
        print(f"⚠️  Celery unhealthy: {message}")
        print("Attempting auto-recovery...\n")
        
        if restart_celery():
            # Verify it's working after restart
            time.sleep(3)
            healthy, message = check_celery_health()
            
            if healthy:
                print(f"✅ Recovery successful: {message}")
                sys.exit(0)
            else:
                print(f"❌ Recovery failed: {message}")
                sys.exit(1)
        else:
            print("❌ Could not restart Celery")
            sys.exit(1)

if __name__ == '__main__':
    main()
