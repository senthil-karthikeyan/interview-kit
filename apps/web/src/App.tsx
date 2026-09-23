import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { NewKitPage } from './pages/NewKitPage.js';
import { KitViewPage } from './pages/KitViewPage.js';
import { PracticeModePage } from './pages/PracticeModePage.js';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kits/new"
              element={
                <ProtectedRoute>
                  <NewKitPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kits/:id"
              element={
                <ProtectedRoute>
                  <KitViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kits/:id/practice"
              element={
                <ProtectedRoute>
                  <PracticeModePage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
