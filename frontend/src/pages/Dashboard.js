import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Library, Download, TrendingUp, CheckCircle, Clock, AlertCircle, BookOpen, Image, ExternalLink, RefreshCw } from 'lucide-react';
import { KpiCard, StatusBadge, PageHeader, EmptyState } from '../components/shared';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentLibrary, setRecentLibrary] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [statsRes, jobsRes, libRes, healthRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/library/stats/overview`),
        axios.get(`${BACKEND_URL}/api/jobs?limit=5`),
        axios.get(`${BACKEND_URL}/api/library?limit=4`),
        axios.get(`${BACKEND_URL}/api/health`)
      ]);
      setStats(statsRes.data);
      setRecentJobs(jobsRes.data);
      setRecentLibrary(libRes.data);
      setHealth(healthRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        title="Command Center"
        description="Overview of your Ultimate Deployment Dashboard"
        actions={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-secondary text-secondary-foreground hover:bg-muted border border-border/70"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        }
      />

      {/* Status Banner */}
      {health && (
        <div className="mb-6 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border/70 bg-card text-xs">
          <div className={`w-2 h-2 rounded-full ${health.dropbox ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-foreground font-medium">Dropbox</span>
          <span className="text-muted-foreground">{health.dropbox ? `Connected as ${health.dropbox_account}` : 'Not connected'}</span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-testid="kpi-grid">
        <KpiCard
          title="Total Media"
          value={stats?.total_media ?? '—'}
          subtitle="In content library"
          icon={Library}
        />
        <KpiCard
          title="Skool Lessons"
          value={stats?.skool_videos ?? '—'}
          subtitle="Downloaded & analysed"
          icon={BookOpen}
        />
        <KpiCard
          title="Pinterest B-Roll"
          value={stats?.pinterest_videos ?? '—'}
          subtitle="Ready to use"
          icon={Image}
        />
        <KpiCard
          title="Active Jobs"
          value={stats?.jobs_active ?? '—'}
          subtitle={`${stats?.jobs_complete ?? 0} completed total`}
          icon={Download}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Recent Jobs
          </h2>
          {recentJobs.length === 0 ? (
            <EmptyState
              icon={Download}
              title="No jobs yet"
              description="Start a download from Skool or Pinterest"
            />
          ) : (
            <div className="space-y-2">
              {recentJobs.map(job => (
                <div key={job.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0" data-testid="dashboard-job-row">
                  <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                    {job.source === 'skool' ? <BookOpen className="w-3 h-3 text-muted-foreground" /> : <Image className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{job.title || job.url}</p>
                    <p className="text-xs text-muted-foreground">{job.source} · {new Date(job.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Library */}
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Library className="w-4 h-4 text-primary" /> Recent Content
          </h2>
          {recentLibrary.length === 0 ? (
            <EmptyState
              icon={Library}
              title="Library empty"
              description="Downloaded content will appear here"
            />
          ) : (
            <div className="space-y-2">
              {recentLibrary.map(item => (
                <div key={item.item_id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.source} · {item.duration ? `${Math.floor(item.duration/60)}m ${Math.floor(item.duration%60)}s` : 'N/A'}</p>
                  </div>
                  {item.dropbox_link && (
                    <a href={item.dropbox_link} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
