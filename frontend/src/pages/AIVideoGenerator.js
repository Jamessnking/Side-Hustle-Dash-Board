import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Sparkles,
  Video,
  Clock,
  Wand2,
  Download,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Play
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { PageHeader } from '../components/shared';
import { Card } from '../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AIVideoGenerator() {
  // State
  const [videoType, setVideoType] = useState('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [duration, setDuration] = useState(15);
  const [quality, setQuality] = useState('720p');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [pollingJobs, setPollingJobs] = useState(new Set());

  // Load existing jobs
  const loadJobs = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/kling/jobs`);
      setJobs(res.data.jobs || []);
    } catch (e) {
      console.error('Failed to load jobs:', e);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Poll individual job status
  const pollJobStatus = async (jobId) => {
    if (pollingJobs.has(jobId)) return;
    
    setPollingJobs(prev => new Set(prev).add(jobId));
    
    try {
      const res = await axios.get(`${BACKEND_URL}/api/kling/status/${jobId}`);
      const job = res.data;
      
      // Update job in list
      setJobs(prev => prev.map(j => j.job_id === jobId ? job : j));
      
      if (job.status === 'completed') {
        toast.success('Video generation complete!', {
          description: 'Video saved to Content Library'
        });
        setPollingJobs(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      } else if (job.status === 'failed' || job.status === 'timeout') {
        toast.error('Video generation failed', {
          description: job.error || 'Unknown error'
        });
        setPollingJobs(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to poll job:', e);
      setPollingJobs(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  // Start polling for processing jobs
  useEffect(() => {
    const processingJobs = jobs.filter(j => j.status === 'processing');
    processingJobs.forEach(job => {
      if (!pollingJobs.has(job.job_id)) {
        pollJobStatus(job.job_id);
      }
    });
  }, [jobs]);

  // Generate video
  const handleGenerate = async () => {
    if (videoType === 'text-to-video' && !prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    
    if (videoType === 'image-to-video' && !imageUrl.trim()) {
      toast.error('Please enter an image URL');
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        prompt: prompt.trim(),
        duration,
        quality,
        aspect_ratio: aspectRatio,
        video_type: videoType
      };
      
      if (videoType === 'image-to-video') {
        payload.image_url = imageUrl.trim();
      }

      const res = await axios.post(`${BACKEND_URL}/api/kling/generate`, payload);
      
      if (res.data.success) {
        toast.success('Video generation started!', {
          description: `Job ID: ${res.data.job_id}`
        });
        
        // Add to jobs list
        setJobs(prev => [res.data, ...prev]);
        
        // Clear form
        setPrompt('');
        setImageUrl('');
        
        // Start polling this job
        pollJobStatus(res.data.job_id);
      }
    } catch (e) {
      toast.error('Failed to start generation', {
        description: e.response?.data?.detail || e.message
      });
    } finally {
      setGenerating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
      case 'timeout':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed':
      case 'timeout':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'processing':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-border/20';
    }
  };

  return (
    <div data-testid="ai-video-generator-page" className="pb-8">
      <PageHeader
        title="AI Video Generator"
        description="Generate Instagram Reels with Kling AI - automatically saved to Content Library"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: VIDEO GENERATOR FORM */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 bg-card border-border/70">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Create AI Video
              </h3>
              <span className="text-xs text-muted-foreground">Powered by Kling AI</span>
            </div>

            {/* Video Type Tabs */}
            <Tabs value={videoType} onValueChange={setVideoType} className="mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/40">
                <TabsTrigger value="text-to-video" className="text-xs">
                  <Wand2 className="w-3 h-3 mr-1.5" />
                  Text to Video
                </TabsTrigger>
                <TabsTrigger value="image-to-video" className="text-xs">
                  <ImageIcon className="w-3 h-3 mr-1.5" />
                  Image to Video
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Prompt - always shown */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  {videoType === 'text-to-video' ? 'Video Description *' : 'Animation Instructions'}
                </Label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={videoType === 'text-to-video' 
                    ? "Describe your video in detail... e.g., 'A golden retriever running through a sunlit meadow with butterflies'"
                    : "Describe how the image should animate... e.g., 'Camera slowly zooms in while clouds move'"
                  }
                  className="w-full rounded-lg border border-border/70 bg-background p-3 text-sm text-foreground resize-none focus:ring-2 focus:ring-primary/20"
                  rows={4}
                  data-testid="prompt-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {prompt.length} / 2500 characters
                </p>
              </div>

              {/* Image URL - only for image-to-video */}
              {videoType === 'image-to-video' && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Image URL *
                  </Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://your-cdn.com/image.jpg or Dropbox public link"
                    className="text-xs bg-background"
                    data-testid="image-url-input"
                  />
                </div>
              )}

              {/* Duration Slider */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Duration: {duration} seconds
                </Label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5s</span>
                  <span>30s</span>
                  <span>60s</span>
                </div>
              </div>

              {/* Quality & Aspect Ratio */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Quality</Label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border/70 bg-background text-sm text-foreground px-3"
                  >
                    <option value="720p">720p (Faster)</option>
                    <option value="1080p">1080p (Higher Quality)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Aspect Ratio</Label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border/70 bg-background text-sm text-foreground px-3"
                  >
                    <option value="9:16">9:16 (Reels/Stories)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                data-testid="generate-button"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Video ({quality} • {duration}s)
                  </>
                )}
              </Button>

              <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border/50">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Tip:</strong> Videos are automatically saved to your Content Library and can be scheduled to Instagram directly!
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: GENERATION HISTORY */}
        <div className="space-y-4">
          <Card className="p-4 bg-card border-border/70">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Video className="w-4 h-4 text-primary" />
                Generation Queue
              </h3>
              <span className="text-xs text-muted-foreground">{jobs.length} jobs</span>
            </div>

            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-xs text-muted-foreground">No videos generated yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {jobs.map(job => (
                  <div
                    key={job.job_id}
                    className="p-3 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      {getStatusIcon(job.status)}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <p className="text-xs text-foreground line-clamp-2 mb-2">
                      {job.prompt || 'No description'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.duration}s • {job.quality}
                      </span>
                      {job.status === 'completed' && job.dropbox_url && (
                        <a
                          href={job.dropbox_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      )}
                    </div>
                    
                    {job.error && (
                      <p className="text-xs text-red-400 mt-2">Error: {job.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <Card className="p-4 bg-card border-border/70">
            <h3 className="text-sm font-semibold text-foreground mb-3">Stats</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Processing</span>
                <span className="font-semibold text-foreground">
                  {jobs.filter(j => j.status === 'processing').length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold text-green-400">
                  {jobs.filter(j => j.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Failed</span>
                <span className="font-semibold text-red-400">
                  {jobs.filter(j => j.status === 'failed' || j.status === 'timeout').length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
