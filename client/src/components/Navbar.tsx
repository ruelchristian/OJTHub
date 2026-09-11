import React from 'react';
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
  MapPin
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenAuth }) => {
  const { user, isGuest, logout } = useAuth();

  const isSupervisor = user?.role === 'Supervisor';

  const traineeTabs = [
    { id: 'dashboard', label: 'Punch Clock', icon: Clock },
    { id: 'history', label: 'Attendance', icon: Calendar },
    { id: 'activities', label: 'Tasks', icon: CheckSquare },
    { id: 'reports', label: 'AI Reports', icon: Sparkles },
    { id: 'documents', label: 'PDF DTR', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const supervisorTabs = [
    { id: 'supervisor', label: 'Trainees Roster', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tabs = isSupervisor ? supervisorTabs : traineeTabs;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab(tabs[0].id)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <MapPin className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-sky-400 bg-clip-text text-transparent">
                OJTHub
              </div>
              <div className="text-[10px] text-sky-400 font-medium tracking-wider uppercase">
                {isSupervisor ? 'Supervisor Portal' : 'Attendance & Management PWA'}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User profile & Actions */}
          <div className="flex items-center gap-3">
            {isGuest ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Guest Mode
                </span>
                <button
                  onClick={onOpenAuth}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow transition-all"
                >
                  Sign In / Sync
                </button>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200">{user.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-medium capitalize">
                    {user.role} {user.studentId ? `• ${user.studentId}` : ''}
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Log out"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-800 py-2 px-3 flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-1 rounded-lg transition-all ${
                isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
