import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Library, Grid, List, Search, Filter, ExternalLink, Pencil, Trash2, Image, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ContentLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [brollFilter, setBrollFilter] = useState('all');
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
    } catch (e) { toast.error('Failed to load library'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadItems(); }, [sourceFilter, brollFilter]);

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
    } catch (e) { toast.error('Failed to update'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/library/${item.item_id}`);
      toast.success('Deleted');
      loadItems();
    } catch { toast.error('Delete failed'); }
  };

  const formatDuration = (s) => {
    if (!s) return 'N/A';
    return `${Math.floor(s/60)}m ${Math.floor(s%60)}s`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'N/A';
    return `${(bytes/1024/1024).toFixed(1)} MB`;
  };

  return (
    <div data-testid="content-library-page">
      <PageHeader title="Content Library" description={`${items.length} items in your Dropbox-backed content library`} />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearch}
            placeholder="Search titles, tags..." className="pl-8 text-xs bg-surface-2"
            data-testid="content-library-search-input" />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-36 text-xs bg-surface-2 border-border/70" data-testid="content-library-source-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="skool">Skool</SelectItem>
            <SelectItem value="pinterest">Pinterest</SelectItem>
          </SelectContent>
        </Select>
        <Select value={brollFilter} onValueChange={setBrollFilter}>
          <SelectTrigger className="w-36 text-xs bg-surface-2 border-border/70">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="true">B-Roll Only</SelectItem>
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
        <Button onClick={loadItems} variant="ghost" size="icon" className="w-8 h-8"><Filter className="w-4 h-4" /></Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border/70 bg-card h-40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Library} title="No content yet" description="Download from Skool or Pinterest to build your library" />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.item_id} className="rounded-xl border border-border/70 bg-card overflow-hidden hover:border-border group">
              <div className="aspect-video bg-muted relative">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="px-1.5 py-0.5 rounded text-xs bg-black/60 text-white">{item.source}</span>
                  {item.is_broll && <span className="px-1.5 py-0.5 rounded text-xs bg-primary/80 text-primary-foreground">B-Roll</span>}
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-foreground truncate mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground mb-2">{formatDuration(item.duration)} · {formatSize(item.file_size)}</p>
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.slice(0,3).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {item.dropbox_link && (
                    <a href={item.dropbox_link} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" />View
                    </a>
                  )}
                  <button onClick={() => openEdit(item)} className="ml-auto p-1 text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(item)} className="p-1 text-muted-foreground hover:text-red-400">
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
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Size</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.item_id} className="border-b border-border/40 hover:bg-muted/40">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                        {item.thumbnail ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" /> : <Image className="w-4 h-4 m-auto text-muted-foreground" />}
                      </div>
                      <span className="font-medium text-foreground max-w-xs truncate">{item.title}</span>
                      {item.is_broll && <span className="px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary">B-Roll</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{item.source}</td>
                  <td className="py-3 px-4 text-muted-foreground">{formatDuration(item.duration)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{formatSize(item.file_size)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {item.dropbox_link && (
                        <a href={item.dropbox_link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button onClick={() => openEdit(item)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(item)} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                <input type="checkbox" checked={editBroll} onChange={e => setEditBroll(e.target.checked)} id="broll" className="rounded" />
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
