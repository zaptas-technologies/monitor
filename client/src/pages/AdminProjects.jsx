import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminProjects() {
  const { fetchWithAuth } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', assignedTo: [], taskTitleConfigs: [], active: true });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [taskTitleInput, setTaskTitleInput] = useState({ title: '', startDate: '', totalDays: '', endDate: '' });

  const computeEndDateFromStartAndDays = (startDate, totalDays) => {
    if (!startDate || !totalDays || Number(totalDays) <= 0) return '';
    const d = new Date(startDate);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + Number(totalDays) - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getProjectTotalDays = () => {
    const ranges = (form.taskTitleConfigs || []).filter((c) => c.startDate && c.endDate);
    if (ranges.length === 0) return null;

    const toUtcDay = (val) => {
      if (!val) return null;
      const parts = val.split('-').map(Number);
      if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
      const [y, m, d] = parts;
      return Date.UTC(y, m - 1, d);
    };

    let minStart = null;
    let maxEnd = null;
    ranges.forEach((c) => {
      const s = toUtcDay(c.startDate);
      const e = toUtcDay(c.endDate);
      if (s == null || e == null) return;
      if (minStart == null || s < minStart) minStart = s;
      if (maxEnd == null || e > maxEnd) maxEnd = e;
    });
    if (minStart == null || maxEnd == null) return null;
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.floor((maxEnd - minStart) / MS_PER_DAY) + 1;
  };

  const getTaskTitleCount = (project) => {
    if (!project) return 0;
    if (Array.isArray(project.taskTitleConfigs) && project.taskTitleConfigs.length > 0) {
      const seen = new Set();
      project.taskTitleConfigs.forEach((c) => {
        const t = c.title && String(c.title).trim();
        if (t) seen.add(t.toLowerCase());
      });
      return seen.size;
    }
    if (Array.isArray(project.taskTitles) && project.taskTitles.length > 0) {
      const seen = new Set();
      project.taskTitles.forEach((raw) => {
        const t = raw && String(raw).trim();
        if (t) seen.add(t.toLowerCase());
      });
      return seen.size;
    }
    return 0;
  };

  const getTitleCompletion = (project) => {
    const total = project?.titleCompletion?.totalTitles ?? 0;
    const done = project?.titleCompletion?.completedTitles ?? 0;
    const percent = project?.titleCompletion?.percent ?? (total > 0 ? Math.round((done / total) * 100) : 0);
    return { total, done, percent };
  };

  // Compute total planned task days and completed task days for a project.
  // This uses per-title completion status from the backend so that the
  // "completed days" count is based on real completed titles, not just
  // a percentage approximation.
  const getProjectTaskDaysProgress = (project) => {
    if (!project || !Array.isArray(project.taskTitleConfigs)) {
      return { totalDays: null, completedDays: 0, percent: 0 };
    }

    const ranges = project.taskTitleConfigs.filter((c) => c.startDate && c.endDate);
    if (ranges.length === 0) {
      return { totalDays: null, completedDays: 0, percent: 0 };
    }

    const toUtcDay = (val) => {
      if (!val) return null;
      const parts = String(val).slice(0, 10).split('-').map(Number);
      if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
      const [y, m, d] = parts;
      return Date.UTC(y, m - 1, d);
    };

    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    // Helper: number of days in a single config (or 0 if invalid)
    const getRangeDays = (cfg) => {
      const s = toUtcDay(cfg.startDate);
      const e = toUtcDay(cfg.endDate);
      if (s == null || e == null || e < s) return 0;
      return Math.floor((e - s) / MS_PER_DAY) + 1;
    };

    // Map of lower‑cased title -> status from backend
    const statusByLower = Array.isArray(project.titleStatus)
      ? project.titleStatus.reduce((map, s) => {
          if (s && s.titleLower) {
            map.set(s.titleLower, s);
          }
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

    if (!totalDays) {
      return { totalDays: null, completedDays: 0, percent: 0 };
    }

    const safeCompleted = Math.max(0, Math.min(completedDays, totalDays));
    const percent = Math.round((safeCompleted / totalDays) * 100);

    return { totalDays, completedDays: safeCompleted, percent };
  };

  const load = async () => {
    try {
      const [prRes, uRes] = await Promise.all([
        fetchWithAuth('/api/projects'),
        fetchWithAuth('/api/users'),
      ]);
      const prData = await prRes.json();
      const uData = await uRes.json();
      if (prRes.ok) setProjects(prData);
      if (uRes.ok) setUsers(uData.filter((u) => u.role === 'user'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ ...form, assignedTo: form.assignedTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setForm({ name: '', description: '', assignedTo: [], taskTitleConfigs: [], active: true });
      setTaskTitleInput({ title: '', startDate: '', totalDays: '', endDate: '' });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUser = (userId) => {
    setForm((f) => ({
      ...f,
      assignedTo: f.assignedTo.includes(userId) ? f.assignedTo.filter((id) => id !== userId) : [...f.assignedTo, userId],
    }));
  };

  const addTaskTitle = () => {
    const value = (taskTitleInput.title || '').trim();
    if (!value) return;
    const computedEndDate =
      taskTitleInput.startDate && taskTitleInput.totalDays
        ? computeEndDateFromStartAndDays(taskTitleInput.startDate, taskTitleInput.totalDays)
        : taskTitleInput.endDate || '';
    setForm((f) => ({
      ...f,
      taskTitleConfigs: f.taskTitleConfigs.some((c) => c.title === value && c.startDate === taskTitleInput.startDate && c.endDate === taskTitleInput.endDate)
        ? f.taskTitleConfigs
        : [
            ...f.taskTitleConfigs,
            {
              title: value,
              startDate: taskTitleInput.startDate || '',
              endDate: computedEndDate || '',
            },
          ],
    }));
    setTaskTitleInput({ title: '', startDate: '', totalDays: '', endDate: '' });
  };

  const removeTaskTitle = (config) => {
    setForm((f) => ({
      ...f,
      taskTitleConfigs: f.taskTitleConfigs.filter(
        (c) => !(c.title === config.title && c.startDate === config.startDate && c.endDate === config.endDate)
      ),
    }));
  };
 
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  // Toggle project active/inactive (admin action)
  const toggleProjectActive = async (project) => {
    try {
      await fetchWithAuth(`/api/projects/${project._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !project.active }),
      });
      load();
    } catch (err) {
      // best-effort: set error for UI
      setError(err.message || 'Failed to update project');
    }
  };

  const displayedProjects = projects.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'active') return p?.active !== false;
    return p?.active === false;
  });

  if (loading) return <div className="page"><p>Loading projects...</p></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h1>Projects</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div role="toolbar" aria-label="Filter projects" style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              style={{ fontWeight: filter === 'all' ? 600 : 'normal' }}
            >
              All
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFilter('active')}
              aria-pressed={filter === 'active'}
              style={{ fontWeight: filter === 'active' ? 600 : 'normal' }}
            >
              Active
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFilter('inactive')}
              aria-pressed={filter === 'inactive'}
              style={{ fontWeight: filter === 'inactive' ? 600 : 'normal' }}
            >
              Inactive
            </button>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'Create project'}
          </button>
        </div>
      </div>
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <h3>New project</h3>
            {getProjectTotalDays() != null && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Total days in project: <strong>{getProjectTotalDays()}</strong>
              </span>
            )}
          </div>
          <form onSubmit={handleCreate}>
            <div className="input-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="input-group">
              <label>Status</label>
              <select
                value={form.active ? 'active' : 'inactive'}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === 'active' }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="input-group">
              <label>Task titles (shown as suggestions when users add tasks)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={taskTitleInput.title}
                  onChange={(e) => setTaskTitleInput((prev) => ({ ...prev, title: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTaskTitle();
                    }
                  }}
                  placeholder="e.g. Daily report"
                  style={{ flex: '1 1 160px' }}
                />
                <input
                  type="date"
                  value={taskTitleInput.startDate}
                  onChange={(e) =>
                    setTaskTitleInput((prev) => {
                      const updated = { ...prev, startDate: e.target.value };
                      if (updated.startDate && updated.totalDays) {
                        updated.endDate = computeEndDateFromStartAndDays(updated.startDate, updated.totalDays);
                      } else {
                        updated.endDate = '';
                      }
                      return updated;
                    })
                  }
                  style={{ flex: '0 0 150px' }}
                  placeholder="Start date"
                />
                <input
                  type="number"
                  min={1}
                  value={taskTitleInput.totalDays}
                  onChange={(e) =>
                    setTaskTitleInput((prev) => {
                      const value = e.target.value;
                      const updated = { ...prev, totalDays: value };
                      if (updated.startDate && value) {
                        updated.endDate = computeEndDateFromStartAndDays(updated.startDate, value);
                      } else {
                        updated.endDate = '';
                      }
                      return updated;
                    })
                  }
                  style={{ flex: '0 0 110px' }}
                  placeholder="Total days"
                />
                <input
                  type="date"
                  value={taskTitleInput.endDate}
                  readOnly
                  style={{ flex: '0 0 150px', backgroundColor: 'var(--bg-muted)' }}
                  placeholder="End date"
                />
                <button type="button" className="btn btn-ghost" onClick={addTaskTitle}>
                  Add
                </button>
              </div>
              {form.taskTitleConfigs.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {form.taskTitleConfigs.map((cfg, idx) => (
                    <span
                      key={`${cfg.title}-${cfg.startDate}-${cfg.endDate}-${idx}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-muted)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span>
                        {cfg.title}
                        {(cfg.startDate || cfg.endDate) && (
                          <span style={{ marginLeft: '0.25rem', color: 'var(--text-muted)' }}>
                            ({cfg.startDate || '—'} to {cfg.endDate || '—'})
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTaskTitle(cfg)}
                        style={{
                          marginLeft: '0.25rem',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                        aria-label={`Remove ${cfg.title}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="input-group">
              <label>Assign to users</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {users.map((u) => (
                  <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.assignedTo.includes(u._id)} onChange={() => toggleUser(u._id)} />
                    {u.name}
                  </label>
                ))}
                {users.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No users to assign</span>}
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button>
          </form>
        </div>
      )}
      <div className="card">
        {displayedProjects.length === 0 ? (
          <div className="empty-state"><p>No projects yet. Create one above.</p></div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {displayedProjects.map((p) => (
              <li key={p._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                {/* Use a two-column grid so the action column on the right has a fixed width */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '0.75rem', alignItems: 'center' }}>
                  <div>
                    <Link to={`/admin/projects/${p._id}`} style={{ fontWeight: 500 }}>{p.name}</Link>
                    {p?.active === false && (
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>(Inactive)</span>
                    )}
                    {p.description && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.9rem' }}>{p.description}</span>}
                    {p.assignedTo?.length > 0 && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                        ({p.assignedTo.length} user(s))
                      </span>
                    )}
                    <div style={{ marginTop: '0.15rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Task titles: <strong>{getTaskTitleCount(p)}</strong>
                    </div>
                    <div style={{ marginTop: '0.1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {(() => {
                        const { total, done, percent } = getTitleCompletion(p);
                        if (total === 0) return <span>No titles completed yet</span>;
                        return (
                          <span>
                            Completed task: <strong>{done}</strong> / {total} ({percent}%)
                          </span>
                        );
                      })()}
                    </div>
                    <div style={{ marginTop: '0.1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {(() => {
                        const { totalDays, completedDays, percent } = getProjectTaskDaysProgress(p);
                        if (totalDays == null) return <span>Task days: —</span>;
                        return (
                          <span>
                            Task days: <strong>{completedDays}</strong> / {totalDays} ({percent}%)
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-end' }}>
                    {/* Keep a small right-side area for any summary visuals (kept empty for now) */}
                    <div style={{ textAlign: 'right', minWidth: 100, flex: '0 0 100px' }} />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => toggleProjectActive(p)}
                      aria-pressed={p?.active === false}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {p?.active === false ? 'Activate' : 'Deactivate'}
                    </button>
                    <Link to={`/admin/projects/${p._id}`} className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }}>View / Edit</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
