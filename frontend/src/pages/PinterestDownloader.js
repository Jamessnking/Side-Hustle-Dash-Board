import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Image, Download, ExternalLink, RefreshCw, Search, Loader2, Tag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { StatusBadge, PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PinterestDownloader() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [searching, setSearching] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [jobs, setJobs] = useState([]);
  const pollRef = useRef(null);

  const loadJobs = async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/pinterest/jobs`);
      setJobs(r.data);
    } catch (e) {}
  };

  useEffect(() => {
    loadJobs();
    pollRef.current = setInterval(loadJobs, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleCheckUrl = async () => {
    if (!url.includes('pin.it') && !url.includes('pinterest.com')) {
      toast.error('Please enter a valid Pinterest URL');
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
      await axios.post(`${BACKEND_URL}/api/pinterest/download`, { url, title: title || 'Pinterest Video' });
      toast.success('Download queued!');
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

  const handleTrendSearch = () => {
    if (!keyword) return;
    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}&rs=typed`;
    window.open(searchUrl, '_blank');
    toast.info('Pinterest search opened in new tab. Copy pin URLs to download B-roll.');
  };

  const activeJobs = jobs.filter(j => ['queued', 'downloading', 'uploading'].includes(j.status));

  return (
    <div data-testid="pinterest-downloader-page">
      <PageHeader
        title="Pinterest B-Roll"
        description="Download B-roll footage from Pinterest. Search by keyword for trend-matching content."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Forms */}
        <div className="space-y-4">
          {/* URL Download */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" />
              Download from URL
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Pinterest Pin URL</Label>
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://pin.it/... or https://pinterest.com/pin/..."
                  className="font-mono text-xs bg-surface-2"
                  data-testid="pinterest-url-input"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Title (optional)</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Describe this B-roll..."
                  className="text-xs bg-surface-2"
                />
              </div>

              {videoInfo && (
                <div className="flex gap-3 p-3 rounded-lg bg-surface-2 border border-border/50">
                  {videoInfo.thumbnail && (
                    <img src={videoInfo.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-medium text-foreground">{videoInfo.title}</p>
                    {videoInfo.duration && <p className="text-xs text-muted-foreground mt-0.5">{Math.round(videoInfo.duration)}s</p>}
                    <p className="text-xs text-green-400 mt-1">✓ Ready to download</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCheckUrl}
                  disabled={searching || !url}
                  variant="outline"
                  className="border-border/70"
                  data-testid="pinterest-check-button"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={downloading || !url}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="pinterest-download-button"
                >
                  {downloading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Queuing...</> : <><Download className="w-4 h-4 mr-2" />Download to Dropbox</>}
                </Button>
              </div>
            </div>
          </div>

          {/* Trend Search */}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Trend-Based B-Roll Search
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Find B-roll matching trending content topics</p>
            <div className="space-y-3">
              <Input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="e.g. 'aesthetic workspace', 'morning routine', 'gym motivation'"
                className="text-xs bg-surface-2"
                data-testid="pinterest-keyword-input"
                onKeyDown={e => e.key === 'Enter' && handleTrendSearch()}
              />
              <Button
                onClick={handleTrendSearch}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Pinterest for B-Roll
              </Button>
              <p className="text-xs text-muted-foreground">Opens Pinterest search in new tab. Copy pin URLs to download.</p>
            </div>
          </div>
        </div>

        {/* Right: Jobs */}
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
            <EmptyState icon={Download} title="No jobs yet" description="Queue a Pinterest download above" />
          ) : (
            <div className="space-y-2">
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
  );
}
