import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Library, Grid, List, Search, Filter, ExternalLink, Pencil, Trash2, Image, X,
  Brain, Mic, Loader2, ChevronRight, ChevronDown, FileText, Zap, Target,
  Music, Lightbulb, Layout, RefreshCw, CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { PageHeader, EmptyState, StatusBadge } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Status chip for transcription / intelligence
function ProcessingBadge({ status, label }) {
  const styles = {
    pending: 'bg-muted/60 text-muted-foreground border border-border/50',
    running: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    complete: 'bg-green-500/15 text-green-400 border border-green-500/30',
    failed: 'bg-red-500/15 text-red-400 border border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${styles[status] || styles.pending}`}>
      {status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {status === 'complete' && <CheckCircle2 className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

// ─── INSIGHTS PANEL ──────────────────────────────────────────────────────────

function InsightsPanel({ item, onRefresh }) {
  const [transcribing, setTranscribing] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [expanded, setExpanded] = useState({});

  const toggleSection = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const handleTranscribe = async () => {
    setTranscribing(true);
    try {
      await axios.post(`${BACKEND_URL}/api/library/${item.item_id}/transcribe`);
      toast.success('Transcription started!');
      setTimeout(onRefresh, 3000);
      setTimeout(onRefresh, 8000);
      setTimeout(onRefresh, 20000);
    } catch (e) { toast.error('Failed to start transcription'); }
    finally { setTranscribing(false); }
  };

  const handleAnalyse = async () => {
    setAnalysing(true);
    try {
      await axios.post(`${BACKEND_URL}/api/library/${item.item_id}/analyse`);
      toast.success('AI analysis started!');
      setTimeout(onRefresh, 5000);
      setTimeout(onRefresh, 30000);
      setTimeout(onRefresh, 60000);
    } catch (e) { toast.error('Failed to start analysis'); }
    finally { setAnalysing(false); }
  };

  const intel = item.intelligence || {};
  const transcript = item.transcript || {};

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-surface-2 border border-border/50">
        <ProcessingBadge status={item.transcription_status || 'pending'} label="Transcript" />
        <ProcessingBadge status={item.intelligence_status || 'pending'} label="AI Intelligence" />
        <div className="ml-auto flex gap-2">
          {item.transcription_status !== 'complete' && item.transcription_status !== 'running' && (
            <Button onClick={handleTranscribe} disabled={transcribing} size="sm" variant="outline"
              className="border-border/70 text-xs h-7">
              {transcribing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Mic className="w-3 h-3 mr-1" />}
              Transcribe
            </Button>
          )}
          {item.transcription_status === 'running' && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Transcribing...
            </span>
          )}
          {item.intelligence_status !== 'complete' && item.intelligence_status !== 'running' && (
            <Button onClick={handleAnalyse} disabled={analysing} size="sm"
              className="bg-primary/90 text-primary-foreground hover:bg-primary text-xs h-7">
              {analysing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Brain className="w-3 h-3 mr-1" />}
              AI Analyse
            </Button>
          )}
          {item.intelligence_status === 'running' && (
            <span className="text-xs text-primary flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Analysing...
            </span>
          )}
          <button onClick={onRefresh} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <Tabs defaultValue={intel.summary ? 'intelligence' : 'transcript'}>
        <TabsList className="bg-muted/40 border border-border/70">
          <TabsTrigger value="transcript" className="text-xs">
            <Mic className="w-3 h-3 mr-1" />Transcript
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="text-xs">
            <Brain className="w-3 h-3 mr-1" />Intelligence
          </TabsTrigger>
        </TabsList>

        {/* TRANSCRIPT TAB */}
        <TabsContent value="transcript">
          {!transcript.full_text && item.transcription_status !== 'running' ? (
            <div className="rounded-lg bg-surface-2 border border-border/50 p-4 text-center">
              <Mic className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground mb-1">No transcript yet</p>
              <p className="text-xs text-muted-foreground mb-3">Click "Transcribe" to generate a full transcript using AI</p>
              <Button onClick={handleTranscribe} disabled={transcribing} size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Mic className="w-3 h-3 mr-1.5" /> Start Transcription
              </Button>
            </div>
          ) : item.transcription_status === 'running' ? (
            <div className="rounded-lg bg-surface-2 border border-border/50 p-6 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Transcribing audio... this may take a few minutes</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  {transcript.language && `Language: ${transcript.language} · `}
                  {transcript.segments?.length} segments
                </p>
                <button onClick={() => { navigator.clipboard.writeText(transcript.full_text); toast.success('Copied!'); }}
                  className="text-xs text-primary hover:underline">Copy all</button>
              </div>
              <div className="rounded-lg bg-surface-2 border border-border/50 p-4 max-h-64 overflow-y-auto">
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{transcript.full_text}</p>
              </div>
              {transcript.segments?.length > 0 && (
                <div className="mt-3">
                  <button onClick={() => toggleSection('segments')}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    {expanded.segments ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Timestamped segments ({transcript.segments.length})
                  </button>
                  {expanded.segments && (
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {transcript.segments.map((seg, i) => (
                        <div key={i} className="flex gap-3 text-xs py-1 border-b border-border/30">
                          <span className="text-primary font-mono shrink-0 w-14">
                            {Math.floor(seg.start / 60)}:{String(Math.floor(seg.start % 60)).padStart(2, '0')}
                          </span>
                          <span className="text-foreground">{seg.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* INTELLIGENCE TAB */}
        <TabsContent value="intelligence">
          {!intel.summary && item.intelligence_status !== 'running' ? (
            <div className="rounded-lg bg-surface-2 border border-border/50 p-4 text-center">
              <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground mb-1">No content intelligence yet</p>
              <p className="text-xs text-muted-foreground mb-3">
                {item.transcription_status === 'complete'
                  ? 'Transcript ready. Click "AI Analyse" to generate hooks, scripts & carousel ideas.'
                  : 'Start by transcribing, then AI will generate content intelligence.'}
              </p>
              <Button onClick={handleAnalyse} disabled={analysing} size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Brain className="w-3 h-3 mr-1.5" /> Generate Intelligence
              </Button>
            </div>
          ) : item.intelligence_status === 'running' ? (
            <div className="rounded-lg bg-surface-2 border border-border/50 p-6 text-center">
              <Brain className="w-8 h-8 text-primary animate-pulse mx-auto mb-2" />
              <p className="text-xs text-foreground font-medium mb-1">AI is working...</p>
              <p className="text-xs text-muted-foreground">Generating hooks, scripts, carousel ideas...</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {/* Summary */}
              {intel.summary && (
                <IntelSection icon={FileText} title="Summary" color="text-primary">
                  <p className="text-xs text-muted-foreground leading-relaxed">{intel.summary}</p>
                </IntelSection>
              )}

              {/* Key Learnings */}
              {intel.key_learnings?.length > 0 && (
                <IntelSection icon={Target} title="Key Learnings" color="text-blue-400">
                  <ul className="space-y-1.5">
                    {intel.key_learnings.map((l, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-primary shrink-0 font-bold">{i + 1}.</span>{l}
                      </li>
                    ))}
                  </ul>
                </IntelSection>
              )}

              {/* Hooks */}
              {intel.hooks?.length > 0 && (
                <IntelSection icon={Zap} title="Content Hooks" color="text-yellow-400">
                  <div className="space-y-2">
                    {intel.hooks.map((h, i) => (
                      <div key={i} className="rounded-lg bg-card border border-border/40 p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-primary capitalize">{h.type}</span>
                          <button onClick={() => { navigator.clipboard.writeText(h.text); toast.success('Hook copied!'); }}
                            className="text-xs text-muted-foreground hover:text-foreground">copy</button>
                        </div>
                        <p className="text-xs text-foreground">{h.text}</p>
                      </div>
                    ))}
                  </div>
                </IntelSection>
              )}

              {/* Reel Scripts */}
              {intel.reel_scripts?.length > 0 && (
                <IntelSection icon={Music} title="Reel Scripts" color="text-pink-400">
                  <div className="space-y-3">
                    {intel.reel_scripts.map((r, i) => (
                      <div key={i} className="rounded-lg bg-card border border-border/40 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-foreground">{r.title}</p>
                          <button
                            onClick={() => {
                              const full = `HOOK: ${r.hook}\n\nBODY: ${r.body}\n\nCTA: ${r.cta}`;
                              navigator.clipboard.writeText(full);
                              toast.success('Script copied!');
                            }}
                            className="text-xs text-primary hover:underline">copy</button>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div><span className="text-primary font-semibold">HOOK: </span><span className="text-foreground">{r.hook}</span></div>
                          <div><span className="text-muted-foreground font-semibold">BODY: </span><span className="text-muted-foreground">{r.body}</span></div>
                          <div><span className="text-yellow-400 font-semibold">CTA: </span><span className="text-foreground">{r.cta}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </IntelSection>
              )}

              {/* Carousel Outline */}
              {intel.carousel_outline?.slides?.length > 0 && (
                <IntelSection icon={Layout} title="Carousel Outline" color="text-purple-400">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">{intel.carousel_outline.title}</p>
                    <button
                      onClick={() => {
                        const text = intel.carousel_outline.slides.map(s => `Slide ${s.slide}: ${s.headline}\n${s.content}`).join('\n\n');
                        navigator.clipboard.writeText(text);
                        toast.success('Carousel copied!');
                      }}
                      className="text-xs text-primary hover:underline">copy all</button>
                  </div>
                  <div className="space-y-2">
                    {intel.carousel_outline.slides.map((s, i) => (
                      <div key={i} className="rounded-lg bg-card border border-border/40 p-2.5">
                        <p className="text-xs font-semibold text-primary mb-0.5">Slide {s.slide}: {s.headline}</p>
                        <p className="text-xs text-muted-foreground">{s.content}</p>
                      </div>
                    ))}
                  </div>
                </IntelSection>
              )}

              {/* Repurposing plan */}
              {intel.repurposing_plan?.length > 0 && (
                <IntelSection icon={Lightbulb} title="Repurposing Ideas" color="text-green-400">
                  <ul className="space-y-1">
                    {intel.repurposing_plan.map((idea, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-green-400 shrink-0">→</span>{idea}
                      </li>
                    ))}
                  </ul>
                </IntelSection>
              )}

              {intel.error && !intel.summary && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-xs text-red-400">{intel.error}</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntelSection({ icon: Icon, title, color, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border border-border/50 bg-surface-2 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 p-3 hover:bg-muted/40 transition-colors">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs font-semibold text-foreground flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ContentLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [brollFilter, setBrollFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editBroll, setEditBroll] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (brollFilter === 'true') params.is_broll = true;
      if (brollFilter === 'false') params.is_broll = false;
      if (search) params.search = search;
      const r = await axios.get(`${BACKEND_URL}/api/library`, { params });
      setItems(r.data);
    } catch { toast.error('Failed to load library'); }
    finally { setLoading(false); }
  };

  // Refresh selected item details
  const refreshSelectedItem = async () => {
    if (!selectedItem) return;
    try {
      const r = await axios.get(`${BACKEND_URL}/api/library/${selectedItem.item_id}`);
      setSelectedItem(r.data);
      setItems(prev => prev.map(i => i.item_id === r.data.item_id ? r.data : i));
    } catch {}
  };

  useEffect(() => { loadItems(); }, [sourceFilter, brollFilter]);

  // Auto-poll for items with running status
  useEffect(() => {
    const hasRunning = items.some(i =>
      i.transcription_status === 'running' || i.intelligence_status === 'running'
    );
    if (!hasRunning) return;
    const timer = setInterval(refreshSelectedItem, 4000);
    return () => clearInterval(timer);
  }, [items, selectedItem]);

  const handleSearch = (e) => { if (e.key === 'Enter') loadItems(); };

  const openEdit = (item) => {
    setEditItem(item);
    setEditNotes(item.notes || '');
    setEditTags((item.tags || []).join(', '));
    setEditBroll(item.is_broll || false);
  };

  const handleSaveEdit = async () => {
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
      await axios.patch(`${BACKEND_URL}/api/library/${editItem.item_id}`, { notes: editNotes, tags, is_broll: editBroll });
      toast.success('Updated!');
      setEditItem(null);
      loadItems();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/library/${item.item_id}`);
      toast.success('Deleted');
      if (selectedItem?.item_id === item.item_id) setSelectedItem(null);
      loadItems();
    } catch { toast.error('Delete failed'); }
  };

  const formatDuration = (s) => !s ? 'N/A' : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
  const formatSize = (b) => !b ? 'N/A' : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div data-testid="content-library-page">
      <PageHeader title="Content Library"
        description={`${items.length} items · Dropbox-backed asset bank`} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearch}
            placeholder="Search..." className="pl-8 text-xs bg-surface-2"
            data-testid="content-library-search-input" />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-32 text-xs bg-surface-2 border-border/70" data-testid="content-library-source-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="skool">Skool</SelectItem>
            <SelectItem value="pinterest">Pinterest</SelectItem>
          </SelectContent>
        </Select>
        <Select value={brollFilter} onValueChange={setBrollFilter}>
          <SelectTrigger className="w-32 text-xs bg-surface-2 border-border/70">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="true">B-Roll</SelectItem>
            <SelectItem value="false">Non B-Roll</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border border-border/70 overflow-hidden" data-testid="content-library-view-toggle">
          <button onClick={() => setView('grid')}
            className={`p-2 ${view === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')}
            className={`p-2 ${view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
        <Button onClick={loadItems} variant="ghost" size="icon" className="w-8 h-8">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Main area: list + insights panel */}
      <div className={`${selectedItem ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : ''}`}>
        {/* Item Grid/List */}
        <div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="rounded-xl border border-border/70 bg-card h-40 animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={Library} title="Library empty" description="Download from Skool or Pinterest to build your library" />
          ) : view === 'grid' ? (
            <div className={`grid gap-4 ${selectedItem ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'}`}>
              {items.map(item => (
                <div key={item.item_id}
                  className={`rounded-xl border bg-card overflow-hidden cursor-pointer transition-all ${
                    selectedItem?.item_id === item.item_id
                      ? 'border-primary/60 ring-1 ring-primary/30'
                      : 'border-border/70 hover:border-border'
                  }`}
                  onClick={() => setSelectedItem(selectedItem?.item_id === item.item_id ? null : item)}>
                  <div className="aspect-video bg-muted relative">
                    {item.thumbnail
                      ? <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-muted-foreground" /></div>}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-black/60 text-white">{item.source}</span>
                      {item.is_broll && <span className="px-1.5 py-0.5 rounded text-xs bg-primary/80 text-primary-foreground">B-Roll</span>}
                    </div>
                    {/* Intelligence indicator */}
                    {item.intelligence_status === 'complete' && (
                      <div className="absolute bottom-2 right-2">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-green-500/80 text-white">
                          <Brain className="w-2.5 h-2.5" /> AI
                        </span>
                      </div>
                    )}
                    {item.transcription_status === 'running' || item.intelligence_status === 'running' ? (
                      <div className="absolute bottom-2 right-2">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/80 text-white">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-foreground truncate mb-0.5">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(item.duration)} · {formatSize(item.file_size)}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {item.dropbox_link && (
                        <a href={item.dropbox_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                        className="ml-auto p-1 text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(item); }}
                        className="p-1 text-muted-foreground hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-background/80">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Title</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Source</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Duration</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Intel</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.item_id}
                      onClick={() => setSelectedItem(selectedItem?.item_id === item.item_id ? null : item)}
                      className={`border-b border-border/40 cursor-pointer ${selectedItem?.item_id === item.item_id ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                            {item.thumbnail ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" /> : <Image className="w-4 h-4 m-auto mt-2 text-muted-foreground" />}
                          </div>
                          <span className="font-medium text-foreground max-w-xs truncate">{item.title}</span>
                          {item.is_broll && <span className="px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary">B-Roll</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{item.source}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDuration(item.duration)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {item.transcription_status === 'complete' && <span className="text-green-400 text-xs flex items-center gap-0.5"><Mic className="w-2.5 h-2.5" />T</span>}
                          {item.intelligence_status === 'complete' && <span className="text-primary text-xs flex items-center gap-0.5"><Brain className="w-2.5 h-2.5" />AI</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {item.dropbox_link && <a href={item.dropbox_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-primary"><ExternalLink className="w-3 h-3" /></a>}
                          <button onClick={e => { e.stopPropagation(); openEdit(item); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(item); }} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Insights Panel */}
        {selectedItem && (
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{selectedItem.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedItem.source} · {formatDuration(selectedItem.duration)} · {formatSize(selectedItem.file_size)}
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <InsightsPanel item={selectedItem} onRefresh={refreshSelectedItem} />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border/70 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Edit Item</h3>
              <button onClick={() => setEditItem(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Tags (comma-separated)</label>
                <Input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="broll, motivation" className="text-xs bg-surface-2" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border border-border/70 bg-surface-2 p-2.5 text-xs text-foreground resize-none h-24" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editBroll} onChange={e => setEditBroll(e.target.checked)} id="broll" />
                <label htmlFor="broll" className="text-xs cursor-pointer">Mark as B-Roll</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSaveEdit} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
              <Button onClick={() => setEditItem(null)} variant="outline" className="border-border/70">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
