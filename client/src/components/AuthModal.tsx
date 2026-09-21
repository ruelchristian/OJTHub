import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User as UserIcon, Award, Shield } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, continueAsGuest } = useAuth();
  const [isRegister, setIsRegister] = useState<boolean>(false);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
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
        await register(email, password, fullName, studentId, role);
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

  const handleGuest = () => {
    continueAsGuest();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative max-h-[95dvh] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)] sm:pb-0">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 min-h-[38px] min-w-[38px] p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-8">
          <div className="text-center mb-5 sm:mb-6 pr-6 sm:pr-0">
            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {isRegister ? 'Create an OJTHub Account' : 'Welcome to OJTHub'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isRegister
                ? 'Register to securely synchronize attendance and DTR records'
                : 'Sign in to access your geofenced attendance console'}
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 mb-4 sm:mb-5 text-xs font-semibold">
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
                      <span>OJT Trainee</span>
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
                      <span>Supervisor</span>
                    </button>
                  </div>
                </div>

                {role === 'Trainee' && (
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Student / Trainee ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 2023-10492"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-slate-400 font-medium mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="name@institution.edu.ph"
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
              <span>{submitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            </button>
          </form>

          {/* Guest Mode fallback */}
          <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={handleGuest}
              className="min-h-[40px] px-2 py-1 text-xs text-slate-400 hover:text-sky-400 font-medium transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              Or continue as <span className="underline font-semibold ml-1">Guest Trainee</span> (Offline Trial)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
