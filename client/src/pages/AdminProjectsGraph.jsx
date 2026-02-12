import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminProjectsGraph() {
  const { fetchWithAuth } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toUtcDay = (val) => {
    if (!val) return null;
    const parts = String(val).slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    const [y, m, d] = parts;
    return Date.UTC(y, m - 1, d);
  };

  const getRangeDays = (cfg) => {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const s = toUtcDay(cfg.startDate);
    const e = toUtcDay(cfg.endDate);
    if (s == null || e == null || e < s) return 0;
    return Math.floor((e - s) / MS_PER_DAY) + 1;
  };

  const getProjectTaskDaysProgress = (project) => {
    if (!project) return { totalDays: null, completedDays: 0, percent: 0 };

    const ranges = Array.isArray(project.taskTitleConfigs) ? project.taskTitleConfigs.filter((c) => c.startDate && c.endDate) : [];
    if (ranges.length === 0) {
      return { totalDays: null, completedDays: 0, percent: 0 };
    }

    // build status map from backend if available
    const statusByLower = Array.isArray(project.titleStatus)
      ? project.titleStatus.reduce((map, s) => {
          if (s && s.titleLower) map.set(s.titleLower, s);
          return map;
        }, new Map())
      : new Map();

    let totalDays = 0;
    let completedDays = 0;
    ranges.forEach((cfg) => {
      const days = getRangeDays(cfg);
      if (!days) return;
      totalDays += days;
      const title = cfg.title && String(cfg.title).trim();
      if (!title) return;
      const status = statusByLower.get(title.toLowerCase());
      if (status && status.isComplete) {
        completedDays += days;
      }
    });

    if (!totalDays) return { totalDays: null, completedDays: 0, percent: 0 };
    const safeCompleted = Math.max(0, Math.min(completedDays, totalDays));
    const percent = Math.round((safeCompleted / totalDays) * 100);
    return { totalDays, completedDays: safeCompleted, percent };
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchWithAuth('/api/projects');
        const data = await res.json();
        if (!mounted) return;
        if (res.ok) setProjects(data || []);
        else setError(data?.message || 'Failed to load projects');
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Failed to load projects');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [fetchWithAuth]);

  if (loading) return <div className="page"><p>Loading project graphs...</p></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h1>Project graphs</h1>
        <div>
          <Link to="/admin/projects" className="btn btn-ghost" style={{ marginRight: 8 }}>Projects</Link>
          <Link to="/admin" className="btn btn-ghost">Dashboard</Link>
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {projects.length === 0 ? (
        <div className="card"><p>No projects to show</p></div>
      ) : (
        <div className="card" style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Percent shows completed task-days or title completion when available.</div>
          {projects.map((p) => {
            const { totalDays, completedDays, percent } = getProjectTaskDaysProgress(p);
            return (
              <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 220, flex: '0 0 220px' }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  {p.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.description}</div>}
                </div>
                <div style={{ flex: '1 1 auto', minWidth: 220 }}>
                  <div style={{ height: 18, borderRadius: 999, backgroundColor: 'var(--bg-muted)', overflow: 'hidden' }} aria-hidden>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: 'var(--primary)', transition: 'width 300ms ease' }} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      {totalDays == null ? 'Task days: —' : <span>Task days: <strong>{completedDays}</strong> / {totalDays}</span>}
                    </div>
                    <div>
                      {typeof percent === 'number' ? `${percent}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


