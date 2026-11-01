// src/pages/TimetablePage.jsx - Visual Weekly Timetable Calendar
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Clock, MapPin, AlertTriangle, Printer } from 'lucide-react';
import { Card, CardHeader, CardBody, Badge, Button, LoadingPage, EmptyState } from '../components/UI';
import clsx from 'clsx';

export default function TimetablePage() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTimetable() {
      try {
        setLoading(true);
        const { data } = await api.get('/enrollments/timetable');
        if (data.success) {
          setSchedule(data.data);
        }
      } catch (err) {
        console.error('Failed to load timetable', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTimetable();
  }, []);

  if (loading) return <LoadingPage />;

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  // Helper to parse time string like "09:00:00" into float hours
  const parseHour = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  };

  // Check for conflicts within a single day
  const conflicts = {};
  weekDays.forEach(day => {
    const dayClasses = schedule.filter(s => s.day_of_week?.toLowerCase() === day);
    for (let i = 0; i < dayClasses.length; i++) {
      for (let j = i + 1; j < dayClasses.length; j++) {
        const c1 = dayClasses[i];
        const c2 = dayClasses[j];
        const s1 = parseHour(c1.start_time);
        const e1 = parseHour(c1.end_time);
        const s2 = parseHour(c2.start_time);
        const e2 = parseHour(c2.end_time);
        if (s1 < e2 && e1 > s2) {
          conflicts[`${c1.offering_id}-${c2.offering_id}`] = true;
        }
      }
    }
  });

  const hasAnyConflict = Object.keys(conflicts).length > 0;

  // Color generator based on course code
  const getCourseColor = (code) => {
    const palette = [
      'bg-indigo-50 border-indigo-200 text-indigo-900',
      'bg-emerald-50 border-emerald-200 text-emerald-900',
      'bg-amber-50 border-amber-200 text-amber-900',
      'bg-purple-50 border-purple-200 text-purple-900',
      'bg-sky-50 border-sky-200 text-sky-900',
      'bg-rose-50 border-rose-200 text-rose-900',
    ];
    let hash = 0;
    for (let i = 0; i < (code?.length || 0); i++) hash += code.charCodeAt(i);
    return palette[hash % palette.length];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Weekly Course Timetable</h1>
          <p className="text-sm text-slate-500">
            Interactive schedule visualization for registered courses with conflict detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            className="hidden sm:inline-flex"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Schedule
          </Button>
        </div>
      </div>

      {/* Conflict Warning Alert */}
      {hasAnyConflict && (
        <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <div>
            <h4 className="font-bold text-sm text-red-900">Schedule Conflict Detected!</h4>
            <p className="mt-0.5 text-red-700">
              One or more enrolled courses overlap in time slots. The system's PL/pgSQL validation prevents new conflicting registrations, but please review overlapping sections below.
            </p>
          </div>
        </div>
      )}

      {schedule.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Schedule Available"
          description="You have not registered for any active course offerings in the current semester."
        />
      ) : (
        /* Calendar Grid */
        <Card className="p-4 sm:p-6 overflow-x-auto shadow-sm">
          <div className="min-w-[750px]">
            {/* Days Header */}
            <div className="grid grid-cols-6 border-b border-slate-200 pb-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
              <div className="text-left text-slate-400">Time</div>
              {weekDays.map(day => (
                <div key={day} className="capitalize text-slate-800">{day}</div>
              ))}
            </div>

            {/* Time Slots Grid */}
            <div className="divide-y divide-slate-100">
              {timeSlots.map(time => {
                const hourNum = parseInt(time.split(':')[0]);

                return (
                  <div key={time} className="grid grid-cols-6 min-h-[75px] items-start py-2">
                    {/* Time Label */}
                    <div className="text-xs font-mono font-medium text-slate-400 pt-1">
                      {time}
                    </div>

                    {/* Day Columns */}
                    {weekDays.map(day => {
                      // Find courses meeting in this hour
                      const matchingCourses = schedule.filter(item => {
                        if (item.day_of_week?.toLowerCase() !== day) return false;
                        const start = parseHour(item.start_time);
                        const end = parseHour(item.end_time);
                        return hourNum >= Math.floor(start) && hourNum < Math.ceil(end);
                      });

                      return (
                        <div key={day} className="px-1.5 h-full flex flex-col gap-1.5">
                          {matchingCourses.map((c, idx) => {
                            const isFirstHour = Math.floor(parseHour(c.start_time)) === hourNum;
                            if (!isFirstHour) return null; // Avoid duplicating multi-hour cards

                            const colorClass = getCourseColor(c.code);

                            return (
                              <div
                                key={idx}
                                className={clsx(
                                  'p-2.5 rounded-lg border shadow-2xs transition-all text-xs',
                                  colorClass
                                )}
                              >
                                <div className="font-bold flex items-center justify-between">
                                  <span>{c.code}</span>
                                  <span className="text-[10px] opacity-75 font-mono">
                                    {c.start_time?.slice(0, 5)} - {c.end_time?.slice(0, 5)}
                                  </span>
                                </div>
                                <p className="font-medium truncate text-slate-800 mt-0.5">{c.name}</p>
                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5 text-[11px] opacity-80">
                                  <span>{c.instructor}</span>
                                  <span className="font-semibold">{c.room || 'TBA'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

