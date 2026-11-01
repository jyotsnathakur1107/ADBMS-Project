// src/pages/AdminOfferings.jsx - Course Offering & Capacity Management
import { useState, useEffect } from 'react';
import api from '../services/api';
import { BookOpen, Plus, Edit2, Trash2, Users, Search, CheckCircle2 } from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardBody, Modal, Input, LoadingPage, Alert } from '../components/UI';

export default function AdminOfferings() {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [faculty, setFaculty] = useState([]);

  // Create Modal
  const [createModal, setCreateModal] = useState(false);
  const [newCourseId, setNewCourseId] = useState('');
  const [newTermId, setNewTermId] = useState('');
  const [newFacultyId, setNewFacultyId] = useState('');
  const [newSection, setNewSection] = useState('A');
  const [newRoom, setNewRoom] = useState('');
  const [newCapacity, setNewCapacity] = useState('30');

  // Edit Modal
  const [editOffering, setEditOffering] = useState(null);
  const [editCapacity, setEditCapacity] = useState('');
  const [editStatus, setEditStatus] = useState('open');
  const [editRoom, setEditRoom] = useState('');
  const [editFacultyId, setEditFacultyId] = useState('');

  const [alertInfo, setAlertInfo] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOfferings = async () => {
    try {
      setLoading(true);
      const [ofRes, coRes, termRes, facRes] = await Promise.all([
        api.get('/admin/offerings?limit=50'),
        api.get('/admin/courses'),
        api.get('/terms'),
        api.get('/admin/faculty')
      ]);

      if (ofRes.data.success) setOfferings(ofRes.data.data);
      if (coRes.data.success) setCourses(coRes.data.data);
      if (facRes.data.success) setFaculty(facRes.data.data);
      if (termRes.data.success) {
        setTerms(termRes.data.data);
        const current = termRes.data.data.find(t => t.is_current);
        if (current) setNewTermId(current.id.toString());
      }
    } catch (err) {
      console.error('Failed to load offerings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferings();
  }, []);

  const handleCreateOffering = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setAlertInfo(null);

    try {
      const res = await api.post('/admin/offerings', {
        course_id: parseInt(newCourseId),
        term_id: parseInt(newTermId),
        faculty_id: newFacultyId ? parseInt(newFacultyId) : null,
        section: newSection,
        room: newRoom || null,
        capacity: parseInt(newCapacity),
      });

      if (res.data.success) {
        setAlertInfo({
          type: 'success',
          title: 'Section Created',
          message: 'Course offering section created successfully.'
        });
        setCreateModal(false);
        fetchOfferings();
      }
    } catch (err) {
      setAlertInfo({
        type: 'error',
        title: 'Creation Failed',
        message: err.response?.data?.message || 'Could not create offering.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateOffering = async (e) => {
    e.preventDefault();
    if (!editOffering) return;
    setActionLoading(true);
    setAlertInfo(null);

    try {
      const res = await api.put(`/admin/offerings/${editOffering.id}`, {
        capacity: parseInt(editCapacity),
        status: editStatus,
        room: editRoom,
        faculty_id: editFacultyId ? parseInt(editFacultyId) : null,
      });

      if (res.data.success) {
        setAlertInfo({
          type: 'success',
          title: 'Section Updated',
          message: `Offering #${editOffering.id} updated. Database constraints verified.`
        });
        setEditOffering(null);
        fetchOfferings();
      }
    } catch (err) {
      setAlertInfo({
        type: 'error',
        title: 'Update Rejected',
        message: err.response?.data?.message || 'Could not update offering.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingPage />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Offerings & Section Capacity</h1>
          <p className="text-sm text-slate-500">
            Create semester sections, assign instructors, update classroom venues, and configure seat limits.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            if (courses.length > 0 && !newCourseId) setNewCourseId(courses[0].id.toString());
            setCreateModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Offering
        </Button>
      </div>

      {alertInfo && (
        <Alert
          type={alertInfo.type}
          title={alertInfo.title}
          message={alertInfo.message}
          onClose={() => setAlertInfo(null)}
        />
      )}

      {/* Offerings Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">Offering ID</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Sec</th>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Enrolled / Capacity</th>
                <th className="px-4 py-3">Waitlist</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offerings.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-slate-500">#{o.id}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-slate-900">{o.code}</span>
                    <span className="text-slate-500 block truncate max-w-xs">{o.course_name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.term_name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{o.section}</td>
                  <td className="px-4 py-3 text-slate-600">{o.instructor || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.room || 'TBA'}</td>
                  <td className="px-4 py-3">
                    <span className={o.enrolled_count >= o.capacity ? 'text-red-600 font-bold' : 'text-slate-800 font-semibold'}>
                      {o.enrolled_count} / {o.capacity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-amber-700 font-medium">{o.waitlist_count}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={o.status === 'open' ? 'success' : o.status === 'closed' ? 'warning' : 'danger'}>
                      {o.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditOffering(o);
                        setEditCapacity(o.capacity.toString());
                        setEditStatus(o.status);
                        setEditRoom(o.room || '');
                        setEditFacultyId(o.faculty_id ? o.faculty_id.toString() : '');
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Modal */}
      {createModal && (
        <Modal
          open={createModal}
          onClose={() => setCreateModal(false)}
          title="Create Course Offering Section"
          size="md"
        >
          <form onSubmit={handleCreateOffering} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Select Course Definition</label>
              <select
                required
                value={newCourseId}
                onChange={(e) => setNewCourseId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name} ({c.credits} cr)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Semester Term</label>
                <select
                  required
                  value={newTermId}
                  onChange={(e) => setNewTermId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name} {t.is_current ? '(Current)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Section Identifier</label>
                <input
                  type="text"
                  required
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Max Seat Capacity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Classroom Room</label>
                <input
                  type="text"
                  placeholder="e.g. Hall B-201"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Assign Instructor (Optional)</label>
              <select
                value={newFacultyId}
                onChange={(e) => setNewFacultyId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                <option value="">-- No Instructor Assigned --</option>
                {faculty.map(f => (
                  <option key={f.id} value={f.id}>{f.first_name} {f.last_name} ({f.department_name})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Create Section</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editOffering && (
        <Modal
          open={!!editOffering}
          onClose={() => setEditOffering(null)}
          title={`Edit Section: ${editOffering.code} (Section ${editOffering.section})`}
          size="md"
        >
          <form onSubmit={handleUpdateOffering} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Seat Capacity</label>
                <input
                  type="number"
                  min={editOffering.enrolled_count}
                  required
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be &gt;= current enrolled ({editOffering.enrolled_count})
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="open">Open (Accepting Registrations)</option>
                  <option value="closed">Closed (No New Enrolls)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Classroom Location</label>
              <input
                type="text"
                value={editRoom}
                onChange={(e) => setEditRoom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Assign Instructor</label>
              <select
                value={editFacultyId}
                onChange={(e) => setEditFacultyId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                <option value="">-- No Instructor Assigned --</option>
                {faculty.map(f => (
                  <option key={f.id} value={f.id}>{f.first_name} {f.last_name} ({f.department_name})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setEditOffering(null)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

