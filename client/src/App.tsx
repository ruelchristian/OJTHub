import React, { useState, useEffect } from 'react';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

import { Navbar } from './components/Navbar';

import { Dashboard } from './components/Dashboard';

import { AttendanceHistory } from './components/AttendanceHistory';

import { JournalView } from './components/JournalView';

import { DtrGenerator } from './components/DtrGenerator';

import { SettingsView } from './components/SettingsView';

import { SupervisorPortal } from './components/SupervisorPortal';

import { AuthModal } from './components/AuthModal';

const SupervisorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const { user } = useAuth();

  if (user && user.role !== 'Supervisor') {

    return <Navigate to="/dashboard" replace />;

  }

  return <>{children}</>;

};

const TraineeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user && user.role === 'Supervisor') {
    return <Navigate to="/supervisor" replace />;
  }
  return <>{children}</>;
};


const MainLayout: React.FC = () => {

  const { user, loading } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {

    if (!loading && !user) {

      setAuthModalOpen(true);

    }

  }, [user, loading]);

  if (loading) {

    return (

      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">

        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />

        <div className="text-sm font-semibold tracking-wide text-slate-300">Loading OJTHub Console...</div>

      </div>

    );

  }

  const defaultRedirect = user?.role === 'Supervisor' ? '/supervisor' : '/dashboard';

  return (

    <div className="min-h-screen min-h-[100dvh] bg-[#0b0f19] text-slate-100 flex flex-col w-full overflow-x-hidden">

      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-10">

        <Routes>

          <Route path="/" element={<Navigate to={defaultRedirect} replace />} />

          <Route path="/dashboard" element={<TraineeRoute><Dashboard /></TraineeRoute>} />

          <Route path="/history" element={<TraineeRoute><AttendanceHistory /></TraineeRoute>} />

          <Route path="/journal" element={<TraineeRoute><JournalView /></TraineeRoute>} />

          <Route path="/activities" element={<Navigate to="/journal" replace />} />

          <Route path="/reports" element={<Navigate to="/journal" replace />} />

          <Route path="/documents" element={<TraineeRoute><DtrGenerator /></TraineeRoute>} />

          <Route

            path="/settings"

            element={

              <SupervisorRoute>

                <SettingsView />

              </SupervisorRoute>

            }

          />

          <Route

            path="/supervisor"

            element={

              <SupervisorRoute>

                <SupervisorPortal />

              </SupervisorRoute>

            }

          />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>

      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-5 text-center text-xs text-slate-400 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-6">

        <div className="max-w-7xl mx-auto px-4 leading-relaxed">

          OJTHub &bull; Geofenced OJT Attendance, AI-Assisted Reporting, and Customizable Management PWA

        </div>

      </footer>

      <AuthModal

        isOpen={authModalOpen}

        onClose={() => setAuthModalOpen(false)}

      />

    </div>

  );

};

export function App() {

  return (

    <BrowserRouter>

      <AuthProvider>

        <MainLayout />

      </AuthProvider>

    </BrowserRouter>

  );

}

export default App;

