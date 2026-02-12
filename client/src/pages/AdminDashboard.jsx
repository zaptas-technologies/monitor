import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="page">
      <h1>Admin Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        <Link to="/admin/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Users</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create users and view their data</p>
        </Link>
        <Link to="/admin/projects" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Projects</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create projects and assign to users</p>
        </Link>
        <Link to="/admin/projects/graphs" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Project graphs</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View progress and task-day graphs for all projects</p>
        </Link>
      </div>
    </div>
  );
}
