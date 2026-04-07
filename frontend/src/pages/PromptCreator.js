import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FileText, Plus, Copy, Trash2, Edit, Search, Tag, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = ['general', 'instagram', 'content', 'captions', 'hooks', 'reels', 'carousel', 'dm', 'trend', 'email'];

export default function PromptCreator() {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [form, setForm] = useState({ title: '', content: '', category: 'general', tags: '' });

  const loadPrompts = async () => {
    try {
      const params = {};
      if (catFilter !== 'all') params.category = catFilter;
      if (search) params.search = search;
      const r = await axios.get(`${BACKEND_URL}/api/prompts`, { params });
      setPrompts(r.data);
    } catch (e) {}
  };

  useEffect(() => { loadPrompts(); }, [catFilter]);

  const handleCreate = async () => {
    if (!form.title || !form.content) { toast.error('Title and content required'); return; }
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      await axios.post(`${BACKEND_URL}/api/prompts`, { ...form, tags });
      toast.success('Prompt created!');
      setForm({ title: '', content: '', category: 'general', tags: '' });
      setShowNew(false);
      loadPrompts();
    } catch (e) { toast.error('Failed to create prompt'); }
  };

  const handleUpdate = async () => {
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      await axios.put(`${BACKEND_URL}/api/prompts/${selectedPrompt.prompt_id}`, { ...form, tags });
      toast.success('Updated!');
      setEditing(false);
      loadPrompts();
    } catch (e) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prompt?')) return;
    await axios.delete(`${BACKEND_URL}/api/prompts/${id}`);
    if (selectedPrompt?.prompt_id === id) setSelectedPrompt(null);
    toast.success('Deleted');
    loadPrompts();
  };

  const handleCopy = async (content, id) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard!');
    if (id) {
      await axios.post(`${BACKEND_URL}/api/prompts/${id}/use`).catch(() => {});
      loadPrompts();
    }
  };

  const openEdit = (p) => {
    setSelectedPrompt(p);
    setForm({ title: p.title, content: p.content, category: p.category, tags: (p.tags || []).join(', ') });
    setEditing(true);
    setShowNew(false);
  };

  const openNew = () => {
    setShowNew(true);
    setEditing(false);
    setSelectedPrompt(null);
    setForm({ title: '', content: '', category: 'general', tags: '' });
  };

  return (
    <div data-testid="prompt-creator-page">
      <PageHeader
        title="Prompt Creator"
        description="Create, manage and copy AI prompts for content creation with Emergent"
        actions={
          <Button onClick={openNew} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
            data-testid="new-prompt-button">
            <Plus className="w-3 h-3 mr-1" /> New Prompt
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: List */}
        <div className="lg:col-span-1 space-y-3">
          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadPrompts()}
                placeholder="Search prompts..." className="pl-8 text-xs bg-surface-2" />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-28 text-xs bg-surface-2 border-border/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {prompts.length === 0 ? (
            <EmptyState icon={FileText} title="No prompts yet" description="Create your first prompt" />
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {prompts.map(p => (
                <button
                  key={p.prompt_id}
                  onClick={() => { setSelectedPrompt(p); setEditing(false); setShowNew(false); }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedPrompt?.prompt_id === p.prompt_id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/60 border border-transparent'
                  }`}
                  data-testid="prompt-list-item"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">{p.category}</span>
                      {p.use_count > 0 && (
                        <span className="text-xs text-muted-foreground">· {p.use_count}x used</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Editor / Viewer */}
        <div className="lg:col-span-2">
          {showNew || editing ? (
            <div className="rounded-xl border border-border/70 bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">{editing ? 'Edit Prompt' : 'New Prompt'}</h2>
                <button onClick={() => { setShowNew(false); setEditing(false); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Title</Label>
                  <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="e.g. 'Instagram Caption Hook'" className="text-xs bg-surface-2" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                    <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                      <SelectTrigger className="text-xs bg-surface-2 border-border/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Tags (comma-sep)</Label>
                    <Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})}
                      placeholder="reel, hook, viral" className="text-xs bg-surface-2" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Prompt Content</Label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({...form, content: e.target.value})}
                    placeholder="Write your prompt here... Use [PLACEHOLDERS] for variables"
                    className="w-full rounded-lg border border-border/70 bg-surface-2 p-3 text-xs text-foreground resize-none h-48 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    data-testid="prompt-content-textarea"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={editing ? handleUpdate : handleCreate}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    {editing ? 'Update Prompt' : 'Save Prompt'}
                  </Button>
                  <Button onClick={() => { setShowNew(false); setEditing(false); }} variant="outline" className="border-border/70">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedPrompt ? (
            <div className="rounded-xl border border-border/70 bg-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{selectedPrompt.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary capitalize">{selectedPrompt.category}</span>
                    {(selectedPrompt.tags || []).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{tag}</span>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">{selectedPrompt.use_count || 0}x used</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(selectedPrompt)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(selectedPrompt.prompt_id)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-surface-2 border border-border/50 p-4 mb-4">
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{selectedPrompt.content}</pre>
              </div>
              <Button
                onClick={() => handleCopy(selectedPrompt.content, selectedPrompt.prompt_id)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="copy-prompt-button"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy to Clipboard
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-card h-64 flex items-center justify-center">
              <EmptyState icon={FileText} title="Select a prompt" description="Click a prompt to view, or create a new one" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
