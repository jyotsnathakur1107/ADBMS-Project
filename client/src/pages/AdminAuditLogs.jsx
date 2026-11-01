// src/pages/AdminAuditLogs.jsx - Full Institutional Database Audit Trail
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Database, Search, Shield, Filter, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardBody, Badge, LoadingPage, Button } from '../components/UI';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const { data } = await api.get('/admin/audit-logs?limit=100');
        if (data.success) {
          setLogs(data.data);
        }
      } catch (err) {
        console.error('Failed to load audit logs', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  if (loading) return <LoadingPage />;

  const filteredLogs = logs.filter(log => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (statusFilter && log.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchActor = (log.actor_email || '').toLowerCase().includes(q);
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const matchStudent = (log.student_id ? `stu#${log.student_id}` : '').includes(q);
      if (!matchActor && !matchAction && !matchStudent) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit & Compliance Trail</h1>
        <p className="text-sm text-slate-500">
          Immutable event log tracking registrations, drops, waitlist promotions, and schema maintenance.
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search by actor email, action, student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
          >
            <option value="">All Operation Actions</option>
            <option value="register">register</option>
            <option value="drop">drop</option>
            <option value="waitlist_join">waitlist_join</option>
            <option value="waitlist_promote">waitlist_promote</option>
            <option value="reconcile_counts">reconcile_counts</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
          >
            <option value="">All Statuses</option>
            <option value="success">success</option>
            <option value="failure">failure</option>
          </select>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        <CardHeader className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Showing {filteredLogs.length} Records
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Source: PostgreSQL registration_audit_logs
          </span>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-sans">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Student Ref</th>
                  <th className="px-4 py-3">Offering Ref</th>
                  <th className="px-4 py-3">Details (JSONB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 font-sans">
                      {log.actor_email || 'System / Trigger'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {log.student_id ? `STU#${log.student_id}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {log.offering_id ? `OFFERING#${log.offering_id}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-sm truncate text-[11px]">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

