import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Sparkles, Download, RefreshCw, FileText, Target, Users,
  Film, Images, Lightbulb, Repeat2, Calendar, Copy, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { Input } from '../components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MasterPlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [search, setSearch] = useState('');

  const loadPlan = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/master-plan`);
      setPlan(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.info('Master plan not generated yet. Click "Regenerate" to build it.');
      } else {
        toast.error('Failed to load master plan: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlan(); }, []);

  const regenerate = async () => {
    try {
      setRegenerating(true);
      toast.loading('Regenerating master plan from live DB…', { id: 'regen' });
      const res = await axios.post(`${BACKEND_URL}/api/master-plan/regenerate`);
      toast.success(`Regenerated! ${res.data.stats.total_videos} videos synthesized.`, { id: 'regen' });
      await loadPlan();
    } catch (err) {
      toast.error('Regenerate failed: ' + (err.response?.data?.detail || err.message), { id: 'regen' });
    } finally {
      setRegenerating(false);
    }
  };

  const download = (fmt) => {
    const url = `${BACKEND_URL}/api/master-plan/download/${fmt}`;
    window.open(url, '_blank');
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return <MasterPlanSkeleton />;
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <Sparkles className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">No Master Plan Yet</h1>
        <p className="text-muted-foreground">
          Generate a strategic master plan by aggregating all analyzed Skool videos.
        </p>
        <Button onClick={regenerate} disabled={regenerating} data-testid="master-plan-generate-button">
          <Sparkles className="w-4 h-4 mr-2" />
          {regenerating ? 'Generating…' : 'Generate Master Plan'}
        </Button>
      </div>
    );
  }

  const { stats, content_pillars = [], target_audiences = [], hook_type_distribution = [],
    hooks_bank = [], reel_scripts_bank = [], carousels_bank = [],
    key_learnings_bank = [], repurpose_bank = [], schedule_30_day = [],
    weekly_structure = [], generated_at } = plan;

  const filter = (arr, ...keys) => {
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter(item => keys.some(k => (item[k] || '').toString().toLowerCase().includes(q)));
  };

  return (
    <div className="space-y-6" data-testid="master-plan-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>Instagram Automation Master Plan</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Synthesized from {stats.total_videos} Skool videos · Generated{' '}
            {generated_at ? new Date(generated_at).toLocaleString() : 'unknown'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => download('md')} data-testid="download-md-button">
            <Download className="w-4 h-4 mr-2" /> .md
          </Button>
          <Button variant="outline" size="sm" onClick={() => download('json')} data-testid="download-json-button">
            <Download className="w-4 h-4 mr-2" /> .json
          </Button>
          <Button size="sm" onClick={regenerate} disabled={regenerating} data-testid="regenerate-button">
            <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard icon={Film} label="Videos" value={stats.total_videos} color="text-blue-400" />
        <StatCard icon={Target} label="Hooks" value={stats.unique_hooks} color="text-emerald-400" />
        <StatCard icon={FileText} label="Reel Scripts" value={stats.unique_reel_scripts} color="text-amber-400" />
        <StatCard icon={Images} label="Carousels" value={stats.carousel_outlines} color="text-pink-400" />
        <StatCard icon={Lightbulb} label="Learnings" value={stats.unique_key_learnings} color="text-violet-400" />
        <StatCard icon={Repeat2} label="Repurpose" value={stats.repurpose_ideas} color="text-cyan-400" />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search hooks, scripts, carousels, learnings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
          data-testid="master-plan-search-input"
        />
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear</Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="hooks" data-testid="tab-hooks">Hooks</TabsTrigger>
          <TabsTrigger value="reels" data-testid="tab-reels">Reels</TabsTrigger>
          <TabsTrigger value="carousels" data-testid="tab-carousels">Carousels</TabsTrigger>
          <TabsTrigger value="learnings" data-testid="tab-learnings">Learnings</TabsTrigger>
          <TabsTrigger value="repurpose" data-testid="tab-repurpose">Repurpose</TabsTrigger>
          <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="content-pillars-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-4 h-4 text-primary" /> Content Pillars
                </CardTitle>
                <CardDescription>Top topics across all {stats.total_videos} videos</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80 pr-3">
                  <div className="space-y-1.5">
                    {content_pillars.slice(0, 40).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/40">
                        <span className="text-foreground">{p.topic}</span>
                        <Badge variant="secondary">{p.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card data-testid="audience-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-primary" /> Target Audiences
                </CardTitle>
                <CardDescription>Who the source content speaks to</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80 pr-3">
                  <div className="space-y-2">
                    {target_audiences.slice(0, 20).map((a, i) => (
                      <div key={i} className="text-sm border-l-2 border-primary/40 pl-3 py-1">
                        {a.audience}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hook Style Mix</CardTitle>
              <CardDescription>How your hooks break down by persuasion style</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hook_type_distribution.map((h, i) => (
                  <Badge key={i} variant="outline" className="text-sm capitalize">
                    {h.type} · {h.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-primary" /> Recommended Weekly Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                {weekly_structure.map((w, i) => (
                  <div key={i} className="rounded-lg bg-muted/40 p-3 border border-border/50">
                    <div className="text-xs font-semibold text-primary">{w.day}</div>
                    <div className="text-sm font-medium mt-1">{w.format}</div>
                    <div className="text-xs text-muted-foreground mt-1">{w.notes}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOOKS */}
        <TabsContent value="hooks" className="mt-4">
          <ScrollArea className="h-[70vh] pr-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filter(hooks_bank, 'text', 'type', 'source_title').map((h, i) => (
                <Card key={i} data-testid={`hook-card-${i}`}>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="capitalize mb-2 text-[10px]">{h.type}</Badge>
                    <p className="text-sm text-foreground">"{h.text}"</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span className="truncate max-w-[200px]">{h.source_title}</span>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => copyText(h.text)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* REELS */}
        <TabsContent value="reels" className="mt-4">
          <ScrollArea className="h-[70vh] pr-3">
            <div className="space-y-3">
              {filter(reel_scripts_bank, 'title', 'hook', 'body', 'cta', 'source_title').map((r, i) => (
                <Card key={i} data-testid={`reel-card-${i}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{r.title || `Reel #${i + 1}`}</CardTitle>
                    <CardDescription className="text-xs">from: {r.source_title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><span className="text-primary font-semibold">Hook:</span> {r.hook}</div>
                    <div><span className="text-primary font-semibold">Body:</span> {r.body}</div>
                    <div><span className="text-primary font-semibold">CTA:</span> {r.cta}</div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => copyText(`${r.hook}\n\n${r.body}\n\n${r.cta}`)}>
                        <Copy className="w-3 h-3 mr-1" /> Copy Script
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* CAROUSELS */}
        <TabsContent value="carousels" className="mt-4">
          <ScrollArea className="h-[70vh] pr-3">
            <div className="space-y-3">
              {filter(carousels_bank, 'title', 'source_title').map((c, i) => (
                <Card key={i} data-testid={`carousel-card-${i}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <CardDescription className="text-xs">from: {c.source_title} · {c.slides.length} slides</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      {c.slides.map((s, si) => (
                        <div key={si} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                          <div className="text-xs text-primary font-bold">SLIDE {s.slide}</div>
                          <div className="text-sm font-semibold mt-1">{s.headline}</div>
                          <div className="text-xs text-muted-foreground mt-1">{s.content}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* LEARNINGS */}
        <TabsContent value="learnings" className="mt-4">
          <ScrollArea className="h-[70vh] pr-3">
            <div className="space-y-2">
              {filter(key_learnings_bank, 'text', 'source_title').map((l, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30 border border-border/40">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{l.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">from: {l.source_title}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* REPURPOSE */}
        <TabsContent value="repurpose" className="mt-4">
          <ScrollArea className="h-[70vh] pr-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filter(repurpose_bank, 'idea', 'source_title').map((r, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Repeat2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm">{r.idea}</p>
                        <p className="text-xs text-muted-foreground mt-2">from: {r.source_title}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* SCHEDULE */}
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> 30-Day Posting Schedule
              </CardTitle>
              <CardDescription>Auto-generated from hook/reel/carousel banks</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[65vh] pr-3">
                <div className="space-y-2">
                  {schedule_30_day.map((d, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                        <div className="text-[10px] text-muted-foreground">DAY</div>
                        <div className="text-sm font-bold text-primary">{d.day}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{d.format}</Badge>
                          <span className="text-sm font-medium truncate">{d.title || d.notes}</span>
                        </div>
                        {d.hook && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            <span className="text-primary">Hook:</span> {d.hook}
                          </p>
                        )}
                        {d.source_title && (
                          <p className="text-xs text-muted-foreground/60 mt-0.5">from: {d.source_title}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold mt-1" style={{fontFamily: 'Space Grotesk'}}>{value}</div>
      </CardContent>
    </Card>
  );
}

function MasterPlanSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-96" />
      <div className="grid grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-10 w-full max-w-4xl" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
