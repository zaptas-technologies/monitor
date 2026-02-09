import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminProjects() {
  const { fetchWithAuth } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', assignedTo: [], taskTitleConfigs: [] });
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

  // Sum of days for all task title ranges (overlaps and same dates all counted) - for new project form
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

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    let total = 0;

    ranges.forEach((c) => {
      const s = toUtcDay(c.startDate);
      const e = toUtcDay(c.endDate);
      if (s == null || e == null) return;
      if (e < s) return;
      total += Math.floor((e - s) / MS_PER_DAY) + 1;
    });

    return total || null;
  };

  const getProjectRangeSummary = (project) => {
    if (!project || !Array.isArray(project.taskTitleConfigs) || project.taskTitleConfigs.length === 0) return null;
    const ranges = project.taskTitleConfigs.filter((c) => c.startDate && c.endDate);
    if (ranges.length === 0) return null;

    const toUtcDay = (val) => {
      if (!val) return null;
      const parts = String(val).slice(0, 10).split('-').map(Number);
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
    const days = Math.floor((maxEnd - minStart) / MS_PER_DAY) + 1;
    const startDate = new Date(minStart);
    const endDate = new Date(maxEnd);
    const startLabel = startDate.toLocaleDateString();
    const endLabel = endDate.toLocaleDateString();
    return { startLabel, endLabel, days };
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
      setForm({ name: '', description: '', assignedTo: [], taskTitleConfigs: [] });
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

  const clearAllTaskTitles = () => {
    setForm((f) => ({
      ...f,
      taskTitleConfigs: [],
    }));
    setTaskTitleInput({ title: '', startDate: '', totalDays: '', endDate: '' });
  };

  if (loading) return <div className="page"><p>Loading projects...</p></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h1>Projects</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Create project'}
        </button>
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
                 {form.taskTitleConfigs.length > 0 && (
                   <button
                     type="button"
                     className="btn btn-ghost btn-danger"
                     onClick={clearAllTaskTitles}
                     style={{ marginLeft: '0.25rem' }}
                   >
                     Delete all
                   </button>
                 )}
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
                        className="btn btn-ghost btn-danger"
                        style={{
                          marginLeft: '0.4rem',
                          padding: '0.1rem 0.4rem',
                          fontSize: '0.75rem',
                        }}
                      >
                        Delete
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
        {projects.length === 0 ? (
          <div className="empty-state"><p>No projects yet. Create one above.</p></div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {projects.map((p) => (
              <li key={p._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <Link to={`/admin/projects/${p._id}`} style={{ fontWeight: 500 }}>{p.name}</Link>
                    {p.description && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.9rem' }}>
                        {p.description}
                      </span>
                    )}
                    {(() => {
                      const summary = getProjectRangeSummary(p);
                      if (!summary) return null;
                      return (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Planned: {summary.startLabel} to {summary.endLabel} ({summary.days} day{summary.days === 1 ? '' : 's'})
                        </div>
                      );
                    })()}
                    {p.assignedTo?.length > 0 && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                        ({p.assignedTo.length} user(s))
                      </span>
                    )}
                  </div>
                  <Link to={`/admin/projects/${p._id}`} className="btn btn-ghost">View / Edit</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
