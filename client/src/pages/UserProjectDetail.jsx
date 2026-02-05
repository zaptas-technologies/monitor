import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserProjectDetail() {
  const { id } = useParams();
  const { fetchWithAuth } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'pending', dueDate: '', timeSpentMinutes: 0 });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${id}`);
      const data = await res.json();
      if (res.ok) {
        setProject(data.project);
        setTasks(data.tasks || []);
      }
    } catch (e) {
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAddTask = async (e) => {
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
        project: id,
      };
      const res = await fetchWithAuth('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setForm({ title: '', description: '', status: 'pending', dueDate: '', timeSpentMinutes: 0 });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : '—');

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!project) return <div className="page"><p>Project not found.</p></div>;

  return (
    <div className="page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/projects" className="btn btn-ghost">← My projects</Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h1>{project.name}</h1>
        {/* <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add activity / task'}
        </button> */}
      </div>
      {project.description && (
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{project.description}</p>
      )}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>New activity</h3>
          <form onSubmit={handleAddTask}>
            <div className="input-group">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g. Create login component" />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional details" />
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
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add activity'}</button>
          </form>
        </div>
      )}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Activities / Tasks</h2>
      <div className="card">
        {tasks.length === 0 ? (
          <div className="empty-state"><p>No activities yet. Add one above (e.g. component tasks).</p></div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {tasks.map((t) => (
              <li key={t._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                <strong>{t.title}</strong>
                <span className={`badge badge-${t.status}`} style={{ marginLeft: '0.5rem' }}>{t.status.replace('_', ' ')}</span>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Due: {formatDate(t.dueDate)} · Time: {t.timeSpentMinutes ?? 0} min
                  {t.createdBy?.name && ` · by ${t.createdBy.name}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
