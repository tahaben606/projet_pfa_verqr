import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ children, roles }) {
  const { session, profile, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
