// src/pages/AdminCourses.jsx - Master Course Definition Management
import { useState, useEffect } from 'react';
import api from '../services/api';
import { BookOpen, Plus, Edit2, CheckCircle2, Layers } from 'lucide-react';
import { Button, Badge, Card, Modal, LoadingPage, Alert } from '../components/UI';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create course modal
  const [createModal, setCreateModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('1');
  const [credits, setCredits] = useState('3');
  const [courseLevel, setCourseLevel] = useState('200');
  const [category, setCategory] = useState('core');

  const [alertInfo, setAlertInfo] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const [cRes, dRes] = await Promise.all([
        api.get('/admin/courses'),
        api.get('/departments')
      ]);

      if (cRes.data.success) setCourses(cRes.data.data);
      if (dRes.data.success) setDepartments(dRes.data.data);
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setAlertInfo(null);

    try {
      const res = await api.post('/admin/courses', {
        code,
        name,
        description,
        department_id: parseInt(departmentId),
        credits: parseInt(credits),
        course_level: parseInt(courseLevel),
        category,
      });

      if (res.data.success) {
        setAlertInfo({
          type: 'success',
          title: 'Course Created',
          message: `Course ${code} added to catalog.`
        });
        setCreateModal(false);
        setCode('');
        setName('');
        setDescription('');
        fetchCourses();
      }
    } catch (err) {
      setAlertInfo({
        type: 'error',
        title: 'Error Creating Course',
        message: err.response?.data?.message || 'Failed to save course.'
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Course Catalog</h1>
          <p className="text-sm text-slate-500">
            Define institutional courses, academic credits, department ownership, and course categories.
          </p>
        </div>

        <Button variant="primary" onClick={() => setCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Course Definition
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

      {/* Courses Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Course Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-700">{c.code}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.department || c.department_name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{c.credits} cr</td>
                  <td className="px-4 py-3 text-slate-600">{c.course_level} Level</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.category === 'core' ? 'primary' : 'default'} size="sm">
                      {c.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-sm truncate">
                    {c.description || 'N/A'}
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
          title="Add New Course Definition"
          size="md"
        >
          <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS450"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Course Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Advanced Distributed Systems"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Credits</label>
                <select
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="1">1 Credit</option>
                  <option value="2">2 Credits</option>
                  <option value="3">3 Credits</option>
                  <option value="4">4 Credits</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Course Level</label>
                <select
                  value={courseLevel}
                  onChange={(e) => setCourseLevel(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="100">100 (Introductory)</option>
                  <option value="200">200 (Intermediate)</option>
                  <option value="300">300 (Advanced)</option>
                  <option value="400">400 (Senior Capstone)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="core">Core</option>
                  <option value="elective">Elective</option>
                  <option value="lab">Lab</option>
                  <option value="seminar">Seminar</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Course Description</label>
              <textarea
                rows={3}
                placeholder="Overview of syllabus, learning outcomes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Save Course</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

