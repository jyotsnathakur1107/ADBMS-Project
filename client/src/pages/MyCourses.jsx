// src/pages/MyCourses.jsx - Registered Courses, Dropping & History
import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  GraduationCap, Clock, AlertTriangle, Layers, History,
  Trash2, CheckCircle2, User, MapPin, Calendar
} from 'lucide-react';
import {
  Button, Badge, Card, CardHeader, CardBody, Modal,
  LoadingPage, EmptyState, Alert
} from '../components/UI';
import clsx from 'clsx';

export default function MyCourses() {
  const [activeTab, setActiveTab] = useState('registered'); // 'registered', 'waitlist', 'history'
  const [courses, setCourses] = useState([]);
  const [waitlists, setWaitlists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drop modal state
  const [dropCourse, setDropCourse] = useState(null);
  const [dropReason, setDropReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

  const fetchMyData = async () => {
    try {
      setLoading(true);
      const [coursesRes, waitRes] = await Promise.all([
        api.get('/enrollments/my-courses'),
        api.get('/enrollments/my-waitlists')
      ]);

      if (coursesRes.data.success) setCourses(coursesRes.data.data);
      if (waitRes.data.success) setWaitlists(waitRes.data.data);
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyData();
  }, []);

  const handleDropConfirm = async () => {
    if (!dropCourse) return;
    setActionLoading(true);
    setAlertInfo(null);

    try {
      const { data } = await api.post('/enrollments/drop', {
        offering_id: dropCourse.offering_id,
        reason: dropReason || 'Student self-drop via portal'
      });

      if (data.success) {
        setAlertInfo({
          type: 'success',
          title: 'Course Dropped Successfully',
          message: `${dropCourse.code} has been dropped. Your registration history is preserved and the seat has been opened for the next student.`,
        });
        setDropCourse(null);
        setDropReason('');
        fetchMyData();
      }
    } catch (err) {
      setAlertInfo({
        type: 'error',
        title: 'Drop Operation Failed',
        message: err.response?.data?.message || 'Could not drop course.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingPage />;

  const registeredCourses = courses.filter(c => c.enrollment_status === 'registered');
  const historyCourses = courses.filter(c => c.enrollment_status !== 'registered');
  const totalRegisteredCredits = registeredCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Academic Registrations</h1>
          <p className="text-sm text-slate-500">
            View enrolled classes, drop offerings during open windows, and monitor waitlist queues.
          </p>
        </div>

        {/* Registered Credit Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl text-indigo-900">
          <GraduationCap className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-semibold">
            Total Active Credits: <strong className="text-indigo-700 text-sm">{totalRegisteredCredits}</strong>
          </span>
        </div>
      </div>

      {/* Global Alert Notification */}
      {alertInfo && (
        <Alert
          type={alertInfo.type}
          title={alertInfo.title}
          message={alertInfo.message}
          onClose={() => setAlertInfo(null)}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('registered')}
          className={clsx(
            'pb-3 relative transition-colors',
            activeTab === 'registered' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Active Registrations ({registeredCourses.length})
          {activeTab === 'registered' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('waitlist')}
          className={clsx(
            'pb-3 relative transition-colors',
            activeTab === 'waitlist' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Waitlisted Sections ({waitlists.length})
          {activeTab === 'waitlist' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={clsx(
            'pb-3 relative transition-colors',
            activeTab === 'history' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Registration History ({historyCourses.length})
          {activeTab === 'history' && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Active Registered Courses */}
      {activeTab === 'registered' && (
        registeredCourses.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No Active Courses Enrolled"
            description="You are not currently registered for any courses in this semester."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registeredCourses.map((course) => (
              <Card key={course.enrollment_id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {course.code}
                        </span>
                        <span className="text-xs text-slate-500">Sec {course.section}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{course.name}</h3>
                      <p className="text-xs text-slate-500">{course.department}</p>
                    </div>
                    <Badge variant="success">Registered</Badge>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.instructor || 'Staff'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {course.schedule && course.schedule.length > 0
                          ? course.schedule.map(s => `${s.day_of_week.slice(0, 3)} ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`).join(', ')
                          : 'Schedule TBA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.room || 'Room TBA'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    {course.credits} Credits • Registered on {new Date(course.registered_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDropCourse(course)}
                    className="gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Drop Course
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Tab 2: Waitlist Entries */}
      {activeTab === 'waitlist' && (
        waitlists.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Waitlisted Courses"
            description="You are not waiting for seats in any oversubscribed courses."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waitlists.map((entry) => (
              <Card key={entry.id} className="p-5 border-amber-200/80 bg-amber-50/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      {entry.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{entry.name}</h3>
                    <p className="text-xs text-slate-500">{entry.term_name}</p>
                  </div>
                  <Badge variant="warning">
                    Waitlist Queue Position #{entry.position}
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>• Credits: {entry.credits} cr</p>
                  <p>• Joined Waitlist: {new Date(entry.joined_at).toLocaleString()}</p>
                  <p className="text-amber-800 font-medium mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                    ℹ Automatic Promotion: If an enrolled student drops this section, you will be automatically promoted to enrolled status via the PostgreSQL procedure.
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Tab 3: History (Soft-dropped & Past Courses) */}
      {activeTab === 'history' && (
        historyCourses.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Previous Course Activity"
            description="You have no dropped, completed, or withdrawn courses on record."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Term</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Drop / Action Date</th>
                    <th className="px-4 py-3">Reason / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {historyCourses.map((c) => (
                    <tr key={c.enrollment_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {c.code}: {c.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.term_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.enrollment_status === 'dropped' ? 'danger' : 'default'}>
                          {c.enrollment_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {c.dropped_at ? new Date(c.dropped_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 italic">
                        {c.drop_reason || 'Self drop'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {/* Drop Confirmation Modal */}
      {dropCourse && (
        <Modal
          open={!!dropCourse}
          onClose={() => setDropCourse(null)}
          title={`Drop Course: ${dropCourse.code}`}
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setDropCourse(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={actionLoading}
                onClick={handleDropConfirm}
              >
                Confirm Drop
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-sm text-slate-700">
              Are you sure you want to drop <strong className="text-slate-900">{dropCourse.code} ({dropCourse.name})</strong>?
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 space-y-1">
              <p className="font-semibold">Important Academic Policy:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Your record will be soft-dropped (status changed to 'dropped') to preserve institutional registration history.</li>
                <li>The seat will immediately be released and awarded to the next student waiting in the queue.</li>
              </ul>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Reason for Dropping (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Schedule adjustment, heavy workload..."
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

