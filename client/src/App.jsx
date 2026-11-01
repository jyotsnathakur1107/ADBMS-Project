// src/App.jsx - Application Router & Role-Based Routing
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import AppLayout from './layouts/AppLayout';

// Common & Auth Pages
import Login from './pages/Login';
import CourseCatalog from './pages/CourseCatalog';

// Student Pages
import StudentDashboard from './pages/StudentDashboard';
import MyCourses from './pages/MyCourses';
import TimetablePage from './pages/TimetablePage';
import AcademicProgress from './pages/AcademicProgress';

// Faculty Pages
import FacultyDashboard from './pages/FacultyDashboard';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminOfferings from './pages/AdminOfferings';
import AdminCourses from './pages/AdminCourses';
import AdminAuditLogs from './pages/AdminAuditLogs';

// UI
import { LoadingPage } from './components/UI';

// Route Guards
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Role-Aware Home Dashboard
function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'faculty':
      return <FacultyDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'student':
    default:
      return <StudentDashboard />;
  }
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingPage />;

  return (
    <Routes>
      {/* Public Auth Route */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Protected App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Dynamic Role Dashboard */}
        <Route path="/" element={<RoleHome />} />

        {/* Course Catalog (Shared by all roles) */}
        <Route path="/catalog" element={<CourseCatalog />} />

        {/* Student Specific Routes */}
        <Route
          path="/my-courses"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <MyCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <TimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <AcademicProgress />
            </ProtectedRoute>
          }
        />

        {/* Faculty Specific Routes */}
        <Route
          path="/faculty/rosters"
          element={
            <ProtectedRoute allowedRoles={['faculty', 'admin']}>
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Specific Routes */}
        <Route
          path="/admin/offerings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOfferings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAuditLogs />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

