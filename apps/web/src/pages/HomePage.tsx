import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  Sparkles,
  ArrowRight,
  Brain,
  Layers,
  Calendar,
  Play,
  Terminal,
} from 'lucide-react';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-brand-600/20 to-purple-600/20 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-8 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>AI-Powered Interview Preparation</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6">
          Turn Any Job Description Into a Personalized{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400">
            Interview Kit
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Paste any job description and company URL. InterviewKit crawls the company, extracts key requirements, generates targeted interview questions with model answers, creates revision flashcards, and plans your study schedule.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={user ? '/dashboard' : '/register'}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-semibold text-base shadow-xl shadow-brand-500/25 transition-all hover:scale-105 active:scale-95"
          >
            {user ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            to="/kits/new"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold transition-all hover:scale-105"
          >
            <Play className="w-4 h-4 fill-slate-200" />
            Build a Preparation Kit
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/5">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Complete Preparation Architecture
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Every kit is engineered with deterministic coverage checks, verifiable company research, and spaced practice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-brand-500/30 transition-all hover:shadow-xl hover:shadow-brand-500/5 group">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Requirement Extraction</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Extracts must-have vs nice-to-have qualifications and categorizes them into technical, behavioural, and domain requirements with strict source grounding.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/5 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Coverage Guarantee</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our automated coverage engine verifies every must-have requirement is addressed and generates gap-filling questions with up to 3 iterative passes.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/5 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Adaptive Study Schedule</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Distributes questions across your preparation window with high-priority topics first, calculating integer study minutes and daily thematic focus labels.
            </p>
          </div>
        </div>
      </section>

      {/* CLI Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/5 mb-16">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-brand-950/40 via-white/[0.02] to-purple-950/40 border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-slate-300 text-xs font-mono mb-3">
              <Terminal className="w-3.5 h-3.5 text-brand-400" />
              <span>Batch CLI Ready</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Automated Batch Execution</h3>
            <p className="text-slate-400 text-sm max-w-xl">
              InterviewKit comes equipped with a command-line batch runner supporting per-case failure isolation and strict JSON schema conformance.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-brand-300 shrink-0">
            <code>npm run evaluate -- --input cases.json --output kits.json</code>
          </div>
        </div>
      </section>
    </div>
  );
}
