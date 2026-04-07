import React from 'react';
import { Menu, Bell, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

export default function TopBar({ onMenuToggle }) {
  return (
    <header
      className="h-14 flex items-center justify-between px-4 border-b border-border/70 bg-background/80 backdrop-blur shrink-0"
      data-testid="top-bar"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Ultimate Deployment</span>
          <span className="text-xs text-muted-foreground/50">/</span>
          <span className="text-xs text-foreground font-medium">Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://www.dropbox.com/home"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="hidden sm:inline">Dropbox</span>
        </a>
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">JK</span>
        </div>
      </div>
    </header>
  );
}
