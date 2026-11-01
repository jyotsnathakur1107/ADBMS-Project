// src/pages/AdminDashboard.jsx - Administrative Oversight & DBMS Analytics
import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users, BookOpen, GraduationCap, ShieldCheck, Database,
  TrendingUp, RefreshCw, AlertCircle, CheckCircle2, Layers
} from 'lucide-react';
import {
  Button, Badge, Card, CardHeader, CardBody,
  LoadingPage, StatCard, Alert
} from '../components/UI';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunReconcileProcedure = async () => {
    setReconciling(true);
    setReconcileResult(null);

    try {
      const res = await api.post('/admin/maintenance/reconcile');
      if (res.data.success) {
        setReconcileResult({
          type: 'success',
          message: res.data.message || 'Stored procedure sp_reconcile_enrollment_counts executed successfully. Counters verified against ground-truth tables.'
        });
        fetchStats();
      }
    } catch (err) {
      setReconcileResult({
        type: 'error',
        message: err.response?.data?.message || 'Procedure execution failed.'
      });
    } finally {
      setReconciling(false);
    }
  };

  if (loading) return <LoadingPage />;

  const stats = data?.stats || {};
  const deptAnalytics = data?.department_analytics || [];
  const recentActivity = data?.recent_activity || [];

  // Recharts colors
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6', '#64748b'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              System Administration
            </span>
            <span className="text-xs text-slate-500">PostgreSQL Transaction Engine Active</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            University Registrar Management Console
          </h1>
          <p className="text-sm text-slate-500">
            Real-time enrollment analytics, database health, audit trails, and concurrency maintenance.
          </p>
        </div>

        {/* Maintenance Action Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={reconciling}
            onClick={handleRunReconcileProcedure}
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            title="Runs PL/pgSQL stored procedure sp_reconcile_enrollment_counts"
          >
            <Database className="w-4 h-4 mr-1.5" />
            Run sp_reconcile_enrollment_counts
          </Button>
        </div>
      </div>

      {/* Procedure Execution Notification */}
      {reconcileResult && (
        <Alert
          type={reconcileResult.type}
          title="PL/pgSQL Procedure Execution"
          message={reconcileResult.message}
          onClose={() => setReconcileResult(null)}
        />
      )}

      {/* Primary Key Institutional Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          icon={GraduationCap}
          label="Total Students"
          value={stats.total_students || 0}
          color="indigo"
        />
        <StatCard
          icon={Users}
          label="Faculty Members"
          value={stats.total_faculty || 0}
          color="emerald"
        />
        <StatCard
          icon={BookOpen}
          label="Active Offerings"
          value={stats.active_offerings || 0}
          color="purple"
        />
        <StatCard
          icon={ShieldCheck}
          label="Active Registrations"
          value={stats.active_enrollments || 0}
          color="sky"
        />
        <StatCard
          icon={AlertCircle}
          label="Full Sections"
          value={stats.full_courses || 0}
          color="red"
        />
        <StatCard
          icon={Layers}
          label="Waitlisted Students"
          value={stats.total_waitlisted || 0}
          color="amber"
        />
      </div>

      {/* Charts Row: Department Breakdown & Capacity Fill */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Enrollment Bar Chart */}
        <Card className="p-5">
          <CardHeader className="px-0 pt-0">
            <h3 className="font-bold text-slate-900 text-sm">Department Enrollment Statistics</h3>
            <p className="text-xs text-slate-400">Total registered students by department (from mv_admin_dashboard_analytics)</p>
          </CardHeader>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="department_code"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="total_enrollments" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Enrollments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Capacity Utilization Pie Chart */}
        <Card className="p-5">
          <CardHeader className="px-0 pt-0">
            <h3 className="font-bold text-slate-900 text-sm">Capacity Allocation by Department</h3>
            <p className="text-xs text-slate-400">Total student seat capacity breakdown across divisions</p>
          </CardHeader>
          <div className="h-64 mt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptAnalytics}
                  dataKey="total_capacity"
                  nameKey="department_code"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {deptAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Live Registration Audit Trail Feed */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Live Registration Audit Feed</h3>
            <p className="text-xs text-slate-400">Immutable transactional log from registration_audit_logs table</p>
          </div>
          <span className="text-[11px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            PostgreSQL WAL Logged
          </span>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Offering ID</th>
                  <th className="px-4 py-3">Transaction Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No recent audit operations recorded.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 font-mono">
                      <td className="px-4 py-2.5 text-slate-500">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-slate-800 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {log.student_id ? `STU#${log.student_id}` : 'System'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {log.offering_id ? `SEC#${log.offering_id}` : 'N/A'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate text-[11px]">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

