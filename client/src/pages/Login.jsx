// src/pages/Login.jsx - Secure Authentication & Demo Login
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { GraduationCap, Lock, Mail, Shield, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Input, Card, CardBody } from '../components/UI';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [departmentId, setDepartmentId] = useState('1');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        department_id: parseInt(departmentId)
      });

      if (data.success) {
        setSuccessMsg('Registration successful! Logging you in...');
        setTimeout(async () => {
          await login(email, password);
          navigate('/');
        }, 1000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Demo Login Quick-Fill
  const fillDemo = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Demo@1234');
    setIsRegister(false);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 mb-4">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Academic Portal
        </h2>
        <p className="mt-1 text-sm text-indigo-200">
          Advanced DBMS Course Registration & Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <Card className="bg-white/95 backdrop-blur-md shadow-2xl border-slate-100/20">
          <CardBody className="p-8">
            {/* Quick Demo Selector */}
            <div className="mb-6 pb-6 border-b border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                Quick Demo Accounts (Password: Demo@1234)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('s001@student.edu', 'Student')}
                  className="px-2.5 py-2 text-xs font-medium rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex flex-col items-center gap-1"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Student Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('alice.morgan@university.edu', 'Faculty')}
                  className="px-2.5 py-2 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors flex flex-col items-center gap-1"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Faculty Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('admin@university.edu', 'Admin')}
                  className="px-2.5 py-2 text-xs font-medium rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex flex-col items-center gap-1"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Demo</span>
                </button>
              </div>
            </div>

            {/* Error / Success Notifications */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={isRegister ? handleRegisterSubmit : handleLoginSubmit} className="space-y-4">
              {isRegister && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. John"
                  />
                  <Input
                    label="Last Name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Doe"
                  />
                </div>
              )}

              <Input
                label="University Email"
                type="email"
                required
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
              />

              <Input
                label="Password"
                type="password"
                required
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Academic Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1">Computer Science (CS)</option>
                    <option value="2">Mathematics (MATH)</option>
                    <option value="3">Physics (PHY)</option>
                    <option value="4">Electrical Engineering (EE)</option>
                    <option value="5">Biology (BIO)</option>
                    <option value="6">Chemistry (CHEM)</option>
                    <option value="7">Business Administration (MBA)</option>
                    <option value="8">English Literature (ENG)</option>
                  </select>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2"
              >
                {isRegister ? 'Create Student Account' : 'Sign In to Portal'}
              </Button>
            </form>

            {/* Switch between Login and Register */}
            <div className="mt-6 text-center text-xs text-slate-500">
              {isRegister ? (
                <span>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setErrorMsg(''); }}
                    className="font-semibold text-indigo-600 hover:text-indigo-500 underline"
                  >
                    Sign in here
                  </button>
                </span>
              ) : (
                <span>
                  New student?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(true); setErrorMsg(''); }}
                    className="font-semibold text-indigo-600 hover:text-indigo-500 underline"
                  >
                    Create a student account
                  </button>
                </span>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-400">
          PostgreSQL Row-Locking & ACID Transaction Enabled System
        </p>
      </div>
    </div>
  );
}

