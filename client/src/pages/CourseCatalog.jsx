// src/pages/CourseCatalog.jsx - Intelligent Course Discovery & Registration
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Search, Filter, BookOpen, Clock, MapPin, User,
  CheckCircle2, AlertTriangle, AlertCircle, Info, ChevronRight,
  Layers, Check, Sparkles, X, Grid, List
} from 'lucide-react';
import {
  Button, Badge, Card, CardBody, Input, Select,
  Modal, LoadingPage, EmptyState, Alert
} from '../components/UI';
import clsx from 'clsx';

export default function CourseCatalog() {
  const { user } = useAuth();

  // Filters & State
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [termId, setTermId] = useState('');
  const [credits, setCredits] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals & Action States
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [registerConfirmCourse, setRegisterConfirmCourse] = useState(null);
  const [waitlistConfirmCourse, setWaitlistConfirmCourse] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Load initial reference data (departments & terms)
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [deptRes, termRes] = await Promise.all([
          api.get('/departments'),
          api.get('/terms')
        ]);
        if (deptRes.data.success) setDepartments(deptRes.data.data);
        if (termRes.data.success) {
          setTerms(termRes.data.data);
          const current = termRes.data.data.find(t => t.is_current);
          if (current) setTermId(current.id.toString());
        }
      } catch (err) {
        console.error('Metadata load failure', err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch courses with current filters
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        department_id: departmentId || undefined,
        term_id: termId || undefined,
        credits: credits || undefined,
        category: category || undefined,
        availability: availability || undefined,
      };

      const { data } = await api.get('/courses', { params });
      if (data.success) {
        setCourses(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch courses', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, departmentId, termId, credits, category, availability]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Handle Course Registration
  const handleRegister = async () => {
    if (!registerConfirmCourse) return;
    setActionLoading(true);
    setAlertInfo(null);

    try {
      const { data } = await api.post('/enrollments/register', {
        offering_id: registerConfirmCourse.offering_id,
      });

      if (data.success) {
        setAlertInfo({
          type: 'success',
          title: 'Registration Successful!',
          message: `You have successfully enrolled in ${registerConfirmCourse.code} (${registerConfirmCourse.name}).`,
        });
        setRegisterConfirmCourse(null);
        fetchCourses(); // Refresh counts and status
      }
    } catch (err) {
      setAlertInfo({
        type: 'error',
        title: 'Registration Rejected by Database',
        message: err.response?.data?.message || 'Failed to complete registration.',
      });
      setRegisterConfirmCourse(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Joining Waitlist
  const handleWaitlist = async () => {
    if (!waitlistConfirmCourse) return;
    setActionLoading(true);
    setAlertInfo(null);

    try {
      const { data } = await api.post('/enrollments/waitlist', {
        offering_id: waitlistConfirmCourse.offering_id,
      });

      if (data.success) {
        setAlertInfo({
          type: 'success',
          title: 'Waitlist Joined!',
          message: `Added to waitlist for ${waitlistConfirmCourse.code}. ${data.message}`,
        });
        setWaitlistConfirmCourse(null);
        fetchCourses();
      }
    } catch (err) {
      setAlertInfo({
        type: 'error',
        title: 'Waitlist Submission Error',
        message: err.response?.data?.message || 'Failed to join waitlist.',
      });
      setWaitlistConfirmCourse(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Course Catalog</h1>
          <p className="text-sm text-slate-500">
            Browse, inspect prerequisites, check live seating, and register with database ACID protection.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('grid')}
            className={clsx(
              'p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
              viewMode === 'grid' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Grid className="w-4 h-4" /> Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={clsx(
              'p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
              viewMode === 'table' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <List className="w-4 h-4" /> Table
          </button>
        </div>
      </div>

      {/* Global Alert Notification */}
      {alertInfo && (
        <Alert
          type={alertInfo.type}
          title={alertInfo.title}
          message={alertInfo.message}
          onClose={() => setAlertInfo(null)}
          className="shadow-sm"
        />
      )}

      {/* Search & Multi-Filter Bar */}
      <Card className="p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <Input
              icon={Search}
              placeholder="Search code, course name, instructor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentId}
              onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>

          {/* Credits Filter */}
          <div>
            <select
              value={credits}
              onChange={(e) => { setCredits(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Any Credits</option>
              <option value="1">1 Credit</option>
              <option value="2">2 Credits</option>
              <option value="3">3 Credits</option>
              <option value="4">4 Credits</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              <option value="core">Core Required</option>
              <option value="elective">Elective</option>
              <option value="lab">Lab Practical</option>
              <option value="seminar">Seminar</option>
              <option value="project">Project / Thesis</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <select
              value={availability}
              onChange={(e) => { setAvailability(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Seat States</option>
              <option value="available">Seats Available</option>
              <option value="full">Full / Waitlist Only</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(debouncedSearch || departmentId || credits || category || availability) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing results for active filters ({totalItems} courses found)</span>
            <button
              onClick={() => {
                setSearch('');
                setDepartmentId('');
                setCredits('');
                setCategory('');
                setAvailability('');
                setPage(1);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </Card>

      {/* Course List / Cards View */}
      {loading ? (
        <LoadingPage />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description="Try broadening your search term or clearing one of the selected filters."
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const isEnrolled = course.student_enrollment_status === 'registered';
            const isWaitlisted = course.student_waitlist?.status === 'waiting';
            const isFull = course.available_seats <= 0;

            return (
              <Card
                key={course.offering_id}
                className="flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all group"
              >
                <div className="p-5 space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {course.code} • Sec {course.section}
                    </span>
                    <Badge
                      variant={
                        course.status === 'cancelled'
                          ? 'danger'
                          : isFull
                          ? 'danger'
                          : course.available_seats <= 5
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {course.status === 'cancelled'
                        ? 'Cancelled'
                        : isFull
                        ? 'Full'
                        : `${course.available_seats} seats left`}
                    </Badge>
                  </div>

                  {/* Course Title & Department */}
                  <div>
                    <h3
                      onClick={() => setSelectedCourse(course)}
                      className="text-base font-bold text-slate-900 group-hover:text-indigo-600 cursor-pointer transition-colors leading-snug"
                    >
                      {course.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{course.department} Department</p>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {course.description || 'Comprehensive curriculum covering foundational principles and real-world database design patterns.'}
                  </p>

                  {/* Instructor & Room */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{course.instructor || 'TBA'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {course.schedule && course.schedule.length > 0
                          ? course.schedule.map(s => `${s.day_of_week.slice(0, 3)} ${s.start_time.slice(0, 5)}`).join(', ')
                          : 'Schedule TBA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{course.room || 'Room TBA'}</span>
                    </div>
                  </div>

                  {/* Prerequisites indicator */}
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Prerequisites:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {course.prerequisites.map((p, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            {p.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    {course.credits} Credits
                  </span>

                  {user?.role === 'student' ? (
                    isEnrolled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> Enrolled
                      </span>
                    ) : isWaitlisted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        <Layers className="w-3.5 h-3.5" /> Waitlist #{course.student_waitlist.position}
                      </span>
                    ) : isFull ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setWaitlistConfirmCourse(course)}
                        className="text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        Join Waitlist
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setRegisterConfirmCourse(course)}
                      >
                        Register
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCourse(course)}
                    >
                      View Details
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Instructor</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((course) => {
                  const isEnrolled = course.student_enrollment_status === 'registered';
                  const isWaitlisted = course.student_waitlist?.status === 'waiting';
                  const isFull = course.available_seats <= 0;

                  return (
                    <tr key={course.offering_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-800">{course.code} (Sec {course.section})</span>
                        <div
                          onClick={() => setSelectedCourse(course)}
                          className="font-medium text-slate-900 hover:text-indigo-600 cursor-pointer text-xs"
                        >
                          {course.name}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{course.department}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">{course.credits} cr</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{course.instructor || 'Staff'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {course.schedule && course.schedule.length > 0
                          ? course.schedule.map(s => `${s.day_of_week.slice(0, 3)} ${s.start_time.slice(0, 5)}`).join(', ')
                          : 'TBA'}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className={isFull ? 'text-red-600 font-bold' : 'text-slate-700'}>
                          {course.enrolled_count} / {course.capacity}
                        </span>
                        <span className="text-[10px] text-slate-400 block">({course.available_seats} open)</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {user?.role === 'student' ? (
                          isEnrolled ? (
                            <Badge variant="success">Enrolled</Badge>
                          ) : isWaitlisted ? (
                            <Badge variant="warning">Waitlist #{course.student_waitlist.position}</Badge>
                          ) : isFull ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setWaitlistConfirmCourse(course)}
                            >
                              Waitlist
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setRegisterConfirmCourse(course)}
                            >
                              Register
                            </Button>
                          )
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setSelectedCourse(course)}>
                            Details
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500">
          <span>Page {page} of {totalPages} ({totalItems} offerings)</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <Modal
          open={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
          title={`${selectedCourse.code}: ${selectedCourse.name}`}
          size="lg"
          footer={
            <Button variant="secondary" onClick={() => setSelectedCourse(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="primary">{selectedCourse.department}</Badge>
              <Badge variant="default">{selectedCourse.credits} Credits</Badge>
              <Badge variant="info">Section {selectedCourse.section}</Badge>
              <Badge variant={selectedCourse.available_seats > 0 ? 'success' : 'danger'}>
                {selectedCourse.available_seats} / {selectedCourse.capacity} Seats Available
              </Badge>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">Course Description</h4>
              <p className="text-slate-600 leading-relaxed text-sm">
                {selectedCourse.description || 'This course explores foundational database principles, concurrency theory, query optimization, and transaction safety.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="font-semibold text-slate-700 block">Instructor</span>
                <span className="text-slate-600">{selectedCourse.instructor || 'Staff'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 block">Classroom Location</span>
                <span className="text-slate-600">{selectedCourse.room || 'TBA'}</span>
              </div>
            </div>

            {/* Prerequisites */}
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">Prerequisites</h4>
              {selectedCourse.prerequisites && selectedCourse.prerequisites.length > 0 ? (
                <ul className="list-disc pl-5 text-slate-600 space-y-0.5">
                  {selectedCourse.prerequisites.map((p, idx) => (
                    <li key={idx}>
                      <span className="font-semibold text-slate-800">{p.code}</span> - {p.name}
                      {p.mandatory && <span className="text-red-600 font-semibold ml-1">(Mandatory)</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">None required.</p>
              )}
            </div>

            {/* Schedule */}
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">Class Meeting Times</h4>
              {selectedCourse.schedule && selectedCourse.schedule.length > 0 ? (
                <div className="space-y-1">
                  {selectedCourse.schedule.map((s, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="capitalize font-medium text-slate-800">{s.day_of_week}</span>
                      <span className="font-mono text-slate-600">{s.start_time} - {s.end_time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">Schedule to be announced.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Registration Confirmation Modal */}
      {registerConfirmCourse && (
        <Modal
          open={!!registerConfirmCourse}
          onClose={() => setRegisterConfirmCourse(null)}
          title="Confirm Course Registration"
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setRegisterConfirmCourse(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={actionLoading}
                onClick={handleRegister}
              >
                Confirm & Enroll
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs leading-relaxed">
            <p className="text-sm text-slate-700">
              Are you sure you want to register for <strong className="text-slate-900">{registerConfirmCourse.code}: {registerConfirmCourse.name}</strong>?
            </p>

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Course Credits:</span>
                <span className="font-semibold text-indigo-950">{registerConfirmCourse.credits} Credits</span>
              </div>
              <div className="flex justify-between">
                <span>Instructor:</span>
                <span className="font-semibold text-indigo-950">{registerConfirmCourse.instructor || 'Staff'}</span>
              </div>
              <div className="flex justify-between">
                <span>Section:</span>
                <span className="font-semibold text-indigo-950">{registerConfirmCourse.section}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              * The backend will verify in an isolated PostgreSQL transaction that you satisfy prerequisites, have not reached credit limits, and have no schedule overlaps.
            </p>
          </div>
        </Modal>
      )}

      {/* Waitlist Confirmation Modal */}
      {waitlistConfirmCourse && (
        <Modal
          open={!!waitlistConfirmCourse}
          onClose={() => setWaitlistConfirmCourse(null)}
          title="Join Course Waitlist"
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setWaitlistConfirmCourse(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="warning"
                loading={actionLoading}
                onClick={handleWaitlist}
              >
                Join Waitlist Queue
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-sm text-slate-700">
              This offering of <strong className="text-slate-900">{waitlistConfirmCourse.code}</strong> is currently at full capacity ({waitlistConfirmCourse.capacity}/{waitlistConfirmCourse.capacity}).
            </p>
            <p className="text-slate-600">
              You will be placed on the waitlist in first-come, first-served order. If another student drops the course, the transactional procedure will automatically promote the next eligible waitlisted student.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

