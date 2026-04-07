import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Key, Plus, Eye, EyeOff, Trash2, Shield, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SERVICES = [
  'Instagram Graph API', 'Buffer', 'Later', 'Dropbox', 'OpenAI', 'Anthropic', 'Google Gemini',
  'HeyGen', 'D-ID', 'ElevenLabs', 'Emergent', 'Skool', 'Pinterest', 'Other'
];

export default function Settings() {
  const [keys, setKeys] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);
  const [form, setForm] = useState({ name: '', service: 'Other', key_value: '', notes: '' });

  const loadKeys = async () => {
    try {
      const r = await axios.get(`${BACKEND_URL}/api/vault/keys`);
      setKeys(r.data);
    } catch (e) {}
  };

  useEffect(() => { loadKeys(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.key_value) { toast.error('Name and key required'); return; }
    try {
      await axios.post(`${BACKEND_URL}/api/vault/keys`, form);
      toast.success('API key stored securely!');
      setForm({ name: '', service: 'Other', key_value: '', notes: '' });
      setShowAdd(false);
      loadKeys();
    } catch (e) { toast.error('Failed to save key'); }
  };

  const handleReveal = async (key_id) => {
    if (revealedKey?.id === key_id) {
      setRevealedKey(null);
      return;
    }
    try {
      const r = await axios.get(`${BACKEND_URL}/api/vault/keys/${key_id}/reveal`);
      setRevealedKey({ id: key_id, value: r.data.key_value });
      // Auto-hide after 30s
      setTimeout(() => setRevealedKey(null), 30000);
    } catch (e) { toast.error('Failed to reveal key'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this API key?')) return;
    await axios.delete(`${BACKEND_URL}/api/vault/keys/${id}`);
    toast.success('Key deleted');
    loadKeys();
  };

  const handleCopy = async (key_id) => {
    const r = await axios.get(`${BACKEND_URL}/api/vault/keys/${key_id}/reveal`);
    navigator.clipboard.writeText(r.data.key_value);
    toast.success('Key copied to clipboard');
  };

  return (
    <div data-testid="settings-page">
      <PageHeader
        title="Settings & API Vault"
        description="Securely store and manage your API keys for all integrations"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys Vault */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">API Keys Vault</h2>
              <span className="text-xs text-muted-foreground">({keys.length} keys stored)</span>
            </div>
            <Button onClick={() => setShowAdd(!showAdd)} size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              data-testid="add-api-key-button">
              <Plus className="w-3 h-3 mr-1" /> Store Key
            </Button>
          </div>

          {showAdd && (
            <div className="rounded-xl border border-border/70 bg-card p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground">Add API Key</h3>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Name/Label</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="e.g. 'Main Instagram Token'" className="text-xs bg-surface-2" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Service</Label>
                  <select value={form.service} onChange={e => setForm({...form, service: e.target.value})}
                    className="w-full h-9 rounded-lg border border-border/70 bg-surface-2 text-xs text-foreground px-2">
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground mb-1 block">API Key / Token</Label>
                <Input value={form.key_value} onChange={e => setForm({...form, key_value: e.target.value})}
                  type="password" placeholder="Paste your API key here..."
                  className="font-mono text-xs bg-surface-2" />
              </div>
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</Label>
                <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="e.g. 'Expires Dec 2025, for AI Creators Academy account'"
                  className="text-xs bg-surface-2" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  Store Securely
                </Button>
                <Button onClick={() => setShowAdd(false)} variant="outline" className="border-border/70">Cancel</Button>
              </div>
            </div>
          )}

          {keys.length === 0 ? (
            <EmptyState icon={Key} title="No keys stored" description="Store your API keys securely for quick access" />
          ) : (
            <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-background/80">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Service</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Key</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Notes</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(k => (
                    <tr key={k.id} className="border-b border-border/40 hover:bg-muted/40" data-testid="api-key-row">
                      <td className="py-3 px-4 font-medium text-foreground">{k.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{k.service}</span>
                      </td>
                      <td className="py-3 px-4">
                        <code className="font-mono text-muted-foreground">
                          {revealedKey?.id === k.id ? revealedKey.value : k.key_masked}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{k.notes || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleReveal(k.id)}
                            className="p-1 text-muted-foreground hover:text-foreground" title="Reveal">
                            {revealedKey?.id === k.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button onClick={() => handleCopy(k.id)}
                            className="p-1 text-muted-foreground hover:text-foreground text-xs">Copy</button>
                          <button onClick={() => handleDelete(k.id)}
                            className="p-1 text-muted-foreground hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Integration Status */}
      <div className="mt-6 rounded-xl border border-border/70 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Integration Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'Dropbox', status: 'connected', note: 'My UI app' },
            { name: 'Skool', status: 'connected', note: 'Via cookies' },
            { name: 'Pinterest', status: 'connected', note: 'yt-dlp' },
            { name: 'Instagram Graph API', status: 'pending', note: 'Add token' },
            { name: 'Buffer/Later', status: 'pending', note: 'Coming soon' },
            { name: 'HeyGen/D-ID', status: 'pending', note: 'Avatar videos' },
            { name: 'OpenAI / Claude', status: 'active', note: 'Emergent key' },
            { name: 'Stan Store', status: 'planned', note: 'Phase 7' },
          ].map(item => (
            <div key={item.name} className="rounded-lg bg-surface-2 p-3 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${
                  item.status === 'connected' ? 'bg-green-400' :
                  item.status === 'active' ? 'bg-blue-400' :
                  item.status === 'pending' ? 'bg-yellow-400' : 'bg-muted'
                }`} />
                <span className="text-xs font-medium text-foreground">{item.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
