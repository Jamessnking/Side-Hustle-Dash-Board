import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { BookOpen, Download, ExternalLink, RefreshCw, Play, Loader2, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { StatusBadge, PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function SkoolDownloader() {
  const [classroomUrl, setClassroomUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedLoomUrl, setSelectedLoomUrl] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [transcribe, setTranscribe] = useState(false);
  const [analyze, setAnalyze] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const pollRef = useRef(null);

  const loadJobs = async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/skool/jobs`);
      setJobs(r.data);
    } catch (e) {}
  };

  useEffect(() => {
    loadJobs();
    pollRef.current = setInterval(loadJobs, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleScrape = async () => {
    if (!classroomUrl.includes('skool.com')) {
      toast.error('Please enter a valid Skool classroom URL');
      return;
    }
    setScraping(true);
    setVideos([]);
    try {
      const r = await axios.post(`${BACKEND_URL}/api/skool/scrape`, { classroom_url: classroomUrl });
      setVideos(r.data.videos);
      toast.success(`Found ${r.data.count} videos in this classroom!`);
    } catch (e) {
      toast.error('Failed to scrape classroom: ' + (e.response?.data?.detail || e.message));
    } finally {
      setScraping(false);
    }
  };

  const handleSelectVideo = (video) => {
    setSelectedLoomUrl(video.url);
    setSelectedTitle(video.title);
  };

  const handleDownload = async () => {
    if (!selectedLoomUrl) {
      toast.error('Please select a video to download');
      return;
    }
    setDownloading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/skool/download`, {
        loom_url: selectedLoomUrl,
        lesson_title: selectedTitle,
        transcribe,
        analyze
      });
      toast.success('Download queued! Check job status below.');
      loadJobs();
    } catch (e) {
      toast.error('Download failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!videos.length) return;
    let queued = 0;
    for (const v of videos) {
      try {
        await axios.post(`${BACKEND_URL}/api/skool/download`, {
          loom_url: v.url,
          lesson_title: v.title,
          transcribe,
          analyze
        });
        queued++;
      } catch {}
    }
    toast.success(`Queued ${queued} downloads!`);
    loadJobs();
  };

  const activeJobs = jobs.filter(j => ['queued', 'downloading', 'uploading'].includes(j.status));

  return (
    <div data-testid="skool-downloader-page">
      <PageHeader
        title="Skool Downloader"
        description="Scrape and download lessons from your Skool classroom. Videos are saved to Dropbox."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          {/* Step 1: Scrape */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
              Paste Skool Classroom URL
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Classroom URL</Label>
                <Input
                  value={classroomUrl}
                  onChange={e => setClassroomUrl(e.target.value)}
                  placeholder="https://www.skool.com/your-community/classroom/..."
                  className="font-mono text-xs bg-surface-2"
                  data-testid="skool-classroom-url-input"
                />
              </div>
              <Button
                onClick={handleScrape}
                disabled={scraping || !classroomUrl}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="skool-scrape-button"
              >
                {scraping ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scraping...</> : <><Search className="w-4 h-4 mr-2" />Scrape Videos</>}
              </Button>
            </div>
          </div>

          {/* Step 2: Select & Download */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/30 text-primary text-xs flex items-center justify-center">2</span>
              Select Video & Download
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Loom Video URL (auto-filled on selection)</Label>
                <Input
                  value={selectedLoomUrl}
                  onChange={e => setSelectedLoomUrl(e.target.value)}
                  placeholder="https://www.loom.com/share/..."
                  className="font-mono text-xs bg-surface-2"
                  data-testid="skool-loom-url-input"
                />
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="flex items-center gap-2">
                  <Switch checked={transcribe} onCheckedChange={setTranscribe} id="transcribe" />
                  <Label htmlFor="transcribe" className="text-xs cursor-pointer">Transcribe</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={analyze} onCheckedChange={setAnalyze} id="analyze" />
                  <Label htmlFor="analyze" className="text-xs cursor-pointer">AI Analyse</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  disabled={downloading || !selectedLoomUrl}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="skool-download-submit-button"
                >
                  {downloading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Queuing...</> : <><Download className="w-4 h-4 mr-2" />Download Selected</>}
                </Button>
                {videos.length > 0 && (
                  <Button
                    onClick={handleDownloadAll}
                    variant="outline"
                    className="border-border/70"
                  >
                    All ({videos.length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Video List & Jobs */}
        <div className="space-y-4">
          {/* Scraped Videos */}
          {videos.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Found {videos.length} Videos
              </h2>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {videos.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectVideo(v)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                      selectedLoomUrl === v.url
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/60 border border-transparent'
                    }`}
                    data-testid="skool-video-item"
                  >
                    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs text-muted-foreground">{i+1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{v.title}</p>
                      <p className="text-xs text-muted-foreground truncate font-mono">{v.url.slice(0,40)}...</p>
                    </div>
                    {selectedLoomUrl === v.url && <Play className="w-3 h-3 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Jobs */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                Download Jobs
                {activeJobs.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{activeJobs.length}</span>
                )}
              </h2>
              <button onClick={loadJobs} className="text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            {jobs.length === 0 ? (
              <EmptyState icon={Download} title="No jobs yet" description="Queue a download above" />
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {jobs.map(job => (
                  <div key={job.id} className="rounded-lg border border-border/50 bg-surface-2 p-3" data-testid="download-job-row">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-foreground truncate flex-1 mr-2">{job.title}</p>
                      <StatusBadge status={job.status} />
                    </div>
                    {['downloading', 'uploading'].includes(job.status) && (
                      <Progress value={job.progress || 0} className="h-1 mb-1.5" />
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-mono">{new Date(job.created_at).toLocaleTimeString()}</p>
                      {job.dropbox_link && (
                        <a href={job.dropbox_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />Dropbox
                        </a>
                      )}
                    </div>
                    {job.error && <p className="text-xs text-red-400 mt-1">{job.error}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
