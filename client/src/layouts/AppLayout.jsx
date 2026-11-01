// src/layouts/AppLayout.jsx - Main Application Layout
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  BookOpen, Calendar, Clock, LayoutDashboard, LogOut,
  Bell, GraduationCap, Users, Shield, Settings, Menu, X,
  ChevronDown, CheckCircle, AlertTriangle, Info, Database
} from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '../components/UI';

export default function AppLayout() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTerm, setCurrentTerm] = useState(null);

  // Fetch notifications & current term
  useEffect(() => {
    async function loadMeta() {
      try {
        const [notifRes, termRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/terms/current')
        ]);
        if (notifRes.data.success) {
          setNotifications(notifRes.data.data);
          setUnreadCount(notifRes.data.data.filter(n => !n.is_read).length);
        }
        if (termRes.data.success) {
          setCurrentTerm(termRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load initial layout metadata', err);
      }
    }
    loadMeta();
  }, [location.pathname]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Role-based navigation items
  const navItems = {
    student: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/catalog', label: 'Course Catalog', icon: BookOpen },
      { to: '/my-courses', label: 'My Courses', icon: GraduationCap },
      { to: '/timetable', label: 'Timetable', icon: Calendar },
      { to: '/progress', label: 'Academic Progress', icon: Clock },
    ],
    faculty: [
      { to: '/', label: 'My Courses', icon: LayoutDashboard },
      { to: '/faculty/rosters', label: 'Class Rosters', icon: Users },
      { to: '/catalog', label: 'Course Catalog', icon: BookOpen },
    ],
    admin: [
      { to: '/', label: 'Analytics Dashboard', icon: LayoutDashboard },
      { to: '/admin/offerings', label: 'Course Offerings', icon: BookOpen },
      { to: '/admin/courses', label: 'Manage Courses', icon: Settings },
      { to: '/admin/audit', label: 'Audit Trail', icon: Database },
      { to: '/catalog', label: 'View Catalog', icon: GraduationCap },
    ],
  };

  const currentNav = (user && navItems[user.role]) || [];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-indigo-500/20 shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight leading-tight block">
                UniReg Portal
              </span>
              <span className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider block">
                DBMS Academic System
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Term Banner */}
        <div className="mx-4 my-3 px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
          <div className="text-slate-400 font-medium">Current Semester</div>
          <div className="text-white font-semibold flex items-center justify-between mt-0.5">
            <span>{currentTerm ? currentTerm.name : 'Fall 2026'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {currentNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Role Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 text-sm">
              {profile?.first_name ? profile.first_name[0] : user?.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {profile ? `${profile.first_name} ${profile.last_name}` : user?.email}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={clsx(
                    'inline-block px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider',
                    user?.role === 'admin'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : user?.role === 'faculty'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  )}
                >
                  {user?.role}
                </span>
                {profile?.student_id && (
                  <span className="text-[11px] text-slate-400 truncate">
                    {profile.student_id}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800/80 text-slate-300 hover:bg-red-950/40 hover:text-red-300 hover:border-red-800/50 border border-slate-700/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Academic Session</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-semibold">{currentTerm?.name || 'Fall 2026'}</span>
              <Badge variant="success" size="sm">Registration Open</Badge>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800">
                      Notifications ({unreadCount} new)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={clsx(
                            'p-3.5 hover:bg-slate-50 transition-colors text-left flex gap-3',
                            !n.is_read && 'bg-indigo-50/40'
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {n.type === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : n.type === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Info className="w-4 h-4 text-indigo-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
                {profile?.first_name ? profile.first_name[0] : user?.email[0].toUpperCase()}
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <span className="font-semibold text-slate-800 block">
                  {profile ? `${profile.first_name} ${profile.last_name}` : user?.email}
                </span>
                <span className="text-slate-400 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

