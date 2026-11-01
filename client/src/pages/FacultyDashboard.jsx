// src/pages/FacultyDashboard.jsx - Faculty Portal & Class Rosters
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Users, BookOpen, Clock, Calendar, CheckCircle,
  Download, Search, Layers, UserCheck
} from 'lucide-react';
import {
  Button, Badge, Card, CardHeader, CardBody,
  LoadingPage, EmptyState, Modal, StatCard, Input
} from '../components/UI';
import clsx from 'clsx';

export default function FacultyDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Class Roster Modal
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  useEffect(() => {
    async function fetchAssignedCourses() {
      try {
        setLoading(true);
        const { data } = await api.get('/faculty/my-courses');
        if (data.success) {
          setCourses(data.data);
        }
      } catch (err) {
        console.error('Failed to load faculty courses', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAssignedCourses();
  }, []);

  const openRoster = async (offering) => {
    setSelectedOffering(offering);
    setRosterSearch('');
    setRosterLoading(true);

    try {
      const { data } = await api.get(`/faculty/courses/${offering.offering_id}/students`);
      if (data.success) {
        setRoster(data.data);
      }
    } catch (err) {
      console.error('Failed to load roster', err);
    } finally {
      setRosterLoading(false);
    }
  };

  if (loading) return <LoadingPage />;

  const totalStudents = courses.reduce((sum, c) => sum + (c.enrolled_count || 0), 0);
  const totalCapacity = courses.reduce((sum, c) => sum + (c.capacity || 0), 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  const filteredRoster = roster.filter(s =>
    (s.student_name || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (s.student_code || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(rosterSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Faculty Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {profile?.designation || 'Faculty Member'}
            </span>
            <span className="text-xs text-slate-500">{profile?.department_name || 'Department of Computer Science'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Professor {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="text-sm text-slate-500">
            Assigned course sections, real-time enrollment counts, and student class rosters.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={BookOpen}
          label="Assigned Course Sections"
          value={courses.length}
          sub="Current Semester"
          color="indigo"
        />
        <StatCard
          icon={Users}
          label="Total Students Taught"
          value={totalStudents}
          sub={`Across ${courses.length} sections`}
          color="emerald"
        />
        <StatCard
          icon={UserCheck}
          label="Overall Section Fill Rate"
          value={`${fillRate}%`}
          sub={`${totalStudents} / ${totalCapacity} Total Seats Filled`}
          color="amber"
        />
      </div>

      {/* Course Sections List */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-lg">My Teaching Sections</h3>

        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Teaching Assignments Found"
            description="You are not currently assigned as the instructor for any active offerings in this term."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {courses.map((course) => {
              const percent = Math.min(100, Math.round((course.enrolled_count / course.capacity) * 100));

              return (
                <Card key={course.offering_id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {course.code}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">Section {course.section}</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-1">{course.name}</h4>
                        <p className="text-xs text-slate-500">{course.term_name}</p>
                      </div>
                      <Badge variant={course.enrolled_count >= course.capacity ? 'danger' : 'success'}>
                        {course.enrolled_count} / {course.capacity} Enrolled
                      </Badge>
                    </div>

                    {/* Capacity Bar */}
                    <div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                        <span>{course.available_seats} seats remaining</span>
                        <span>{course.waitlist_count} waitlisted</span>
                      </div>
                    </div>

                    {/* Schedule & Room */}
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {course.schedule && course.schedule.length > 0
                            ? course.schedule.map(s => `${s.day_of_week.slice(0, 3)} ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`).join(', ')
                            : 'Schedule TBA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Classroom: {course.room || 'TBA'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{course.credits} Credits</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openRoster(course)}
                    >
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      View Class Roster ({course.enrolled_count})
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Class Roster Modal */}
      {selectedOffering && (
        <Modal
          open={!!selectedOffering}
          onClose={() => setSelectedOffering(null)}
          title={`Class Roster: ${selectedOffering.code} (Section ${selectedOffering.section})`}
          size="lg"
          footer={
            <Button variant="secondary" onClick={() => setSelectedOffering(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total Enrolled: <strong className="text-slate-800">{roster.length} students</strong>
              </span>
              <div className="w-64">
                <Input
                  icon={Search}
                  placeholder="Filter by name or ID..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                />
              </div>
            </div>

            {rosterLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading student roster...</div>
            ) : filteredRoster.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No students enrolled in this section yet.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Student ID</th>
                      <th className="px-4 py-2.5">Student Name</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Major / Year</th>
                      <th className="px-4 py-2.5 text-right">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoster.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">{s.student_code}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900">{s.student_name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{s.email}</td>
                        <td className="px-4 py-2.5 text-slate-600">{s.department} • Yr {s.current_year}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">
                          {new Date(s.registered_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

