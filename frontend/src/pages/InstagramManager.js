import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Camera as InstagramIcon,
  Plus,
  Trash2,
  MessageSquare,
  Check,
  Calendar,
  Image as ImageIcon,
  Video,
  Grid,
  Send,
  Clock,
  ChevronDown,
  ChevronUp,
  Upload,
  Sparkles
} from 'lucide-react';
const Instagram = InstagramIcon;
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { PageHeader, EmptyState } from '../components/shared';
import { Card } from '../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function InstagramManager() {
  // State
  const [accounts, setAccounts] = useState([]);
  const [rules, setRules] = useState([]);
  const [bufferChannels, setBufferChannels] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newAccount, setNewAccount] = useState({ username: '', account_type: 'business', notes: '' });
  const [newRule, setNewRule] = useState({ account_id: '', trigger_keyword: '', response_message: '', send_link: '' });
  const [newPost, setNewPost] = useState({
    text: '',
    channel_id: '',
    post_type: 'feed',
    media_urls: [''],
    scheduled_at: '',
    scheduling_type: 'automatic',
    tags: ''
  });

  // Load data
  const loadAll = async () => {
    try {
      const [aRes, rRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/instagram/accounts`),
        axios.get(`${BACKEND_URL}/api/instagram/dm-rules`)
      ]);
      setAccounts(aRes.data);
      setRules(rRes.data);
    } catch (e) {
      console.error('Failed to load accounts/rules:', e);
    }
  };

  const loadBufferChannels = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/buffer/channels`);
      if (res.data.success) {
        setBufferChannels(res.data.channels);
        if (res.data.channels.length > 0 && !newPost.channel_id) {
          setNewPost(prev => ({ ...prev, channel_id: res.data.channels[0].id }));
        }
      }
    } catch (e) {
      console.error('Failed to load Buffer channels:', e);
    }
  };

  const loadScheduledPosts = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/buffer/posts?status=scheduled&limit=50`);
      if (res.data.success) {
        setScheduledPosts(res.data.posts);
      }
    } catch (e) {
      console.error('Failed to load scheduled posts:', e);
    }
  };

  useEffect(() => {
    loadAll();
    loadBufferChannels();
    loadScheduledPosts();
  }, []);

  // Account handlers
  const handleAddAccount = async () => {
    if (!newAccount.username) {
      toast.error('Enter a username');
      return;
    }
    try {
      await axios.post(`${BACKEND_URL}/api/instagram/accounts`, newAccount);
      toast.success('Account added!');
      setNewAccount({ username: '', account_type: 'business', notes: '' });
      setShowAddAccount(false);
      loadAll();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    }
  };

  const handleDeleteAccount = async (id) => {
    await axios.delete(`${BACKEND_URL}/api/instagram/accounts/${id}`);
    toast.success('Account removed');
    loadAll();
  };

  // DM Rule handlers
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
    } catch (e) {
      toast.error('Failed: ' + e.message);
    }
  };

  const handleDeleteRule = async (id) => {
    await axios.delete(`${BACKEND_URL}/api/instagram/dm-rules/${id}`);
    toast.success('Rule deleted');
    loadAll();
  };

  // Post handlers
  const handleCreatePost = async () => {
    if (!newPost.text.trim()) {
      toast.error('Please add a caption');
      return;
    }
    
    if (!newPost.channel_id) {
      toast.error('Please select an Instagram account');
      return;
    }

    // Validate media for post type
    const validMedia = newPost.media_urls.filter(url => url.trim());
    
    if (newPost.post_type === 'carousel' && validMedia.length < 2) {
      toast.error('Carousel posts require at least 2 images');
      return;
    }
    
    if (newPost.post_type === 'reel' && validMedia.length === 0) {
      toast.error('Reel posts require a video URL');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        text: newPost.text,
        channel_id: newPost.channel_id,
        post_type: newPost.post_type,
        media_urls: validMedia,
        scheduling_type: newPost.scheduling_type,
        tags: newPost.tags ? newPost.tags.split(',').map(t => t.trim()) : []
      };

      if (newPost.scheduled_at) {
        payload.scheduled_at = new Date(newPost.scheduled_at).toISOString();
      }

      const res = await axios.post(`${BACKEND_URL}/api/buffer/posts`, payload);
      
      if (res.data.success) {
        toast.success(`Post ${newPost.scheduled_at ? 'scheduled' : 'queued'} successfully!`);
        setNewPost({
          text: '',
          channel_id: bufferChannels[0]?.id || '',
          post_type: 'feed',
          media_urls: [''],
          scheduled_at: '',
          scheduling_type: 'automatic',
          tags: ''
        });
        loadScheduledPosts();
      }
    } catch (e) {
      toast.error('Failed to create post: ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/buffer/posts/${postId}`);
      toast.success('Post deleted');
      loadScheduledPosts();
    } catch (e) {
      toast.error('Failed to delete post');
    }
  };

  const addMediaField = () => {
    setNewPost(prev => ({
      ...prev,
      media_urls: [...prev.media_urls, '']
    }));
  };

  const updateMediaUrl = (index, value) => {
    const updated = [...newPost.media_urls];
    updated[index] = value;
    setNewPost(prev => ({ ...prev, media_urls: updated }));
  };

  const removeMediaField = (index) => {
    const updated = newPost.media_urls.filter((_, i) => i !== index);
    setNewPost(prev => ({
      ...prev,
      media_urls: updated.length === 0 ? [''] : updated
    }));
  };

  const getPostTypeIcon = (type) => {
    switch (type) {
      case 'reel':
        return <Video className="w-4 h-4" />;
      case 'carousel':
        return <Grid className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  return (
    <div data-testid="instagram-manager-page" className="pb-8">
      <PageHeader
        title="Instagram Management"
        description="Schedule posts, manage accounts, and automate DMs with Buffer"
      />

      <Tabs defaultValue="scheduler" className="w-full">
        <TabsList className="bg-muted/40 border border-border/70 mb-5">
          <TabsTrigger value="scheduler" className="text-xs" data-testid="scheduler-tab">
            <Calendar className="w-3 h-3 mr-1.5" />
            Post Scheduler
          </TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs" data-testid="accounts-tab">
            <Instagram className="w-3 h-3 mr-1.5" />
            Accounts ({accounts.length})
          </TabsTrigger>
          <TabsTrigger value="dm-rules" className="text-xs" data-testid="dm-rules-tab">
            <MessageSquare className="w-3 h-3 mr-1.5" />
            DM Automation ({rules.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* POST SCHEDULER TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="scheduler" data-testid="scheduler-content">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: POST COMPOSER */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-6 bg-card border-border/70">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Create Instagram Post
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {bufferChannels.length} account{bufferChannels.length !== 1 ? 's' : ''} connected
                  </span>
                </div>

                {/* Simple Mode: Core Fields */}
                <div className="space-y-4">
                  {/* Account Selector */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Instagram Account *
                    </Label>
                    <select
                      value={newPost.channel_id}
                      onChange={(e) => setNewPost(prev => ({ ...prev, channel_id: e.target.value }))}
                      className="w-full h-10 rounded-lg border border-border/70 bg-background text-sm text-foreground px-3"
                      data-testid="account-select"
                    >
                      {bufferChannels.length === 0 && (
                        <option value="">No accounts connected - Connect via Buffer</option>
                      )}
                      {bufferChannels.map(ch => (
                        <option key={ch.id} value={ch.id}>
                          @{ch.username || ch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Caption */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Caption *
                    </Label>
                    <textarea
                      value={newPost.text}
                      onChange={(e) => setNewPost(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Write your caption... Add #hashtags and @mentions"
                      className="w-full rounded-lg border border-border/70 bg-background p-3 text-sm text-foreground resize-none focus:ring-2 focus:ring-primary/20"
                      rows={4}
                      data-testid="caption-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {newPost.text.length} / 2200 characters
                    </p>
                  </div>

                  {/* Media Upload */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Media {newPost.post_type === 'carousel' ? '(2-10 images)' : newPost.post_type === 'reel' ? '(Video URL)' : '(Optional)'}
                    </Label>
                    <div className="space-y-2">
                      {newPost.media_urls.map((url, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={url}
                            onChange={(e) => updateMediaUrl(idx, e.target.value)}
                            placeholder={newPost.post_type === 'reel' ? 'https://your-cdn.com/video.mp4' : 'https://your-cdn.com/image.jpg'}
                            className="flex-1 text-xs bg-background"
                            data-testid={`media-url-${idx}`}
                          />
                          {newPost.media_urls.length > 1 && (
                            <Button
                              onClick={() => removeMediaField(idx)}
                              variant="outline"
                              size="sm"
                              className="text-red-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {newPost.post_type === 'carousel' && newPost.media_urls.length < 10 && (
                        <Button
                          onClick={addMediaField}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Image
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Tip: Upload media to your CDN or use Dropbox public links
                    </p>
                  </div>

                  {/* Post Now or Schedule */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCreatePost}
                      disabled={loading || !newPost.channel_id || !newPost.text.trim()}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      data-testid="post-now-button"
                    >
                      {loading ? (
                        'Creating...'
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {newPost.scheduled_at ? 'Schedule Post' : 'Add to Queue'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Advanced Options Toggle */}
                <div className="mt-6 pt-6 border-t border-border/50">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="advanced-toggle"
                  >
                    <span className="flex items-center gap-2">
                      {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Advanced Options
                    </span>
                    <span className="text-xs">
                      Post type • Scheduling • Tags
                    </span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4 p-4 rounded-lg bg-muted/20 border border-border/50">
                      {/* Post Type */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Post Type</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'feed', label: 'Feed Post', icon: ImageIcon },
                            { value: 'reel', label: 'Reel', icon: Video },
                            { value: 'carousel', label: 'Carousel', icon: Grid }
                          ].map(type => (
                            <button
                              key={type.value}
                              onClick={() => setNewPost(prev => ({ ...prev, post_type: type.value }))}
                              className={`
                                flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                                ${newPost.post_type === type.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/70 bg-background hover:bg-muted/30 text-muted-foreground'
                                }
                              `}
                              data-testid={`post-type-${type.value}`}
                            >
                              <type.icon className="w-5 h-5 mb-1" />
                              <span className="text-xs font-medium">{type.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Scheduled Date/Time */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Schedule for later (optional)
                        </Label>
                        <Input
                          type="datetime-local"
                          value={newPost.scheduled_at}
                          onChange={(e) => setNewPost(prev => ({ ...prev, scheduled_at: e.target.value }))}
                          className="text-xs bg-background"
                          data-testid="schedule-datetime"
                        />
                      </div>

                      {/* Scheduling Type */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Publishing Mode</Label>
                        <select
                          value={newPost.scheduling_type}
                          onChange={(e) => setNewPost(prev => ({ ...prev, scheduling_type: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-border/70 bg-background text-xs text-foreground px-2"
                        >
                          <option value="automatic">Automatic (Post directly)</option>
                          <option value="notification">Notification (Manual approval in app)</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          ℹ️ Reels and advanced features may require notification mode
                        </p>
                      </div>

                      {/* Tags */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Tags (comma-separated)</Label>
                        <Input
                          value={newPost.tags}
                          onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="marketing, product-launch, campaign-q2"
                          className="text-xs bg-background"
                          data-testid="tags-input"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* RIGHT: SCHEDULED POSTS */}
            <div className="space-y-4">
              <Card className="p-4 bg-card border-border/70">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Scheduled Posts
                  </h3>
                  <span className="text-xs text-muted-foreground">{scheduledPosts.length}</span>
                </div>

                {scheduledPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="text-xs text-muted-foreground">No scheduled posts</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {scheduledPosts.map(post => (
                      <div
                        key={post.id}
                        className="p-3 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <Instagram className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              @{post.channel?.username}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-foreground line-clamp-2 mb-2">
                          {post.text}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.dueAt ? new Date(post.dueAt).toLocaleDateString() : 'In queue'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                            {post.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Quick Stats */}
              <Card className="p-4 bg-card border-border/70">
                <h3 className="text-sm font-semibold text-foreground mb-3">Buffer Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Connected Accounts</span>
                    <span className="font-semibold text-foreground">{bufferChannels.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Scheduled Posts</span>
                    <span className="font-semibold text-foreground">{scheduledPosts.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">DM Rules Active</span>
                    <span className="font-semibold text-foreground">{rules.filter(r => r.is_active).length}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ACCOUNTS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="accounts">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-muted-foreground">
              Manage your local Instagram account registry
            </p>
            <Button
              onClick={() => setShowAddAccount(!showAddAccount)}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              data-testid="add-instagram-account-button"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Account
            </Button>
          </div>

          {showAddAccount && (
            <Card className="p-4 mb-4 bg-card border-border/70">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Username</Label>
                  <Input
                    value={newAccount.username}
                    onChange={e => setNewAccount({ ...newAccount, username: e.target.value })}
                    placeholder="@username"
                    className="text-xs bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                  <select
                    value={newAccount.account_type}
                    onChange={e => setNewAccount({ ...newAccount, account_type: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border/70 bg-background text-xs text-foreground px-2"
                  >
                    <option value="business">Business</option>
                    <option value="creator">Creator</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>
              <Input
                value={newAccount.notes}
                onChange={e => setNewAccount({ ...newAccount, notes: e.target.value })}
                placeholder="Notes (optional)"
                className="text-xs bg-background mb-3"
              />
              <div className="flex gap-2">
                <Button onClick={handleAddAccount} className="bg-primary text-primary-foreground text-xs">
                  Add Account
                </Button>
                <Button onClick={() => setShowAddAccount(false)} variant="outline" className="border-border/70 text-xs">
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {accounts.length === 0 ? (
            <EmptyState icon={Instagram} title="No accounts yet" description="Add your Instagram accounts to get started" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(acct => (
                <Card key={acct.account_id} className="p-4 bg-card border-border/70">
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
                    <button
                      onClick={() => handleDeleteAccount(acct.account_id)}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/20 p-2 text-center">
                      <p className="font-semibold text-foreground">-</p>
                      <p className="text-muted-foreground">Followers</p>
                    </div>
                    <div className="rounded-lg bg-muted/20 p-2 text-center">
                      <p className="font-semibold text-foreground">
                        {rules.filter(r => r.account_id === acct.account_id).length}
                      </p>
                      <p className="text-muted-foreground">DM Rules</p>
                    </div>
                  </div>
                  {acct.notes && <p className="text-xs text-muted-foreground mt-2">{acct.notes}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DM RULES TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="dm-rules">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-muted-foreground">
              Keyword triggers → automated DM responses (ManyChat-style)
            </p>
            <Button
              onClick={() => setShowAddRule(!showAddRule)}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              data-testid="add-dm-rule-button"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Rule
            </Button>
          </div>

          {showAddRule && (
            <Card className="p-4 mb-4 bg-card border-border/70">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Trigger Keyword</Label>
                  <Input
                    value={newRule.trigger_keyword}
                    onChange={e => setNewRule({ ...newRule, trigger_keyword: e.target.value })}
                    placeholder="e.g. 'free guide'"
                    className="text-xs bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Account</Label>
                  <select
                    value={newRule.account_id}
                    onChange={e => setNewRule({ ...newRule, account_id: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border/70 bg-background text-xs text-foreground px-2"
                  >
                    <option value="">All accounts</option>
                    {accounts.map(a => (
                      <option key={a.account_id} value={a.account_id}>
                        @{a.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                value={newRule.response_message}
                onChange={e => setNewRule({ ...newRule, response_message: e.target.value })}
                placeholder="Auto-reply message sent when trigger is detected..."
                className="w-full rounded-lg border border-border/70 bg-background p-2.5 text-xs text-foreground resize-none h-20 mb-3"
              />
              <Input
                value={newRule.send_link}
                onChange={e => setNewRule({ ...newRule, send_link: e.target.value })}
                placeholder="Attach link (optional)"
                className="text-xs bg-background mb-3"
              />
              <div className="flex gap-2">
                <Button onClick={handleAddRule} className="bg-primary text-primary-foreground text-xs">
                  Create Rule
                </Button>
                <Button onClick={() => setShowAddRule(false)} variant="outline" className="border-border/70 text-xs">
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {rules.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No DM rules" description="Create keyword-triggered auto-reply rules" />
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <Card key={rule.rule_id} className="p-4 bg-card border-border/70">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-mono">
                          {rule.trigger_keyword}
                        </span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className="text-xs text-muted-foreground">Auto-Reply</span>
                        {rule.is_active && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                      </div>
                      <p className="text-xs text-foreground mb-1">{rule.response_message}</p>
                      {rule.send_link && <p className="text-xs text-primary font-mono">{rule.send_link}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.rule_id)}
                      className="text-muted-foreground hover:text-red-400 ml-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
