import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Camera as InstagramIcon, Plus, Trash2, MessageSquare, Check } from 'lucide-react';
const Instagram = InstagramIcon;
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function InstagramManager() {
  const [accounts, setAccounts] = useState([]);
  const [rules, setRules] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newAccount, setNewAccount] = useState({ username: '', account_type: 'business', notes: '' });
  const [newRule, setNewRule] = useState({ account_id: '', trigger_keyword: '', response_message: '', send_link: '' });

  const loadAll = async () => {
    try {
      const [aRes, rRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/instagram/accounts`),
        axios.get(`${BACKEND_URL}/api/instagram/dm-rules`)
      ]);
      setAccounts(aRes.data);
      setRules(rRes.data);
    } catch (e) {}
  };

  useEffect(() => { loadAll(); }, []);

  const handleAddAccount = async () => {
    if (!newAccount.username) { toast.error('Enter a username'); return; }
    try {
      await axios.post(`${BACKEND_URL}/api/instagram/accounts`, newAccount);
      toast.success('Account added!');
      setNewAccount({ username: '', account_type: 'business', notes: '' });
      setShowAddAccount(false);
      loadAll();
    } catch (e) { toast.error('Failed: ' + e.message); }
  };

  const handleDeleteAccount = async (id) => {
    await axios.delete(`${BACKEND_URL}/api/instagram/accounts/${id}`);
    toast.success('Account removed');
    loadAll();
  };

  const handleAddRule = async () => {
    if (!newRule.trigger_keyword || !newRule.response_message) {
      toast.error('Fill in trigger and response');
      return;
    }
    try {
      await axios.post(`${BACKEND_URL}/api/instagram/dm-rules`, {
        ...newRule,
        account_id: newRule.account_id || (accounts[0]?.account_id || 'default')
      });
      toast.success('DM rule created!');
      setNewRule({ account_id: '', trigger_keyword: '', response_message: '', send_link: '' });
      setShowAddRule(false);
      loadAll();
    } catch (e) { toast.error('Failed: ' + e.message); }
  };

  const handleDeleteRule = async (id) => {
    await axios.delete(`${BACKEND_URL}/api/instagram/dm-rules/${id}`);
    toast.success('Rule deleted');
    loadAll();
  };

  return (
    <div data-testid="instagram-manager-page">
      <PageHeader title="Instagram Management" description="Manage multiple accounts and automate DM responses" />

      <Tabs defaultValue="accounts">
        <TabsList className="bg-muted/40 border border-border/70 mb-5">
          <TabsTrigger value="accounts" className="text-xs">Accounts ({accounts.length})</TabsTrigger>
          <TabsTrigger value="dm-rules" className="text-xs">DM Automation ({rules.length})</TabsTrigger>
          <TabsTrigger value="scheduler" className="text-xs">Scheduler</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-muted-foreground">Connect and manage your Instagram accounts</p>
            <Button onClick={() => setShowAddAccount(!showAddAccount)} size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              data-testid="add-instagram-account-button">
              <Plus className="w-3 h-3 mr-1" /> Add Account
            </Button>
          </div>

          {showAddAccount && (
            <div className="rounded-xl border border-border/70 bg-card p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Username</Label>
                  <Input value={newAccount.username} onChange={e => setNewAccount({...newAccount, username: e.target.value})}
                    placeholder="@username" className="text-xs bg-surface-2" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                  <select value={newAccount.account_type}
                    onChange={e => setNewAccount({...newAccount, account_type: e.target.value})}
                    className="w-full h-9 rounded-lg border border-border/70 bg-surface-2 text-xs text-foreground px-2">
                    <option value="business">Business</option>
                    <option value="creator">Creator</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>
              <Input value={newAccount.notes} onChange={e => setNewAccount({...newAccount, notes: e.target.value})}
                placeholder="Notes (optional)" className="text-xs bg-surface-2 mb-3" />
              <div className="flex gap-2">
                <Button onClick={handleAddAccount} className="bg-primary text-primary-foreground text-xs">Add Account</Button>
                <Button onClick={() => setShowAddAccount(false)} variant="outline" className="border-border/70 text-xs">Cancel</Button>
              </div>
            </div>
          )}

          {accounts.length === 0 ? (
            <EmptyState icon={Instagram} title="No accounts yet" description="Add your Instagram accounts to get started" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(acct => (
                <div key={acct.account_id} className="rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Instagram className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">@{acct.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">{acct.account_type}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAccount(acct.account_id)} className="text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-surface-2 p-2 text-center">
                      <p className="font-semibold text-foreground">-</p>
                      <p className="text-muted-foreground">Followers</p>
                    </div>
                    <div className="rounded-lg bg-surface-2 p-2 text-center">
                      <p className="font-semibold text-foreground">{rules.filter(r => r.account_id === acct.account_id).length}</p>
                      <p className="text-muted-foreground">DM Rules</p>
                    </div>
                  </div>
                  {acct.notes && <p className="text-xs text-muted-foreground mt-2">{acct.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dm-rules">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-muted-foreground">Keyword triggers → automated DM responses (ManyChat-style)</p>
            <Button onClick={() => setShowAddRule(!showAddRule)} size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              data-testid="add-dm-rule-button">
              <Plus className="w-3 h-3 mr-1" /> Add Rule
            </Button>
          </div>

          {showAddRule && (
            <div className="rounded-xl border border-border/70 bg-card p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Trigger Keyword</Label>
                  <Input value={newRule.trigger_keyword} onChange={e => setNewRule({...newRule, trigger_keyword: e.target.value})}
                    placeholder="e.g. 'free guide'" className="text-xs bg-surface-2" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Account</Label>
                  <select value={newRule.account_id} onChange={e => setNewRule({...newRule, account_id: e.target.value})}
                    className="w-full h-9 rounded-lg border border-border/70 bg-surface-2 text-xs text-foreground px-2">
                    <option value="">All accounts</option>
                    {accounts.map(a => <option key={a.account_id} value={a.account_id}>@{a.username}</option>)}
                  </select>
                </div>
              </div>
              <textarea value={newRule.response_message} onChange={e => setNewRule({...newRule, response_message: e.target.value})}
                placeholder="Auto-reply message sent when trigger is detected..."
                className="w-full rounded-lg border border-border/70 bg-surface-2 p-2.5 text-xs text-foreground resize-none h-20 mb-3" />
              <Input value={newRule.send_link} onChange={e => setNewRule({...newRule, send_link: e.target.value})}
                placeholder="Attach link (optional)" className="text-xs bg-surface-2 mb-3" />
              <div className="flex gap-2">
                <Button onClick={handleAddRule} className="bg-primary text-primary-foreground text-xs">Create Rule</Button>
                <Button onClick={() => setShowAddRule(false)} variant="outline" className="border-border/70 text-xs">Cancel</Button>
              </div>
            </div>
          )}

          {rules.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No DM rules" description="Create keyword-triggered auto-reply rules" />
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div key={rule.rule_id} className="rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-mono">{rule.trigger_keyword}</span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className="text-xs text-muted-foreground">Auto-Reply</span>
                        {rule.is_active && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                      </div>
                      <p className="text-xs text-foreground mb-1">{rule.response_message}</p>
                      {rule.send_link && <p className="text-xs text-primary font-mono">{rule.send_link}</p>}
                    </div>
                    <button onClick={() => handleDeleteRule(rule.rule_id)} className="text-muted-foreground hover:text-red-400 ml-3">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduler">
          <div className="rounded-xl border border-border/70 bg-card p-6 text-center">
            <Instagram className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Post Scheduler</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Connect Instagram Graph API or Buffer/Later to schedule posts from your Content Library.
            </p>
            <div className="space-y-2 text-xs text-left max-w-sm mx-auto">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-2">
                <Check className="w-3 h-3 text-green-400" />
                <span className="text-muted-foreground">Content Library integration ready</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-2">
                <div className="w-3 h-3 rounded-full border border-muted-foreground" />
                <span className="text-muted-foreground">Instagram Graph API — Add token in Settings</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-2">
                <div className="w-3 h-3 rounded-full border border-muted-foreground" />
                <span className="text-muted-foreground">Buffer/Later integration — Coming soon</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
