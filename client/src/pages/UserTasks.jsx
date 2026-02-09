import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserTasks() {
  const { fetchWithAuth } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'pending',
    dueDate: new Date().toISOString().slice(0, 16), // default to today
    timeSpentMinutes: 0,
    project: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [titleSchedule, setTitleSchedule] = useState({ startDate: '', totalDays: '', endDate: '' });

  const load = async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        fetchWithAuth('/api/tasks'),
        fetchWithAuth('/api/projects'),
      ]);
      const tData = await tRes.json();
      const pData = await pRes.json();
      if (tRes.ok) setTasks(tData);
      if (pRes.ok) setProjects(pData);
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
      const payload = {
        title: form.title,
        description: form.description || '',
        status: form.status,
        dueDate: form.dueDate || null,
        timeSpentMinutes: Number(form.timeSpentMinutes) || 0,
        project: form.project || null,
      };
      const project = projects.find((p) => p._id === form.project);
      const existingCfg = project && getProjectTitleConfig(project, form.title);
      if (!existingCfg && form.project && titleSchedule.startDate && titleSchedule.totalDays) {
        payload.titleStartDate = titleSchedule.startDate;
        payload.titleTotalDays = Number(titleSchedule.totalDays) || 0;
        payload.titleEndDate =
          titleSchedule.endDate ||
          computeEndDateFromStartAndDays(titleSchedule.startDate, titleSchedule.totalDays);
      }
      const res = await fetchWithAuth('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setForm({
        title: '',
        description: '',
        status: 'pending',
        dueDate: new Date().toISOString().slice(0, 16),
        timeSpentMinutes: 0,
        project: '',
      });
      setTitleSchedule({ startDate: '', totalDays: '', endDate: '' });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (task) => {
    setEditingId(task._id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
      timeSpentMinutes: task.timeSpentMinutes ?? 0,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description || '',
        status: editForm.status,
        dueDate: editForm.dueDate || null,
        timeSpentMinutes: Number(editForm.timeSpentMinutes) || 0,
      };
      const res = await fetchWithAuth(`/api/tasks/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setEditingId(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetchWithAuth(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) load();
    } catch (e) {
      setError(e.message);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : '—');

  const formatTimeSpent = (minutes) => {
    if (!minutes && minutes !== 0) return '—';
    const hours = (minutes / 60).toFixed(1);
    return hours.endsWith('.0') ? hours.slice(0, -2) : hours;
  };

  const getMaxDate = () => new Date().toISOString().slice(0, 16);

  const selectedProject = projects.find((p) => p._id === form.project);
  const getTaskProject = (task) => projects.find((p) => p._id === (task.project?._id || task.project));
  const getProjectTaskTitles = (project) => {
    if (!project) return [];
    if (Array.isArray(project.taskTitleConfigs) && project.taskTitleConfigs.length > 0) {
      const seen = new Set();
      const titles = [];
      project.taskTitleConfigs.forEach((c) => {
        const t = c.title && c.title.trim();
        if (t && !seen.has(t.toLowerCase())) {
          seen.add(t.toLowerCase());
          titles.push(t);
        }
      });
      return titles;
    }
    if (Array.isArray(project.taskTitles) && project.taskTitles.length > 0) {
      const seen = new Set();
      const titles = [];
      project.taskTitles.forEach((raw) => {
        const t = raw && String(raw).trim();
        if (t && !seen.has(t.toLowerCase())) {
          seen.add(t.toLowerCase());
          titles.push(t);
        }
      });
      return titles;
    }
    return [];
  };

  const getProjectTitleConfig = (project, title) => {
    if (!project || !title || !Array.isArray(project.taskTitleConfigs)) return null;
    const lower = title.trim().toLowerCase();
    return project.taskTitleConfigs.find(
      (c) => c.title && c.title.trim().toLowerCase() === lower
    ) || null;
  };

  const getDaysBetweenInclusive = (start, end) => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    const sUTC = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
    const eUTC = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
    if (eUTC < sUTC) return null;
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.floor((eUTC - sUTC) / MS_PER_DAY) + 1;
  };

  const formatDateOnly = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  };

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

  if (loading) return <div className="page"><p>Loading tasks...</p></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h1>My Tasks</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add task'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>New task</h3>
          <form onSubmit={handleCreate}>
            {projects.length > 0 && (
              <div className="input-group">
                <label>Project</label>
                <select value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}>
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="input-group">
              <label>Title</label>
              <input
                value={form.title}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((f) => ({ ...f, title: value }));
                  const project = projects.find((p) => p._id === form.project);
                  const existingCfg = project && getProjectTitleConfig(project, value);
                  if (existingCfg) {
                    setTitleSchedule({ startDate: '', totalDays: '', endDate: '' });
                  }
                }}
                list={selectedProject && getProjectTaskTitles(selectedProject).length > 0 ? 'taskTitleOptions' : undefined}
                required
              />
              {selectedProject && getProjectTaskTitles(selectedProject).length > 0 && (
                <datalist id="taskTitleOptions">
                  {getProjectTaskTitles(selectedProject).map((title) => (
                    <option key={title} value={title} />
                  ))}
                </datalist>
              )}
              {selectedProject && form.title && (() => {
                const cfg = getProjectTitleConfig(selectedProject, form.title);
                if (cfg) {
                  const days = getDaysBetweenInclusive(cfg.startDate, cfg.endDate);
                  return (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Planned: {formatDateOnly(cfg.startDate)} to {formatDateOnly(cfg.endDate)}
                      {days != null && ` (${days} day${days === 1 ? '' : 's'})`}
                    </div>
                  );
                }
                return (
                  <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: '0.15rem' }}>Plan this new title (optional):</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="date"
                        value={titleSchedule.startDate}
                        onChange={(e) =>
                          setTitleSchedule((prev) => {
                            const updated = { ...prev, startDate: e.target.value };
                            if (updated.startDate && updated.totalDays) {
                              updated.endDate = computeEndDateFromStartAndDays(
                                updated.startDate,
                                updated.totalDays
                              );
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
                        value={titleSchedule.totalDays}
                        onChange={(e) =>
                          setTitleSchedule((prev) => {
                            const value = e.target.value;
                            const updated = { ...prev, totalDays: value };
                            if (updated.startDate && value) {
                              updated.endDate = computeEndDateFromStartAndDays(
                                updated.startDate,
                                value
                              );
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
                        value={titleSchedule.endDate}
                        readOnly
                        style={{ flex: '0 0 150px', backgroundColor: 'var(--bg-muted)' }}
                        placeholder="End date"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="input-group">
              <label>Activity</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="input-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="input-group">
              <label>Due date & time</label>
              <input
                type="datetime-local"
                value={form.dueDate}
                max={getMaxDate()}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label>Time spent (hours)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={(Number(form.timeSpentMinutes) / 60).toFixed(1)}
                onChange={(e) => {
                  const hours = Number(e.target.value);
                  setForm((f) => ({ ...f, timeSpentMinutes: Math.round(hours * 60) }));
                }}
              />
            </div>
            
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add task'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {tasks.length === 0 ? (
          <div className="empty-state"><p>No tasks yet. Add one above.</p></div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {tasks.map((t) => (
              <li key={t._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                {editingId === t._id ? (
                  <form onSubmit={handleUpdate} style={{ marginTop: '0.5rem' }}>
                    {(() => {
                      const taskProject = getTaskProject(t);
                      const titles = getProjectTaskTitles(taskProject);
                      return (
                        <div className="input-group">
                          <label>Title</label>
                          <input
                            value={editForm.title}
                            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                            list={taskProject && titles.length > 0 ? `editTitleOptions-${t._id}` : undefined}
                            required
                          />
                          {taskProject && titles.length > 0 && (
                            <datalist id={`editTitleOptions-${t._id}`}>
                              {titles.map((title) => (
                                <option key={title} value={title} />
                              ))}
                            </datalist>
                          )}
                          {taskProject && editForm.title && (() => {
                            const cfg = getProjectTitleConfig(taskProject, editForm.title);
                            if (!cfg) return null;
                            const days = getDaysBetweenInclusive(cfg.startDate, cfg.endDate);
                            return (
                              <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Planned: {formatDateOnly(cfg.startDate)} to {formatDateOnly(cfg.endDate)}
                                {days != null && ` (${days} day${days === 1 ? '' : 's'})`}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                    <div className="input-group">
                      <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: 120 }}>
                        <label>Status</label>
                        <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
                        <label>Due date</label>
                        <input
                          type="datetime-local"
                          value={editForm.dueDate}
                          max={getMaxDate()}
                          onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                        />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: 100 }}>
                        <label>Time (h)</label>
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          value={(Number(editForm.timeSpentMinutes) / 60).toFixed(1)}
                          onChange={(e) => {
                            const hours = Number(e.target.value);
                            setEditForm((f) => ({ ...f, timeSpentMinutes: Math.round(hours * 60) }));
                          }}
                        />
                      </div>
                    </div>
                    {error && <p className="error-msg">{error}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>Save</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <strong>{t.title}</strong>
                      {t.project?.name && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({t.project.name})</span>}
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Status: <span className={`badge badge-${t.status}`}>{t.status.replace('_', ' ')}</span>
                        {' · '}Due: {formatDate(t.dueDate)} · Time: {formatTimeSpent(t.timeSpentMinutes)} h
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button type="button" className="btn btn-ghost" onClick={() => startEdit(t)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-danger" onClick={() => handleDelete(t._id)}>Delete</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}