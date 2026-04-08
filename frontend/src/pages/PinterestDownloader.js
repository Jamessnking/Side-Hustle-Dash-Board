import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Image, Download, ExternalLink, RefreshCw, Search, Loader2,
  Tag, CheckCircle2, AlertCircle, Clock, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { StatusBadge, PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function JobStatusIcon({ status }) {
  if (status === 'complete') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === 'failed') return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (['downloading', 'uploading'].includes(status)) return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
  return <Clock className="w-4 h-4 text-muted-foreground" />;
}

export default function PinterestDownloader() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [searching, setSearching] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [batchQueuing, setBatchQueuing] = useState(false);
  const [jobs, setJobs] = useState([]);
  const pollRef = useRef(null);
  const notifiedJobs = useRef(new Set());

  const loadJobs = useCallback(async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/pinterest/jobs`);
      const newJobs = r.data;
      newJobs.forEach(job => {
        if (!notifiedJobs.current.has(job.job_id)) {
          if (job.status === 'complete') {
            notifiedJobs.current.add(job.job_id);
            toast.success(`✅ B-Roll saved: ${job.title}`, {
              action: job.dropbox_link ? { label: 'Open', onClick: () => window.open(job.dropbox_link, '_blank') } : undefined,
              duration: 5000
            });
          } else if (job.status === 'failed') {
            notifiedJobs.current.add(job.job_id);
            toast.error(`❌ Failed: ${job.title}`, { description: job.error?.slice(0, 60), duration: 6000 });
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

  const handleCheckUrl = async () => {
    if (!url.includes('pin.it') && !url.includes('pinterest.com')) {
      toast.error('Enter a valid Pinterest URL');
      return;
    }
    setSearching(true);
    setVideoInfo(null);
    try {
      const r = await axios.post(`${BACKEND_URL}/api/pinterest/info?url=${encodeURIComponent(url)}`);
      setVideoInfo(r.data);
      setTitle(r.data.title || 'Pinterest Video');
    } catch (e) {
      toast.error('Could not get video info: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async () => {
    if (!url) { toast.error('Enter a Pinterest URL first'); return; }
    setDownloading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/pinterest/download`, { url, title: title || 'Pinterest Video' });
      if (res.data.status === 'duplicate') {
        toast.info('Already in library! Reusing existing download.');
      } else {
        toast.success('Download queued!');
      }
      setUrl('');
      setTitle('');
      setVideoInfo(null);
      loadJobs();
    } catch (e) {
      toast.error('Download failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setDownloading(false);
    }
  };

  const handleBatchDownload = async () => {
    const urls = batchUrls.split('\n').map(u => u.trim()).filter(u => u.includes('pin'));
    if (!urls.length) { toast.error('Enter Pinterest URLs (one per line)'); return; }
    setBatchQueuing(true);
    let queued = 0;
    let dupes = 0;
    for (const u of urls) {
      try {
        const res = await axios.post(`${BACKEND_URL}/api/pinterest/download`, { url: u, title: 'B-Roll' });
        if (res.data.status === 'duplicate') dupes++;
        else queued++;
      } catch {}
    }
    toast.success(`Queued ${queued} downloads${dupes > 0 ? `, ${dupes} already in library` : ''}`);
    setBatchUrls('');
    setBatchQueuing(false);
    loadJobs();
  };

  const handleTrendSearch = () => {
    if (!keyword) return;
    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}&rs=typed`;
    window.open(searchUrl, '_blank');
    toast.info('Pinterest opened. Copy pin URLs to download B-roll below.');
  };

  const handleDeleteJob = async (jobId) => {
    await axios.delete(`${BACKEND_URL}/api/jobs/${jobId}`);
    loadJobs();
  };

  const activeJobs = jobs.filter(j => ['queued', 'downloading', 'uploading'].includes(j.status));

  return (
    <div data-testid="pinterest-downloader-page">
      <PageHeader
        title="Pinterest B-Roll"
        description="Download B-roll from Pinterest. Trend-search → copy URLs → batch download → Dropbox."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-4">
          {/* Single URL */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" /> Single Pin Download
            </h2>
            <div className="space-y-3">
              <Input value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://pin.it/... or https://pinterest.com/pin/..."
                className="font-mono text-xs bg-surface-2"
                data-testid="pinterest-url-input"
                onKeyDown={e => e.key === 'Enter' && handleCheckUrl()} />
              <Input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Label this B-roll (optional)" className="text-xs bg-surface-2" />

              {videoInfo && (
                <div className="flex gap-3 p-3 rounded-lg bg-surface-2 border border-green-500/20">
                  {videoInfo.thumbnail && (
                    <img src={videoInfo.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-medium text-foreground">{videoInfo.title}</p>
                    {videoInfo.duration && <p className="text-xs text-muted-foreground">{Math.round(videoInfo.duration)}s</p>}
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready to download
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleCheckUrl} disabled={searching || !url} variant="outline" className="border-border/70"
                  data-testid="pinterest-check-button">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
                <Button onClick={handleDownload} disabled={downloading || !url}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="pinterest-download-button">
                  {downloading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Queuing...</>
                    : <><Download className="w-4 h-4 mr-2" />Download to Dropbox</>}
                </Button>
              </div>
            </div>
          </div>

          {/* Batch Download */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" /> Batch Download
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Paste multiple Pinterest URLs (one per line)</p>
            <textarea
              value={batchUrls}
              onChange={e => setBatchUrls(e.target.value)}
              placeholder={"https://pin.it/abc123\nhttps://pin.it/def456\nhttps://pin.it/ghi789"}
              className="w-full rounded-lg border border-border/70 bg-surface-2 p-2.5 text-xs text-foreground font-mono resize-none h-24 mb-3"
            />
            <Button onClick={handleBatchDownload} disabled={batchQueuing || !batchUrls}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {batchQueuing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Queuing...</>
                : <><Download className="w-4 h-4 mr-2" />Queue All URLs</>}
            </Button>
          </div>

          {/* Trend Search */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" /> Trend-Based B-Roll Search
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Find B-roll matching trending topics — opens Pinterest search</p>
            <div className="flex gap-2">
              <Input value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="e.g. 'aesthetic workspace', 'gym motivation'"
                className="text-xs bg-surface-2" data-testid="pinterest-keyword-input"
                onKeyDown={e => e.key === 'Enter' && handleTrendSearch()} />
              <Button onClick={handleTrendSearch} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Jobs */}
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
            ? <EmptyState icon={Download} title="No jobs yet" description="Queue a Pinterest download above" />
            : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {jobs.map(job => (
                  <div key={job.id} className={`rounded-lg border bg-surface-2 p-3 ${
                    ['downloading', 'uploading'].includes(job.status) ? 'border-primary/30' :
                    job.status === 'complete' ? 'border-green-500/20' : 'border-border/50'
                  }`} data-testid="download-job-row">
                    <div className="flex items-start gap-2 mb-1.5">
                      <JobStatusIcon status={job.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{job.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={job.status} />
                          <span className="text-xs text-muted-foreground font-mono">{new Date(job.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {job.dropbox_link && (
                          <a href={job.dropbox_link} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {job.status !== 'downloading' && (
                          <button onClick={() => handleDeleteJob(job.job_id)} className="text-muted-foreground/40 hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {['downloading', 'uploading'].includes(job.status) && (
                      <>
                        <Progress value={job.progress || 0} className="h-1.5 mb-1" />
                        <p className="text-xs text-muted-foreground">{job.progress || 0}%</p>
                      </>
                    )}
                    {Array.isArray(job.log) && job.log.length > 0 && (
                      <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{job.log[job.log.length - 1]}</p>
                    )}
                    {job.status === 'failed' && job.error && (
                      <p className="text-xs text-red-400 mt-1 truncate">{job.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
