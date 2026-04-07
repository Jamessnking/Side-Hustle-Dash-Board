import React from 'react';
import { ExternalLink, Layers, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/shared';
import { Button } from '../components/ui/button';

export default function CustomModulePage({ module: mod }) {
  if (!mod) return <div className="text-muted-foreground text-sm">Module not found</div>;

  const colorClasses = {
    teal: 'from-teal-500/20 to-transparent',
    blue: 'from-blue-500/20 to-transparent',
    purple: 'from-purple-500/20 to-transparent',
    pink: 'from-pink-500/20 to-transparent',
    orange: 'from-orange-500/20 to-transparent',
    green: 'from-green-500/20 to-transparent',
  };

  return (
    <div data-testid={`module-page-${mod.module_id}`}>
      <PageHeader
        title={mod.name}
        description={mod.description}
        actions={
          <Link to="/modules/new">
            <Button variant="outline" size="sm" className="border-border/70 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add More
            </Button>
          </Link>
        }
      />

      <div className={`rounded-xl border border-border/70 bg-gradient-to-br ${colorClasses[mod.color] || colorClasses.teal} p-6 mb-6`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-card border border-border/70 flex items-center justify-center">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{mod.name}</h2>
            <p className="text-sm text-muted-foreground">{mod.description}</p>
          </div>
        </div>

        {mod.notes && (
          <div className="rounded-lg bg-black/20 p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">Notes & Strategy</span>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{mod.notes}</p>
          </div>
        )}
      </div>

      {(mod.links || []).length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-primary" />
            Quick Links
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mod.links.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-surface-2 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/70 bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/prompts">
            <div className="rounded-lg bg-surface-2 border border-border/50 p-3 hover:border-primary/40 cursor-pointer">
              <FileText className="w-4 h-4 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Prompts</p>
              <p className="text-xs text-muted-foreground">AI content prompts</p>
            </div>
          </Link>
          <Link to="/library">
            <div className="rounded-lg bg-surface-2 border border-border/50 p-3 hover:border-primary/40 cursor-pointer">
              <Layers className="w-4 h-4 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Content Library</p>
              <p className="text-xs text-muted-foreground">B-roll & videos</p>
            </div>
          </Link>
          <Link to="/trends">
            <div className="rounded-lg bg-surface-2 border border-border/50 p-3 hover:border-primary/40 cursor-pointer">
              <Layers className="w-4 h-4 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Trend Analyse</p>
              <p className="text-xs text-muted-foreground">Competitor research</p>
            </div>
          </Link>
          <Link to="/planner">
            <div className="rounded-lg bg-surface-2 border border-border/50 p-3 hover:border-primary/40 cursor-pointer">
              <Layers className="w-4 h-4 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Planner</p>
              <p className="text-xs text-muted-foreground">Tasks & to-dos</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
