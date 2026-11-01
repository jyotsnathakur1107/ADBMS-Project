// src/pages/StudentDashboard.jsx - Personalized Student Portal
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  BookOpen, Calendar, Clock, CheckCircle2, AlertCircle,
  ArrowRight, Award, Compass, Layers, ShieldCheck
} from 'lucide-react';
import { Card, CardHeader, CardBody, Badge, Button, LoadingPage, StatCard } from '../components/UI';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [creditSummary, setCreditSummary] = useState(null);
  const [waitlists, setWaitlists] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const [enrRes, timeRes, credRes, waitRes] = await Promise.all([
          api.get('/enrollments/my-courses?status=registered'),
          api.get('/enrollments/timetable'),
          api.get('/enrollments/credit-summary'),
          api.get('/enrollments/my-waitlists')
        ]);

        if (enrRes.data.success) setCourses(enrRes.data.data);
        if (timeRes.data.success) setTimetable(timeRes.data.data);
        if (credRes.data.success) setCreditSummary(credRes.data.data);
        if (waitRes.data.success) setWaitlists(waitRes.data.data.filter(w => w.status === 'waiting'));
      } catch (err) {
        console.error('Failed to load student dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingPage />;

  const registeredCredits = creditSummary?.registered_credits ?? courses.reduce((acc, c) => acc + (c.credits || 0), 0);
  const maxCredits = profile?.max_credits || 18;
  const remainingCredits = Math.max(0, maxCredits - registeredCredits);
  const creditPercentage = Math.min(100, Math.round((registeredCredits / maxCredits) * 100));

  // Filter today's timetable
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = days[new Date().getDay()];
  const todaysClasses = timetable.filter(t => t.day_of_week?.toLowerCase() === todayName);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 sm:flex sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                Year {profile?.current_year || 1} • {profile?.department_name || 'Undergraduate'}
              </Badge>
              <span className="text-xs text-indigo-200 font-mono">
                ID: {profile?.student_id || 'STU2024001'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {profile?.first_name || 'Student'}!
            </h1>
            <p className="text-sm text-indigo-200 max-w-xl">
              Course registration for Fall 2026 is active. Ensure your schedule meets prerequisite requirements and credit caps.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <Link to="/catalog">
              <Button variant="primary" size="md" className="bg-white text-indigo-900 hover:bg-indigo-50 shadow-md">
                <Compass className="w-4 h-4 mr-1.5" />
                Browse Catalog
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Credit Allowance & Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Credit Limit Meter */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Registered Credits
              </span>
              <span className="text-xs font-bold text-indigo-600">
                {registeredCredits} / {maxCredits} cr
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  creditPercentage >= 100
                    ? 'bg-amber-500'
                    : creditPercentage >= 75
                    ? 'bg-indigo-600'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${creditPercentage}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {remainingCredits} credits remaining this term
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Max Term Allowance</span>
            <span className="font-semibold text-slate-800">{maxCredits} Credits</span>
          </div>
        </Card>

        {/* Courses Enrolled */}
        <StatCard
          icon={BookOpen}
          label="Registered Courses"
          value={courses.length}
          sub="Active for current semester"
          color="indigo"
        />

        {/* Waitlisted */}
        <StatCard
          icon={Layers}
          label="Waitlisted Courses"
          value={waitlists.length}
          sub={waitlists.length ? 'Queued for auto-promotion' : 'None in waitlist'}
          color="amber"
        />

        {/* GPA */}
        <StatCard
          icon={Award}
          label="Cumulative GPA"
          value={profile?.gpa ? parseFloat(profile.gpa).toFixed(2) : '3.80'}
          sub="Academic Standing: Good"
          color="emerald"
        />
      </div>

      {/* Main Grid: Registered Courses & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrolled Courses Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Current Registered Courses</h3>
                <p className="text-xs text-slate-500">Active enrollments for Fall 2026</p>
              </div>
              <Link to="/my-courses" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View All Details <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {courses.length === 0 ? (
                <div className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No courses registered yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Search available course offerings in the catalog and register before the deadline.
                  </p>
                  <Link to="/catalog" className="inline-block mt-4">
                    <Button variant="primary" size="sm">Explore Catalog</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Course</th>
                        <th className="px-5 py-3">Credits</th>
                        <th className="px-5 py-3">Instructor</th>
                        <th className="px-5 py-3">Schedule</th>
                        <th className="px-5 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {courses.map((course) => (
                        <tr key={course.enrollment_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">{course.code}</div>
                            <div className="text-xs text-slate-500 truncate max-w-xs">{course.name}</div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-medium">
                            {course.credits} cr
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {course.instructor || 'Staff'}
                          </td>
                          <td className="px-5 py-3.5">
                            {course.schedule && course.schedule.length > 0 ? (
                              <div className="space-y-0.5">
                                {course.schedule.map((s, idx) => (
                                  <div key={idx} className="text-xs text-slate-600 flex items-center gap-1.5">
                                    <span className="capitalize font-medium">{s.day_of_week.slice(0, 3)}:</span>
                                    <span>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">TBA</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Badge variant="success">Enrolled</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Quick Registration Rules Reminder */}
          <Card className="bg-slate-900 text-slate-300 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-semibold text-white text-sm">PostgreSQL ACID Registration Protection</h4>
                <p className="text-slate-400 leading-relaxed">
                  Every registration is guarded at the database level by pessimistic locks (`SELECT ... FOR UPDATE`), prerequisite graph traversal, credit checks, and overlap interval math. Concurrency race conditions for the final seat are prevented automatically.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar: Today's Schedule & Quick Links */}
        <div className="space-y-6">
          {/* Today's Schedule Card */}
          <Card>
            <CardHeader className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Today's Classes</h3>
              </div>
              <span className="text-xs text-slate-400 capitalize">{todayName}</span>
            </CardHeader>
            <CardBody className="pt-0">
              {todaysClasses.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No classes scheduled for today.
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  {todaysClasses.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {item.course_code}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 mt-1">{item.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Room: {item.room || 'Online'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-medium text-slate-700 block">
                          {item.start_time?.slice(0, 5)}
                        </span>
                        <span className="text-[10px] text-slate-400">to {item.end_time?.slice(0, 5)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/timetable" className="mt-4 block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View Full Weekly Timetable →
              </Link>
            </CardBody>
          </Card>

          {/* Registration Deadline Alert */}
          <Card className="border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-bold text-amber-900">Add/Drop Deadline</h4>
                <p className="text-amber-800 mt-1 leading-relaxed">
                  Students may add or drop courses without penalty until Friday 11:59 PM. Dropped courses release seats for the next waitlisted student.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

