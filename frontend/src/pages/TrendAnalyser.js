import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { TrendingUp, Search, Loader2, ExternalLink, Lightbulb, Music, Target, Layers } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function TrendAnalyser() {
  const [url, setUrl] = useState('');
  const [analysisType, setAnalysisType] = useState('full');
  const [analysing, setAnalysing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/trends`);
      setHistory(r.data);
    } catch (e) {}
  };

  useEffect(() => { loadHistory(); }, []);

  const handleAnalyse = async () => {
    if (!url) { toast.error('Enter a URL to analyse'); return; }
    setAnalysing(true);
    setCurrentAnalysis(null);
    try {
      const r = await axios.post(`${BACKEND_URL}/api/trends/analyse`, { url, analysis_type: analysisType });
      setCurrentAnalysis(r.data);
      loadHistory();
      toast.success('Analysis complete!');
    } catch (e) {
      toast.error('Analysis failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setAnalysing(false);
    }
  };

  const renderAnalysis = (analysis) => {
    if (!analysis) return null;
    if (analysis.raw_analysis) {
      return (
        <div className="bg-surface-2 rounded-lg p-4 text-xs text-foreground whitespace-pre-wrap font-mono">
          {analysis.raw_analysis}
        </div>
      );
    }
    const sections = [
      { key: 'hook_analysis', label: 'Hook Strategy', icon: Target },
      { key: 'content_structure', label: 'Content Structure', icon: Layers },
      { key: 'engagement_triggers', label: 'Engagement Triggers', icon: TrendingUp },
      { key: 'trending_audio_clues', label: 'Trending Audio', icon: Music },
      { key: 'viral_factors', label: 'Viral Factors', icon: TrendingUp },
      { key: 'replication_strategy', label: 'How to Replicate', icon: Target },
    ];
    return (
      <div className="space-y-3">
        {sections.map(({ key, label, icon: Icon }) => {
          const val = analysis[key];
          if (!val) return null;
          return (
            <div key={key} className="rounded-lg border border-border/50 bg-surface-2 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{typeof val === 'object' ? JSON.stringify(val) : val}</p>
            </div>
          );
        })}
        {analysis.content_ideas && (
          <div className="rounded-lg border border-border/50 bg-surface-2 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">Content Ideas</span>
            </div>
            {Array.isArray(analysis.content_ideas) ? (
              <ul className="space-y-1">
                {analysis.content_ideas.map((idea, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary shrink-0">{i+1}.</span>{idea}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{analysis.content_ideas}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-testid="trend-analyser-page">
      <PageHeader
        title="Trend Analyser"
        description="AI-powered competitor and trend analysis. Paste any Instagram/TikTok URL to analyse."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Analyse Content
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Content URL</label>
                <Input value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/... or TikTok URL"
                  className="font-mono text-xs bg-surface-2"
                  data-testid="trend-url-input" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Analysis Type</label>
                <Select value={analysisType} onValueChange={setAnalysisType}>
                  <SelectTrigger className="text-xs bg-surface-2 border-border/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Analysis</SelectItem>
                    <SelectItem value="hook">Hook Only</SelectItem>
                    <SelectItem value="audio">Trending Audio</SelectItem>
                    <SelectItem value="structure">Content Structure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAnalyse}
                disabled={analysing || !url}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="trend-analyse-button"
              >
                {analysing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing with AI...</> : <><Search className="w-4 h-4 mr-2" />Analyse Content</>}
              </Button>
            </div>
          </div>

          {/* History */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Analyses</h2>
            {history.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No analyses yet" description="Start by pasting a content URL" />
            ) : (
              <div className="space-y-2">
                {history.slice(0,5).map(h => (
                  <button
                    key={h.analysis_id}
                    onClick={() => setCurrentAnalysis(h)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted/60 border border-transparent hover:border-border/50"
                  >
                    <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{h.video_title || h.url}</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="rounded-xl border border-border/70 bg-card p-5 min-h-64">
          {analysing ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">AI is analysing the content...</p>
            </div>
          ) : currentAnalysis ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{currentAnalysis.video_title || 'Analysis Results'}</h2>
                  <p className="text-xs text-muted-foreground font-mono truncate">{currentAnalysis.url}</p>
                </div>
                {currentAnalysis.url && (
                  <a href={currentAnalysis.url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <div className="max-h-[500px] overflow-y-auto pr-1">
                {renderAnalysis(currentAnalysis.analysis)}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No analysis yet"
              description="Paste a content URL and click Analyse to get AI-powered insights"
            />
          )}
        </div>
      </div>
    </div>
  );
}
