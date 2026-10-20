import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User as UserIcon, Award, Shield, School, KeyRound, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, login, register } = useAuth();
  const [isRegister, setIsRegister] = useState<boolean>(false);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('ICCT Colleges');
  const [department, setDepartment] = useState<string>('College of Computer Studies / LFCA411M179');
  const [supervisorCode, setSupervisorCode] = useState<string>('');
  const [role, setRole] = useState<string>('Trainee');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(
          email, 
          password, 
          fullName, 
          studentId, 
          role, 
          schoolName, 
          department, 
          supervisorCode
        );
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = (demoType: 'teacher' | 'student') => {
    setIsRegister(false);
    setError(null);
    if (demoType === 'teacher') {
      setEmail('teacher@ojthub.com');
      setPassword('Password123!');
    } else {
      setEmail('student@ojthub.com');
      setPassword('Password123!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative max-h-[95dvh] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)] sm:pb-0">
        
        {/* Close Button only if user is already logged in and just switching accounts */}
        {user && (
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 min-h-[38px] min-w-[38px] p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-5 sm:p-7">
          <div className="text-center mb-4 sm:mb-5 pr-6 sm:pr-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30 mb-2">
              <School className="w-3.5 h-3.5" />
              <span>Institutional OJT Portal</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {isRegister ? 'Enrolled Student / Teacher Registration' : 'Sign in to OJTHub'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isRegister
                ? 'All trainees must be enrolled under a school coordinator or supervisor'
                : 'Access your official geofenced attendance & DTR console'}
            </p>
          </div>

          {/* Quick Demo Fill Buttons for Testing & Defense */}
          <div className="mb-4 p-2.5 rounded-2xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/30">
            <div className="text-[10px] font-bold text-sky-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>1-Click Sample Accounts for Testing</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFillDemo('teacher')}
                className="py-1.5 px-2 rounded-xl bg-slate-800/90 hover:bg-sky-600/30 border border-slate-700/80 text-sky-300 text-left transition-all cursor-pointer font-medium"
              >
                <div className="font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-sky-400" />
                  <span>Teacher Account</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">teacher@ojthub.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('student')}
                className="py-1.5 px-2 rounded-xl bg-slate-800/90 hover:bg-emerald-600/30 border border-slate-700/80 text-emerald-300 text-left transition-all cursor-pointer font-medium"
              >
                <div className="font-bold flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400" />
                  <span>Student Account</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">student@ojthub.com</div>
              </button>
            </div>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 min-h-[38px] py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                !isRegister ? 'bg-sky-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 min-h-[38px] py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                isRegister ? 'bg-sky-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5 text-xs">
            {isRegister && (
              <>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Account Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('Trainee')}
                      className={`min-h-[40px] py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                        role === 'Trainee'
                          ? 'bg-sky-600/20 text-sky-300 border-sky-500/40 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>OJT Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('Supervisor')}
                      className={`min-h-[40px] py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                        role === 'Supervisor'
                          ? 'bg-sky-600/20 text-sky-300 border-sky-500/40 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Teacher / Coordinator</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Juan Dela Cruz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">School / University</label>
                  <div className="relative">
                    <School className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. ICCT Colleges"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                </div>

                {role === 'Supervisor' ? (
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Department / Class Section</label>
                    <input
                      type="text"
                      placeholder="e.g. College of Computer Studies / LFCA411M179"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Student / Trainee ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 2023-10492"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Teacher / Coordinator Code</label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="e.g. ICCT-2026"
                          value={supervisorCode}
                          onChange={(e) => setSupervisorCode(e.target.value)}
                          className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 uppercase font-mono tracking-wider font-bold"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-sky-400/90 mt-1">
                        Use sample code <strong className="font-mono text-white">ICCT-2026</strong> for testing.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            <div>
              <label className="block text-slate-400 font-medium mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="name@school.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-xl font-bold text-sm bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{submitting ? 'Authenticating...' : isRegister ? 'Create Enrolled Account' : 'Sign In to Console'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
