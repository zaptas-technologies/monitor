import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserProjects() {
  const { fetchWithAuth } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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
                    <div style={{ marginTop: '0.15rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Task titles: <strong>{getTaskTitleCount(p)}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'right', minWidth: 170 }}>
                      {/* <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Completed: <strong>{p.completion?.percent ?? 0}%</strong>
                        <span style={{ marginLeft: '0.35rem' }}>
                          ({p.completion?.completedTasks ?? 0}/{p.completion?.totalTasks ?? 0})
                        </span>
                      </div> */}
                      {/* <div
                        style={{
                          marginTop: '0.25rem',
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: 'var(--bg-muted)',
                          overflow: 'hidden',
                        }}
                        aria-label={`Project completion ${p.completion?.percent ?? 0}%`}
                        role="img"
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(0, Math.min(100, p.completion?.percent ?? 0))}%`,
                            backgroundColor: 'var(--primary)',
                          }}
                        />
                      </div> */}
                    </div>
                    <Link to={`/projects/${p._id}`} className="btn btn-ghost">View activities</Link>
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
