import React from 'react';
import { cn } from '../lib/utils';

const STATUS_STYLES = {
  queued: 'bg-muted text-foreground/80 border border-border/70',
  downloading: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  uploading: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  complete: 'bg-green-500/15 text-green-400 border border-green-500/30',
  failed: 'bg-red-500/15 text-red-400 border border-red-500/30',
  active: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  running: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  success: 'bg-green-500/15 text-green-400 border border-green-500/30',
  todo: 'bg-muted text-foreground/80 border border-border/70',
  doing: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  done: 'bg-green-500/15 text-green-400 border border-green-500/30',
};

export function StatusBadge({ status, className }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.queued;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        style,
        className
      )}
    >
      {status}
    </span>
  );
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, className }) {
  return (
    <div className={cn('rounded-xl border border-border/70 bg-card p-4', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5 tabular-nums" style={{fontFamily: 'Space Grotesk'}}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground" style={{fontFamily: 'Space Grotesk'}}>{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
