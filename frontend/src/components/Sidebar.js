import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Download, Image, Library, Camera, TrendingUp,
  FileText, Layout, Plus, Settings, ChevronLeft,
  ChevronRight, Layers, Zap, BarChart2, BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: BarChart2, testid: 'dashboard' },
  { path: '/skool', label: 'Skool Downloader', icon: BookOpen, testid: 'skool-downloader' },
  { path: '/pinterest', label: 'Pinterest B-Roll', icon: Image, testid: 'pinterest-downloader' },
  { path: '/library', label: 'Content Library', icon: Library, testid: 'content-library' },
  null, // separator
  { path: '/instagram', label: 'Instagram', icon: Camera, testid: 'instagram-manager' },
  { path: '/trends', label: 'Trend Analyser', icon: TrendingUp, testid: 'trend-analyser' },
  { path: '/prompts', label: 'Prompt Creator', icon: FileText, testid: 'prompt-creator' },
  { path: '/planner', label: 'Planner', icon: Layout, testid: 'kanban-planner' },
  null,
  { path: '/modules/new', label: 'Add Side Hustle', icon: Plus, testid: 'module-builder' },
  { path: '/settings', label: 'Settings', icon: Settings, testid: 'settings' },
];

export default function Sidebar({ isOpen, onToggle, currentPath, customModules = [] }) {
  return (
    <aside
      className={cn(
        'flex flex-col bg-card border-r border-border/70 transition-[width] duration-200 ease-in-out',
        isOpen ? 'w-[260px]' : 'w-[64px]'
      )}
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-border/70 shrink-0">
        <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          {isOpen && (
            <span className="font-display font-bold text-sm text-foreground truncate" style={{fontFamily: 'Space Grotesk'}}>
              Ultimate Deploy
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
          data-testid="sidebar-collapse-button"
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item, idx) => {
            if (item === null) return <Separator key={idx} className="my-2 bg-border/50" />;
            return (
              <NavItem
                key={item.path}
                {...item}
                isOpen={isOpen}
                currentPath={currentPath}
              />
            );
          })}

          {/* Custom Modules */}
          {customModules.length > 0 && (
            <>
              <Separator className="my-2 bg-border/50" />
              {isOpen && (
                <p className="text-xs text-muted-foreground px-3 py-1 uppercase tracking-wider">Side Hustles</p>
              )}
              {customModules.map(mod => (
                <NavItem
                  key={mod.module_id}
                  path={`/module/${mod.module_id}`}
                  label={mod.name}
                  icon={Layers}
                  testid={`module-${mod.module_id}`}
                  isOpen={isOpen}
                  currentPath={currentPath}
                />
              ))}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">JK</span>
          </div>
          {isOpen && (
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-foreground truncate">James King</p>
              <p className="text-xs text-muted-foreground truncate">jamessnking@gmail.com</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavItem({ path, label, icon: Icon, testid, isOpen, currentPath }) {
  const isActive = currentPath === path || (path !== '/' && currentPath.startsWith(path));
  return (
    <NavLink
      to={path}
      data-testid={`sidebar-nav-item-${testid}`}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150 group',
        isActive
          ? 'bg-primary/10 text-primary border-l-2 border-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border-l-2 border-transparent'
      )}
      title={!isOpen ? label : undefined}
    >
      <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
      {isOpen && <span className="truncate">{label}</span>}
    </NavLink>
  );
}
