import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminProjectsGraph from './pages/AdminProjectsGraph';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminProjects from './pages/AdminProjects';
import AdminProjectDetail from './pages/AdminProjectDetail';
import UserTasks from './pages/UserTasks';
import UserProjects from './pages/UserProjects';
import UserProjectDetail from './pages/UserProjectDetail';

function ProtectedRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/tasks" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/tasks'} replace />;
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomeRedirect />} />
          {/* Admin routes */}
          <Route path="admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
          <Route path="admin/users/:id" element={<ProtectedRoute adminOnly><AdminUserDetail /></ProtectedRoute>} />
          <Route path="admin/projects" element={<ProtectedRoute adminOnly><AdminProjects /></ProtectedRoute>} />
          <Route path="admin/projects/graphs" element={<ProtectedRoute adminOnly><AdminProjectsGraph /></ProtectedRoute>} />
          <Route path="admin/projects/:id" element={<ProtectedRoute adminOnly><AdminProjectDetail /></ProtectedRoute>} />
          {/* User routes */}
          <Route path="tasks" element={<UserTasks />} />
          <Route path="projects" element={<UserProjects />} />
          <Route path="projects/:id" element={<UserProjectDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
