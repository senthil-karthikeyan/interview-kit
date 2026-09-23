import { Routes, Route, Navigate } from 'react-router-dom';

// Pages will be built in Phase 13+
// Placeholder pages for Phase 1 compilation
function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          Now in development
        </div>
        <h1 className="text-5xl font-bold text-white tracking-tight">
          Interview<span className="text-brand-400">Kit</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-md">
          Turn a job description into a personalized interview preparation kit — powered by AI.
        </p>
      </div>
      <div className="flex gap-3">
        <a
          href="/login"
          className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors"
        >
          Get Started
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
