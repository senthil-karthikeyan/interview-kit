import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { kitsApi, type KitSummary } from '../api/client.js';
import {
  PlusCircle,
  Briefcase,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export function DashboardPage() {
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKits = async () => {
    try {
      const res = await kitsApi.listKits();
      setKits(res.kits);
    } catch (err) {
      console.error('Failed to load kits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchKits();

    // Poll every 3 seconds if any kit is pending/processing
    const interval = setInterval(() => {
      const hasActive = kits.some((k) => k.status === 'pending' || k.status === 'processing');
      if (hasActive) {
        void fetchKits();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [kits]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this kit?')) return;

    setDeletingId(id);
    try {
      await kitsApi.deleteKit(id);
      setKits((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      alert('Failed to delete kit');
    } finally {
      setDeletingId(null);
    }
  };

  const readyKits = kits.filter((k) => k.status === 'ready');
  const activeKits = kits.filter((k) => k.status === 'pending' || k.status === 'processing');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Interview Kits</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your tailored interview preparation kits and launch practice sessions
          </p>
        </div>
        <Link
          to="/kits/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Kit
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Kits
            </span>
            <Layers className="w-5 h-5 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{kits.length}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ready to Practice
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{readyKits.length}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              In Progress
            </span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{activeKits.length}</div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading your preparation kits...</p>
        </div>
      ) : kits.length === 0 ? (
        <div className="py-20 px-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No kits created yet</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Provide a job description and company URL, and InterviewKit will synthesize a
            full preparation kit with questions, flashcards, and a schedule.
          </p>
          <Link
            to="/kits/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm shadow-lg shadow-brand-500/20 transition-all hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" />
            Build Your First Kit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kits.map((kit) => {
            const isReady = kit.status === 'ready';
            const isProcessing = kit.status === 'processing' || kit.status === 'pending';
            const isFailed = kit.status === 'failed';

            return (
              <div
                key={kit.id}
                className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-brand-500/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-white/5 border-white/10 text-slate-300">
                      <Briefcase className="w-3 h-3 text-brand-400" />
                      <span className="truncate max-w-[150px]">{kit.company || 'Company'}</span>
                    </div>

                    {isReady && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    )}
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating
                      </span>
                    )}
                    {isFailed && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                    {kit.role || 'Interview Kit'}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Created {new Date(kit.createdAt).toLocaleDateString()}
                  </p>

                  {isProcessing && (
                    <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                        <span className="truncate max-w-[180px]">{kit.step}</span>
                        <span className="font-semibold text-brand-400">{kit.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-500 rounded-full"
                          style={{ width: `${kit.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => handleDelete(e, kit.id)}
                    disabled={deletingId === kit.id}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Kit"
                  >
                    {deletingId === kit.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <Link
                    to={`/kits/${kit.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-brand-600 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isReady ? 'Open Kit' : isProcessing ? 'View Progress' : 'View Details'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
