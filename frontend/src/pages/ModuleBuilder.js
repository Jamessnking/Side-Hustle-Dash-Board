import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Layers, Edit, Trash2, ExternalLink, X, Palette } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ICONS = ['Layers', 'ShoppingBag', 'DollarSign', 'Star', 'Zap', 'Globe', 'Video', 'Music', 'Camera', 'Code', 'Target', 'Briefcase'];
const COLORS = ['teal', 'blue', 'purple', 'pink', 'orange', 'green', 'red', 'yellow'];

const COLOR_MAP = {
  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  pink: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  green: 'bg-green-500/10 text-green-400 border-green-500/30',
  red: 'bg-red-500/10 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
};

export default function ModuleBuilder() {
  const [modules, setModules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editModule, setEditModule] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', icon: 'Layers', color: 'teal', notes: '', links: []
  });
  const [newLink, setNewLink] = useState({ label: '', url: '' });

  const loadModules = async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/modules`);
      setModules(r.data);
    } catch (e) {}
  };

  useEffect(() => { loadModules(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.description) { toast.error('Name and description required'); return; }
    try {
      if (editModule) {
        await axios.put(`${BACKEND_URL}/api/modules/${editModule.module_id}`, form);
        toast.success('Module updated!');
      } else {
        await axios.post(`${BACKEND_URL}/api/modules`, form);
        toast.success('Side hustle added to dashboard!');
      }
      setShowForm(false);
      setEditModule(null);
      setForm({ name: '', description: '', icon: 'Layers', color: 'teal', notes: '', links: [] });
      loadModules();
      // Refresh to show in sidebar
      window.location.reload();
    } catch (e) { toast.error('Failed: ' + e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this side hustle?')) return;
    await axios.delete(`${BACKEND_URL}/api/modules/${id}`);
    toast.success('Removed');
    loadModules();
  };

  const handleEdit = (m) => {
    setEditModule(m);
    setForm({ name: m.name, description: m.description, icon: m.icon || 'Layers', color: m.color || 'teal', notes: m.notes || '', links: m.links || [] });
    setShowForm(true);
  };

  const addLink = () => {
    if (!newLink.label || !newLink.url) return;
    setForm({ ...form, links: [...form.links, newLink] });
    setNewLink({ label: '', url: '' });
  };

  const removeLink = (i) => {
    setForm({ ...form, links: form.links.filter((_, idx) => idx !== i) });
  };

  return (
    <div data-testid="module-builder-page">
      <PageHeader
        title="Add Side Hustle"
        description="Create new modules for your dashboard. Each side hustle gets its own tab in the sidebar."
        actions={
          <Button onClick={() => { setShowForm(true); setEditModule(null); setForm({ name: '', description: '', icon: 'Layers', color: 'teal', notes: '', links: [] }); }}
            size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
            data-testid="create-module-button">
            <Plus className="w-3 h-3 mr-1" /> New Side Hustle
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">{editModule ? 'Edit Side Hustle' : 'New Side Hustle'}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. 'Print on Demand', 'YouTube Channel'" className="text-xs bg-surface-2"
                  data-testid="module-name-input" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="What is this side hustle about? Goals, strategy..."
                  className="w-full rounded-lg border border-border/70 bg-surface-2 p-2.5 text-xs text-foreground resize-none h-24" />
              </div>

              {/* Color picker */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Colour</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm({...form, color: c})}
                      className={`w-6 h-6 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: `var(--${c === 'teal' ? 'primary' : c}-500, hsl(var(--primary)))` }}>
                    </button>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Useful Links</Label>
                {form.links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-foreground flex-1 truncate">{link.label}: {link.url}</span>
                    <button onClick={() => removeLink(i)} className="text-muted-foreground hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={newLink.label} onChange={e => setNewLink({...newLink, label: e.target.value})}
                    placeholder="Label" className="text-xs bg-surface-2 flex-1" />
                  <Input value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})}
                    placeholder="URL" className="text-xs bg-surface-2 flex-1" />
                  <Button onClick={addLink} variant="outline" size="sm" className="border-border/70 text-xs">Add</Button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Any additional notes, strategy, API keys needed..."
                  className="w-full rounded-lg border border-border/70 bg-surface-2 p-2.5 text-xs text-foreground resize-none h-16" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreate} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {editModule ? 'Update Side Hustle' : 'Add to Dashboard'}
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline" className="border-border/70">Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Existing modules */}
        <div className={showForm ? '' : 'lg:col-span-2'}>
          {modules.length === 0 ? (
            <EmptyState icon={Layers} title="No side hustles yet"
              description="Add your first side hustle to create a custom tab in the sidebar" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {modules.map(m => (
                <div key={m.module_id} className={`rounded-xl border bg-card p-4 ${COLOR_MAP[m.color] || COLOR_MAP.teal} border`}
                  data-testid="module-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${COLOR_MAP[m.color] || COLOR_MAP.teal}`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">Custom module</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleEdit(m)} className="p-1 text-muted-foreground hover:text-foreground"><Edit className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(m.module_id)} className="p-1 text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{m.description}</p>
                  {(m.links || []).length > 0 && (
                    <div className="space-y-1">
                      {m.links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" />{link.label}
                        </a>
                      ))}
                    </div>
                  )}
                  {m.notes && <p className="text-xs text-muted-foreground mt-2 italic">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
