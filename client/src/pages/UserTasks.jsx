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
    dueDate: '',
    timeSpentMinutes: 0,
    project: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

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
      const res = await fetchWithAuth('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setForm({ title: '', description: '', status: 'pending', dueDate: '', timeSpentMinutes: 0, project: '' });
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
            <div className="input-group">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="input-group">
              <label>Description</label>
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
              <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>Time spent (minutes)</label>
              <input type="number" min={0} value={form.timeSpentMinutes} onChange={(e) => setForm((f) => ({ ...f, timeSpentMinutes: e.target.value }))} />
            </div>
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
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add task'}</button>
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
                    <div className="input-group">
                      <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} required />
                    </div>
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
                        <input type="datetime-local" value={editForm.dueDate} onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))} />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: 100 }}>
                        <label>Time (min)</label>
                        <input type="number" min={0} value={editForm.timeSpentMinutes} onChange={(e) => setEditForm((f) => ({ ...f, timeSpentMinutes: e.target.value }))} />
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
                        {' · '}Due: {formatDate(t.dueDate)} · Time: {t.timeSpentMinutes ?? 0} min
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
