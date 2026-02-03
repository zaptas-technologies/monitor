import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminProjects() {
  const { fetchWithAuth } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', assignedTo: [] });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setForm({ name: '', description: '', assignedTo: [] });
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
          <h3 style={{ marginBottom: '1rem' }}>New project</h3>
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
                    {p.description && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.9rem' }}>{p.description}</span>}
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
