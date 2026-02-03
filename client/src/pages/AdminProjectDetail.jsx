import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminProjectDetail() {
  const { id } = useParams();
  const { fetchWithAuth } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', assignedTo: [] });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!project) return <div className="page"><p>Project not found.</p></div>;

  return (
    <div className="page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin/projects" className="btn btn-ghost">← Projects</Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1>{project.name}</h1>
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
          <ul style={{ listStyle: 'none' }}>
            {tasks.map((t) => (
              <li key={t._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
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
    </div>
  );
}
