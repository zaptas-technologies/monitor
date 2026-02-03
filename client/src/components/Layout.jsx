import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            ☰
          </button>
          <NavLink to={isAdmin ? '/admin' : '/tasks'} style={{ fontWeight: 600, color: 'var(--text)' }}>
            Montor
          </NavLink>
        </div>
        <nav className="layout-nav" style={{
          display: menuOpen ? 'flex' : 'none',
          flexDirection: 'column',
          position: 'absolute',
          top: '52px',
          left: '1rem',
          right: '1rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '0.5rem',
          zIndex: 100,
          gap: '0.25rem',
        }}>
          {isAdmin ? (
            <>
              <NavLink to="/admin" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
              <NavLink to="/admin/users" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => setMenuOpen(false)}>Users</NavLink>
              <NavLink to="/admin/projects" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => setMenuOpen(false)}>Projects</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/tasks" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => setMenuOpen(false)}>My Tasks</NavLink>
              <NavLink to="/projects" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => setMenuOpen(false)}>My Projects</NavLink>
            </>
          )}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{user?.name}</span>
          <span className="badge badge-in_progress" style={{ textTransform: 'capitalize' }}>{user?.role}</span>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
