import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, 
  Calendar, 
  CheckSquare, 
  Sparkles, 
  FileText, 
  Settings, 
  Users, 
  LogOut,
  LogIn,
  User,
  X,
  ShieldCheck,
  MapPin
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenAuth }) => {
  const { user, isGuest, logout } = useAuth();
  const [accountDrawerOpen, setAccountDrawerOpen] = useState<boolean>(false);

  const isSupervisor = user?.role === 'Supervisor';

  const traineeTabs = [
    { id: 'dashboard', label: 'Punch Clock', mobileLabel: 'Clock', icon: Clock },
    { id: 'history', label: 'Attendance', mobileLabel: 'History', icon: Calendar },
    { id: 'activities', label: 'Tasks', mobileLabel: 'Tasks', icon: CheckSquare },
    { id: 'reports', label: 'AI Reports', mobileLabel: 'AI', icon: Sparkles },
    { id: 'documents', label: 'PDF DTR', mobileLabel: 'DTR', icon: FileText },
    { id: 'settings', label: 'Settings', mobileLabel: 'Settings', icon: Settings },
  ];

  const supervisorTabs = [
    { id: 'supervisor', label: 'Trainees Roster', mobileLabel: 'Roster', icon: Users },
    { id: 'settings', label: 'Settings', mobileLabel: 'Settings', icon: Settings },
  ];

  const tabs = isSupervisor ? supervisorTabs : traineeTabs;

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none shrink-0" 
            onClick={() => setCurrentTab(tabs[0].id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setCurrentTab(tabs[0].id); }}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-sky-400 bg-clip-text text-transparent leading-tight">
                OJTHub
              </div>
              <div className="text-[9px] sm:text-[10px] text-sky-400 font-medium tracking-wider uppercase leading-none mt-0.5">
                {isSupervisor ? 'Supervisor Portal' : 'Attendance & Management'}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  aria-label={tab.label}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop User Profile & Actions (Mobile uses bottom navigation Account tab) */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
            {isGuest ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Guest Mode
                </span>
                <button
                  onClick={onOpenAuth}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              </div>
            ) : user ? (
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <button
                  onClick={() => setAccountDrawerOpen(true)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all cursor-pointer text-left"
                  title="View Account Profile"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow shrink-0">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block max-w-[130px] lg:max-w-[180px]">
                    <div className="text-xs font-semibold text-slate-200 truncate leading-tight">{user.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-medium capitalize truncate leading-tight">
                      {user.role} {user.studentId ? `• ${user.studentId}` : ''}
                    </div>
                  </div>
                </button>
                <button
                  onClick={logout}
                  title="Log out"
                  className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>

      {/* Mobile Bottom Navigation Bar (PWA Native feel) */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-[0_-8px_20px_rgba(0,0,0,0.4)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id && !accountDrawerOpen;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              aria-label={tab.label}
              onClick={() => {
                setAccountDrawerOpen(false);
                setCurrentTab(tab.id);
              }}
              className={`flex-1 min-h-[46px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all cursor-pointer relative ${
                isActive 
                  ? 'text-sky-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
              )}
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[9px] xs:text-[10px] leading-tight tracking-tight text-center truncate max-w-full">
                {tab.mobileLabel || tab.label}
              </span>
            </button>
          );
        })}

        {/* Dedicated Mobile Login / Account Tab */}
        <button
          data-tab="account"
          aria-label={user ? 'Account' : 'Login'}
          onClick={() => {
            if (user) {
              setAccountDrawerOpen(true);
            } else {
              onOpenAuth();
            }
          }}
          className={`flex-1 min-h-[46px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all cursor-pointer relative ${
            accountDrawerOpen
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          {accountDrawerOpen && (
            <div className="absolute top-0 w-8 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          )}
          {user ? (
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shadow">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
          ) : (
            <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
          )}
          <span className="text-[9px] xs:text-[10px] leading-tight tracking-tight text-center truncate max-w-full font-medium">
            {user ? 'Account' : 'Login'}
          </span>
        </button>
      </nav>

      {/* Mobile Account Profile Drawer */}
      {accountDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setAccountDrawerOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-sky-400" />
                <span>Account Profile</span>
              </h3>
              <button
                onClick={() => setAccountDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {user ? (
              <div className="space-y-4">
                {/* User Info Card */}
                <div className="flex items-center gap-3.5 bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-md shrink-0">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">{user.fullName}</div>
                    <div className="text-xs text-slate-400 truncate">{user.email}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        <ShieldCheck className="w-3 h-3" />
                        {user.role}
                      </span>
                      {user.studentId && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-700 text-slate-300">
                          ID: {user.studentId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountDrawerOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-sky-400" />
                    <span>Switch Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountDrawerOpen(false);
                      logout();
                    }}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-2">
                <p className="text-xs text-slate-400">
                  You are currently in Guest mode. Sign in to synchronize your attendance records.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAccountDrawerOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
