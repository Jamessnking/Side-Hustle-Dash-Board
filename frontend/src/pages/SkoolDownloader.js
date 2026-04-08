import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  BookOpen, Download, ExternalLink, RefreshCw, Play, Loader2,
  Search, Brain, FileText, CheckCircle2, AlertCircle, Clock, Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { StatusBadge, PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Maps status to icon + colour
function JobStatusIcon({ status }) {
  if (status === 'complete') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === 'failed') return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (['downloading', 'uploading'].includes(status)) return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
  return <Clock className="w-4 h-4 text-muted-foreground" />;
}

export default function SkoolDownloader() {
  const [classroomUrl, setClassroomUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedLoomUrl, setSelectedLoomUrl] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [transcribe, setTranscribe] = useState(false);
  const [analyze, setAnalyze] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const pollRef = useRef(null);
  const notifiedJobs = useRef(new Set());

  const loadJobs = useCallback(async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/skool/jobs`);
      const newJobs = r.data;

      // Fire toast notifications for newly completed/failed jobs
      newJobs.forEach(job => {
        if (!notifiedJobs.current.has(job.job_id)) {
          if (job.status === 'complete') {
            notifiedJobs.current.add(job.job_id);
            toast.success(`✅ Download complete: ${job.title || 'Skool lesson'}`, {
              description: job.dropbox_link ? 'Saved to Dropbox' : undefined,
              action: job.dropbox_link ? {
                label: 'Open',
                onClick: () => window.open(job.dropbox_link, '_blank')
              } : undefined,
              duration: 6000
            });
          } else if (job.status === 'failed') {
            notifiedJobs.current.add(job.job_id);
            toast.error(`❌ Download failed: ${job.title || 'Skool lesson'}`, {
              description: job.error?.slice(0, 80),
              duration: 8000
            });
          }
        }
      });

      setJobs(newJobs);
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadJobs();
    pollRef.current = setInterval(loadJobs, 3000);
    return () => clearInterval(pollRef.current);
  }, [loadJobs]);

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
      toast.error('Failed to scrape: ' + (e.response?.data?.detail || e.message));
    } finally {
      setScraping(false);
    }
  };

  const handleSelectVideo = (video) => {
    setSelectedLoomUrl(video.url);
    setSelectedTitle(video.title);
    // Store full video object for metadata
    setSelectedVideo(video);
  };

  const handleDownload = async () => {
    if (!selectedLoomUrl) { toast.error('Select or paste a video URL'); return; }
    setDownloading(true);
    try {
      const payload = {
        loom_url: selectedLoomUrl,
        lesson_title: selectedTitle,
        transcribe,
        analyze
      };
      
      // Add metadata if available from scraping
      if (selectedVideo) {
        payload.description = selectedVideo.description || "";
        payload.resource_links = selectedVideo.resource_links || [];
        payload.metadata = selectedVideo.metadata || {};
      }
      
      const res = await axios.post(`${BACKEND_URL}/api/skool/download`, payload);
      if (res.data.status === 'duplicate') {
        toast.info('Already downloaded! Available in Content Library.');
      } else {
        toast.success('Download queued!');
      }
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
          analyze,
          description: v.description || "",
          resource_links: v.resource_links || [],
          metadata: v.metadata || {}
        });
        queued++;
      } catch {}
    }
    toast.success(`Queued ${queued} downloads!`);
    loadJobs();
  };

  const handleDeleteJob = async (jobId) => {
    await axios.delete(`${BACKEND_URL}/api/jobs/${jobId}`);
    loadJobs();
  };

  const activeJobs = jobs.filter(j => ['queued', 'downloading', 'uploading'].includes(j.status));

  return (
    <div data-testid="skool-downloader-page">
      <PageHeader
        title="Skool Downloader"
        description="Scrape lessons from your Skool classroom. Optionally transcribe & generate AI content intelligence."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-4">
          {/* Step 1: Scrape */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              Paste Skool Classroom URL
            </h2>
            <div className="space-y-3">
              <Input
                value={classroomUrl}
                onChange={e => setClassroomUrl(e.target.value)}
                placeholder="https://www.skool.com/your-community/classroom/..."
                className="font-mono text-xs bg-surface-2"
                data-testid="skool-classroom-url-input"
                onKeyDown={e => e.key === 'Enter' && handleScrape()}
              />
              <Button onClick={handleScrape} disabled={scraping || !classroomUrl}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="skool-scrape-button">
                {scraping
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scraping...</>
                  : <><Search className="w-4 h-4 mr-2" />Scrape Classroom</>}
              </Button>
            </div>
          </div>

          {/* Step 2: Download */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/30 text-primary text-xs flex items-center justify-center font-bold">2</span>
              Configure & Download
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Loom Video URL</Label>
                <Input value={selectedLoomUrl} onChange={e => setSelectedLoomUrl(e.target.value)}
                  placeholder="https://www.loom.com/share/..."
                  className="font-mono text-xs bg-surface-2"
                  data-testid="skool-loom-url-input" />
              </div>

              {/* Intelligence options */}
              <div className="rounded-lg bg-surface-2 border border-border/50 p-3">
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-primary" /> Learning Intelligence
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs cursor-pointer" htmlFor="transcribe">Transcribe Audio</Label>
                      <p className="text-xs text-muted-foreground">Auto-generate full transcript</p>
                    </div>
                    <Switch checked={transcribe} onCheckedChange={v => { setTranscribe(v); if (!v) setAnalyze(false); }} id="transcribe" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className={`text-xs cursor-pointer ${!transcribe ? 'opacity-40' : ''}`} htmlFor="analyze">
                        AI Content Intelligence
                      </Label>
                      <p className={`text-xs text-muted-foreground ${!transcribe ? 'opacity-40' : ''}`}>
                        Extract hooks, scripts, carousel ideas
                      </p>
                    </div>
                    <Switch checked={analyze} onCheckedChange={setAnalyze} id="analyze" disabled={!transcribe} />
                  </div>
                </div>
              </div>

              {(transcribe || analyze) && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
                  <p className="text-xs text-primary flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    {analyze ? 'Will transcribe + generate content intelligence after download' : 'Will transcribe audio after download'}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleDownload} disabled={downloading || !selectedLoomUrl}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="skool-download-submit-button">
                  {downloading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Queuing...</>
                    : <><Download className="w-4 h-4 mr-2" />Download Selected</>}
                </Button>
                {videos.length > 0 && (
                  <Button onClick={handleDownloadAll} variant="outline" className="border-border/70">
                    All ({videos.length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          {/* Scraped Videos */}
          {videos.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> {videos.length} Lessons Found
              </h2>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {videos.map((v, i) => (
                  <button key={i} onClick={() => handleSelectVideo(v)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                      selectedLoomUrl === v.url
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/60 border border-transparent'
                    }`}
                    data-testid="skool-video-item">
                    <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs text-muted-foreground">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{v.title}</p>
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
                <Download className="w-4 h-4 text-primary" /> Download Jobs
                {activeJobs.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{activeJobs.length} active</span>
                )}
              </h2>
              <button onClick={loadJobs} className="text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            {jobs.length === 0
              ? <EmptyState icon={Download} title="No jobs yet" description="Queue a download above" />
              : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {jobs.map(job => (
                    <JobCard key={job.id} job={job} onDelete={handleDeleteJob} />
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, onDelete }) {
  const isActive = ['queued', 'downloading', 'uploading'].includes(job.status);
  const log = Array.isArray(job.log) ? job.log : [];

  return (
    <div className={`rounded-lg border bg-surface-2 p-3 transition-all ${
      isActive ? 'border-primary/30' : job.status === 'complete' ? 'border-green-500/20' : 'border-border/50'
    }`} data-testid="download-job-row">
      <div className="flex items-start gap-2 mb-2">
        <JobStatusIcon status={job.status} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{job.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={job.status} />
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(job.created_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
        {job.dropbox_link && (
          <a href={job.dropbox_link} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 shrink-0">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {isActive && (
        <>
          <Progress value={job.progress || 0} className="h-1.5 mb-1.5" />
          <p className="text-xs text-muted-foreground">{job.progress || 0}% complete</p>
        </>
      )}

      {log.length > 0 && (
        <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{log[log.length - 1]}</p>
      )}

      {job.status === 'failed' && job.error && (
        <p className="text-xs text-red-400 mt-1 truncate">{job.error}</p>
      )}

      {job.status !== 'downloading' && (
        <button onClick={() => onDelete(job.job_id)}
          className="text-xs text-muted-foreground/50 hover:text-red-400 mt-1.5 float-right transition-colors">
          remove
        </button>
      )}
    </div>
  );
}
