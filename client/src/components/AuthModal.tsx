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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-extrabold text-white">
              {isRegister ? 'Create an OJTHub Account' : 'Welcome to OJTHub'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isRegister
                ? 'Register to securely synchronize attendance and DTR records'
                : 'Sign in to access your geofenced attendance console'}
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                !isRegister ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                isRegister ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
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

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {isRegister && (
              <>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. Juan Dela Cruz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
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
                      className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 ${
                        role === 'Trainee'
                          ? 'bg-sky-600/20 text-sky-300 border-sky-500/40 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      OJT Trainee
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('Supervisor')}
                      className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 ${
                        role === 'Supervisor'
                          ? 'bg-sky-600/20 text-sky-300 border-sky-500/40 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Supervisor
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
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-slate-400 font-medium mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="name@institution.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {submitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Guest Mode fallback */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={handleGuest}
              className="text-xs text-slate-400 hover:text-sky-400 font-medium transition-colors"
            >
              Or continue as <span className="underline font-semibold">Guest Trainee</span> (Offline Trial)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
