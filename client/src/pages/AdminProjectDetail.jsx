import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function TaskDetailModal({ task, onClose }) {
  if (!task) return null;
  const formatDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-content task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{task.title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <dl className="detail-list">
            <div className="detail-row">
              <dt>Status</dt>
              <dd><span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span></dd>
            </div>
            {task.description && (
              <div className="detail-row">
                <dt>Description</dt>
                <dd>{task.description}</dd>
              </div>
            )}
            <div className="detail-row">
              <dt>Created by</dt>
              <dd>{task.createdBy?.name ?? '—'} {task.createdBy?.email && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>({task.createdBy.email})</span>}</dd>
            </div>
            <div className="detail-row">
              <dt>Due date</dt>
              <dd>{formatDate(task.dueDate)}</dd>
            </div>
            <div className="detail-row">
              <dt>Time spent</dt>
              <dd>{task.timeSpentMinutes ?? 0} min</dd>
            </div>
            <div className="detail-row">
              <dt>Created</dt>
              <dd>{formatDate(task.createdAt)}</dd>
            </div>
            <div className="detail-row">
              <dt>Last updated</dt>
              <dd>{formatDate(task.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function AdminProjectDetail() {
  const { id } = useParams();
  const { fetchWithAuth } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', assignedTo: [], taskTitleConfigs: [] });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
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

  // Sum of days for all task title ranges in this project (overlaps counted)
  const getProjectTotalDays = () => {
    const ranges = (form.taskTitleConfigs || []).filter((c) => c.startDate && c.endDate);
    if (ranges.length === 0) return null;

    const toUtcDay = (val) => {
      if (!val) return null;
      const parts = String(val).slice(0, 10).split('-').map(Number);
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

  const load = async () => {
    try {
      const [projRes, uRes] = await Promise.all([
        fetchWithAuth(`/api/projects/${id}`),
        fetchWithAuth('/api/users'),
      ]);
      const projData = await projRes.json();
      const uData = await uRes.json();
      if (projRes.ok) {
        setProject(projData.project);
        setTasks(projData.tasks || []);
        setForm({
          name: projData.project.name,
          description: projData.project.description || '',
          assignedTo: (projData.project.assignedTo || []).map((u) => u._id),
          taskTitleConfigs: projData.project.taskTitleConfigs || [],
        });
      }
      if (uRes.ok) setUsers(uData.filter((u) => u.role === 'user'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setProject(data);
      setEditMode(false);
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

  const updateTaskTitleConfig = (index, patch) => {
    setForm((f) => ({
      ...f,
      taskTitleConfigs: f.taskTitleConfigs.map((cfg, i) => (i === index ? { ...cfg, ...patch } : cfg)),
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
      taskTitleConfigs: [
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

  const removeTaskTitle = (index) => {
    setForm((f) => ({
      ...f,
      taskTitleConfigs: f.taskTitleConfigs.filter((_, i) => i !== index),
    }));
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!project) return <div className="page"><p>Project not found.</p></div>;

  return (
    <div className="page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin/projects" className="btn btn-ghost">← Projects</Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1>{project.name}</h1>
          {editMode && getProjectTotalDays() != null && (
            <div style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Total days in project: <strong>{getProjectTotalDays()}</strong>
            </div>
          )}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setEditMode((v) => !v)}>{editMode ? 'Cancel' : 'Edit'}</button>
      </div>
      {editMode ? (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleUpdate}>
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
                  placeholder="e.g. report"
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
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {form.taskTitleConfigs.map((cfg, idx) => {
                    const startValue = cfg.startDate ? String(cfg.startDate).slice(0, 10) : '';
                    const endValue = cfg.endDate ? String(cfg.endDate).slice(0, 10) : '';
                    let daysLabel = '';
                    if (startValue && endValue) {
                      const s = new Date(startValue);
                      const e = new Date(endValue);
                      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
                        const sUTC = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
                        const eUTC = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
                        if (eUTC >= sUTC) {
                          const MS_PER_DAY = 1000 * 60 * 60 * 24;
                          const days = Math.floor((eUTC - sUTC) / MS_PER_DAY) + 1;
                          daysLabel = ` (${days} day${days === 1 ? '' : 's'})`;
                        }
                      }
                    }
                    return (
                      <div
                        key={`${cfg.title}-${idx}`}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.4rem',
                          alignItems: 'center',
                          padding: '0.25rem 0.4rem',
                          borderRadius: '0.5rem',
                          backgroundColor: 'var(--bg-muted)',
                        }}
                      >
                        <input
                          type="text"
                          value={cfg.title || ''}
                          onChange={(e) => updateTaskTitleConfig(idx, { title: e.target.value })}
                          style={{ flex: '1 1 160px' }}
                        />
                        <input
                          type="date"
                          value={startValue}
                          onChange={(e) => updateTaskTitleConfig(idx, { startDate: e.target.value })}
                          style={{ flex: '0 0 150px' }}
                        />
                        <input
                          type="date"
                          value={endValue}
                          onChange={(e) => updateTaskTitleConfig(idx, { endDate: e.target.value })}
                          style={{ flex: '0 0 150px' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {startValue && endValue ? `Planned: ${new Date(startValue).toLocaleDateString()} to ${new Date(endValue).toLocaleDateString()}${daysLabel}` : 'No dates set'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-danger"
                          onClick={() => removeTaskTitle(idx)}
                          style={{ marginLeft: '0.25rem', padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
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
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          {project.description && <p style={{ color: 'var(--text-muted)' }}>{project.description}</p>}
          <p><strong>Assigned:</strong> {project.assignedTo?.map((u) => u.name).join(', ') || 'None'}</p>
        </div>
      )}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Activities / Tasks</h2>
      <div className="card">
        {tasks.length === 0 ? (
          <div className="empty-state"><p>No tasks in this project yet. Users can add tasks when assigned.</p></div>
        ) : (
          <ul className="task-list">
            {tasks.map((t) => (
              <li
                key={t._id}
                className="task-list-item"
                onClick={() => setSelectedTask(t)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTask(t); } }}
              >
                <strong>{t.title}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>by {t.createdBy?.name}</span>
                <span className={`badge badge-${t.status}`} style={{ marginLeft: '0.5rem' }}>{t.status.replace('_', ' ')}</span>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Due: {t.dueDate ? new Date(t.dueDate).toLocaleString() : '—'} · Time: {t.timeSpentMinutes ?? 0} min
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}
