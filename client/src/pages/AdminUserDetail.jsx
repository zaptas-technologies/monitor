import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminUserDetail() {
  const { id } = useParams();
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth(`/api/users/${id}`);
        const json = await res.json();
        if (res.ok && !cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!data) return <div className="page"><p>User not found.</p></div>;

  const { user, tasks, assignedProjects } = data;
  const formatDate = (d) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <div className="page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin/users" className="btn btn-ghost">← Users</Link>
      </div>
      <h1>{user.name}</h1>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> <span className="badge badge-in_progress" style={{ textTransform: 'capitalize' }}>{user.role}</span></p>
      </div>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Assigned projects</h2>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        {assignedProjects.length === 0 ? (
          <div className="empty-state"><p>No projects assigned.</p></div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {assignedProjects.map((p) => (
              <li key={p._id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <Link to={`/admin/projects/${p._id}`}>{p.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Tasks</h2>
      <div className="card">
        {tasks.length === 0 ? (
          <div className="empty-state"><p>No tasks.</p></div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {tasks.map((t) => (
              <li key={t._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong>{t.title}</strong>
                    {t.project?.name && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({t.project.name})</span>}
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Status: <span className={`badge badge-${t.status}`}>{t.status.replace('_', ' ')}</span>
                      {' · '}Due: {formatDate(t.dueDate)} · Time: {t.timeSpentMinutes ?? 0} min
                    </div>
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
