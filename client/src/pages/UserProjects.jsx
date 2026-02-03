import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserProjects() {
  const { fetchWithAuth } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth('/api/projects');
        const data = await res.json();
        if (res.ok) setProjects(data);
      } catch (e) {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="page"><p>Loading projects...</p></div>;

  return (
    <div className="page">
      <h1>My Projects</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.95rem' }}>
        Projects assigned to you by admin. Open a project to see activities and add tasks.
      </p>
      <div className="card">
        {projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects assigned yet.</p>
            <p style={{ fontSize: '0.9rem' }}>Ask your admin to assign you to a project.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {projects.map((p) => (
              <li key={p._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <Link to={`/projects/${p._id}`} style={{ fontWeight: 500 }}>{p.name}</Link>
                    {p.description && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.9rem' }}>{p.description}</span>}
                  </div>
                  <Link to={`/projects/${p._id}`} className="btn btn-ghost">View activities</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
