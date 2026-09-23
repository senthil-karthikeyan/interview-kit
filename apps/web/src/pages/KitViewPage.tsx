import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { kitsApi, type KitDetail } from '../api/client.js';
import type {
  Question,
  Flashcard,
  QuestionCategory,
  PatchQuestionInput,
  PatchFlashcardInput,
  AddQuestionInput,
  AddFlashcardInput,
} from '@interviewkit/schemas';
import {
  Sparkles,
  Briefcase,
  Calendar,
  Layers,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Download,
  Play,
  RotateCw,
  Plus,
  Pin,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const PIPELINE_STAGES = [
  'Extracting requirements from job description',
  'Crawling company website',
  'Researching company background and interview format',
  'Generating interview questions across categories',
  'Generating concept flashcards',
  'Verifying requirement coverage and filling gaps',
  'Building study schedule',
];

export function KitViewPage() {
  const { id } = useParams<{ id: string }>();

  const [kit, setKit] = useState<KitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'flashcards' | 'schedule'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [regeneratingBrief, setRegeneratingBrief] = useState(false);
  const [regeneratingCat, setRegeneratingCat] = useState(false);
  const [regeneratingSched, setRegeneratingSched] = useState(false);

  // Question editing / creation modal state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [questionOutline, setQuestionOutline] = useState('');
  const [questionCategory, setQuestionCategory] = useState<QuestionCategory>('technical');
  const [questionDifficulty, setQuestionDifficulty] = useState<number>(2);
  const [questionReqIds, setQuestionReqIds] = useState<string[]>([]);

  // Flashcard editing / creation modal state
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);
  const [isAddingFlashcard, setIsAddingFlashcard] = useState(false);
  const [flashcardFront, setFlashcardFront] = useState('');
  const [flashcardBack, setFlashcardBack] = useState('');
  const [flashcardReqIds, setFlashcardReqIds] = useState<string[]>([]);

  // Expanded answer outline map for question cards
  const [expandedOutlines, setExpandedOutlines] = useState<Record<string, boolean>>({});

  const fetchKit = async () => {
    if (!id) return;
    try {
      const data = await kitsApi.getKit(id);
      setKit(data);
    } catch (err) {
      console.error('Failed to load kit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchKit();
  }, [id]);

  // Polling while pending or processing
  useEffect(() => {
    if (!kit || (kit.status !== 'pending' && kit.status !== 'processing')) return;

    const interval = setInterval(async () => {
      if (!id) return;
      try {
        const statusRes = await kitsApi.getKitStatus(id);
        if (statusRes.status === 'ready' || statusRes.status === 'failed') {
          void fetchKit();
        } else {
          setKit((prev) => (prev ? { ...prev, ...statusRes } : null));
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [kit?.status, id]);

  const toggleOutline = (qId: string) => {
    setExpandedOutlines((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleExportJson = () => {
    if (!kit?.data) return;
    const blob = new Blob([JSON.stringify(kit.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-kit-${kit.data.source.company.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerateBrief = async () => {
    if (!id) return;
    setRegeneratingBrief(true);
    try {
      const res = await kitsApi.regenerateBrief(id);
      if (kit?.data) {
        setKit({
          ...kit,
          data: {
            ...kit.data,
            company_brief: res.company_brief,
          },
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate company brief');
    } finally {
      setRegeneratingBrief(false);
    }
  };

  const handleRegenerateCategory = async (cat: QuestionCategory) => {
    if (!id) return;
    setRegeneratingCat(true);
    try {
      const res = await kitsApi.regenerateCategory(id, cat);
      if (kit?.data) {
        setKit({
          ...kit,
          data: {
            ...kit.data,
            questions: res.questions,
            schedule: res.schedule,
          },
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate category questions');
    } finally {
      setRegeneratingCat(false);
    }
  };

  const handleRegenerateSchedule = async () => {
    if (!id) return;
    setRegeneratingSched(true);
    try {
      const res = await kitsApi.regenerateSchedule(id);
      if (kit?.data) {
        setKit({
          ...kit,
          data: {
            ...kit.data,
            schedule: res.schedule,
          },
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to recalculate schedule');
    } finally {
      setRegeneratingSched(false);
    }
  };

  // Toggle Pin on question
  const handleTogglePin = async (question: Question) => {
    if (!id || !kit?.data) return;
    const nextState = question._state === 'pinned' ? 'generated' : 'pinned';
    try {
      const res = await kitsApi.patchQuestion(id, question.id, { _state: nextState });
      setKit({ ...kit, data: res.kit });
    } catch (err: any) {
      alert('Failed to update question');
    }
  };

  // Delete question
  const handleDeleteQuestion = async (qId: string) => {
    if (!id || !kit?.data) return;
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await kitsApi.deleteQuestion(id, qId);
      setKit({ ...kit, data: res.kit });
    } catch (err: any) {
      alert('Failed to delete question');
    }
  };

  // Save edited or new question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !kit?.data) return;

    try {
      if (editingQuestion) {
        const patch: PatchQuestionInput = {
          prompt: questionPrompt,
          answer_outline: questionOutline,
          category: questionCategory,
          difficulty: questionDifficulty,
          _state: 'edited',
        };
        const res = await kitsApi.patchQuestion(id, editingQuestion.id, patch);
        setKit({ ...kit, data: res.kit });
        setEditingQuestion(null);
      } else if (isAddingQuestion) {
        const input: AddQuestionInput = {
          requirement_ids: questionReqIds.length > 0 ? questionReqIds : [kit.data.role.requirements[0]?.id || 'r1'],
          category: questionCategory,
          prompt: questionPrompt,
          answer_outline: questionOutline,
          difficulty: questionDifficulty,
        };
        const res = await kitsApi.addQuestion(id, input);
        setKit({ ...kit, data: res.kit });
        setIsAddingQuestion(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save question');
    }
  };

  // Flashcard save
  const handleSaveFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !kit?.data) return;

    try {
      if (editingFlashcard) {
        const patch: PatchFlashcardInput = {
          front: flashcardFront,
          back: flashcardBack,
          _state: 'edited',
        };
        const res = await kitsApi.patchFlashcard(id, editingFlashcard.id, patch);
        setKit({ ...kit, data: res.kit });
        setEditingFlashcard(null);
      } else if (isAddingFlashcard) {
        const input: AddFlashcardInput = {
          front: flashcardFront,
          back: flashcardBack,
          requirement_ids: flashcardReqIds.length > 0 ? flashcardReqIds : [kit.data.role.requirements[0]?.id || 'r1'],
        };
        const res = await kitsApi.addFlashcard(id, input);
        setKit({ ...kit, data: res.kit });
        setIsAddingFlashcard(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save flashcard');
    }
  };

  // Delete flashcard
  const handleDeleteFlashcard = async (fId: string) => {
    if (!id || !kit?.data) return;
    if (!confirm('Are you sure you want to delete this flashcard?')) return;
    try {
      const res = await kitsApi.deleteFlashcard(id, fId);
      setKit({ ...kit, data: res.kit });
    } catch (err: any) {
      alert('Failed to delete flashcard');
    }
  };

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (!kit?.data) return [];
    if (selectedCategory === 'all') return kit.data.questions;
    return kit.data.questions.filter((q) => q.category === selectedCategory);
  }, [kit?.data?.questions, selectedCategory]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading kit...</p>
        </div>
      </div>
    );
  }

  // Pending / Processing pipeline UI
  if (kit?.status === 'pending' || kit?.status === 'processing') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/25 animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Synthesizing Your Interview Kit
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            InterviewKit is crawling company data, analyzing requirements, and generating customized questions.
          </p>
        </div>

        {/* Progress Card */}
        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl mb-8">
          <div className="flex items-center justify-between text-sm font-semibold mb-3">
            <span className="text-slate-200">{kit.step}</span>
            <span className="text-brand-400 text-lg font-bold">{kit.progress}%</span>
          </div>

          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out shadow-sm shadow-brand-500/50"
              style={{ width: `${Math.max(kit.progress, 5)}%` }}
            />
          </div>

          {/* Stepper list */}
          <div className="mt-8 space-y-3">
            {PIPELINE_STAGES.map((stage, idx) => {
              const stagePct = Math.round(((idx + 1) / PIPELINE_STAGES.length) * 100);
              const isPast = kit.progress >= stagePct;
              const isCurrent = !isPast && (idx === 0 || kit.progress >= Math.round((idx / PIPELINE_STAGES.length) * 100));

              return (
                <div
                  key={stage}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-brand-500/10 border border-brand-500/20 text-white'
                      : isPast
                      ? 'text-slate-400'
                      : 'text-slate-600'
                  }`}
                >
                  {isPast ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-slate-500 text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                  )}
                  <span className="text-xs sm:text-sm font-medium">{stage}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/dashboard"
            className="text-xs text-slate-500 hover:text-slate-300 font-medium inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard (generation continues in background)
          </Link>
        </div>
      </div>
    );
  }

  // Failed state
  if (kit?.status === 'failed') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Generation Failed</h2>
        <p className="text-slate-400 text-sm mb-6">
          {kit.error || 'An unexpected error occurred during synthesis.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
          <Link
            to="/kits/new"
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  // Ready state — Kit data available
  const kitData = kit?.data;
  if (!kitData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-400">Kit data not found.</p>
        <Link to="/dashboard" className="text-brand-400 text-sm mt-3 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { source, company_brief, role, questions, flashcards, schedule, coverage } = kitData;

  const mustHaveCount = role.requirements.filter((r) => r.priority === 'must').length;
  const uncoveredCount = coverage.uncovered_requirement_ids.length;
  const coveragePercent = mustHaveCount > 0 ? Math.round(((mustHaveCount - uncoveredCount) / mustHaveCount) * 100) : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Kit Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20">
              <Briefcase className="w-3 h-3 text-brand-400" />
              {source.company}
            </span>
            {role.seniority && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300">
                {role.seniority}
              </span>
            )}
            {source.location && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300">
                {source.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-3 h-3" />
              {schedule.days_available} Days Plan
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{role.title}</h1>

          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <a
              href={source.company_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-400 transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {source.company_url}
            </a>
            <span>•</span>
            <span>Researched {new Date(source.researched_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>

          <Link
            to={`/kits/${id}/practice`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-white" />
            Practice Mode ({flashcards.length})
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 mb-8 overflow-x-auto scrollbar-thin">
        {[
          { key: 'overview', label: 'Overview & Brief' },
          { key: 'questions', label: `Interview Questions (${questions.length})` },
          { key: 'flashcards', label: `Flashcards (${flashcards.length})` },
          { key: 'schedule', label: `Study Schedule (${schedule.days.length} Days)` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === tab.key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW & RESEARCH ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Company Brief Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  Company Intelligence
                </h2>
                <button
                  onClick={handleRegenerateBrief}
                  disabled={regeneratingBrief}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                  title="Regenerate company brief from crawl"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${regeneratingBrief ? 'animate-spin' : ''}`} />
                  Regenerate Brief
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Summary
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed">{company_brief.summary}</p>
                </div>

                {company_brief.what_they_do && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      What They Do & Product
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {company_brief.what_they_do}
                    </p>
                  </div>
                )}

                {company_brief.sources.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Sources Researched
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {company_brief.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-md text-xs bg-white/5 hover:bg-white/10 text-slate-300 truncate max-w-xs transition-colors flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{src}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Role Responsibilities */}
            {role.responsibilities.length > 0 && (
              <div className="p-6 sm:p-7 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  Key Responsibilities
                </h2>
                <ul className="space-y-2.5">
                  {role.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right column: Requirements & Coverage */}
          <div className="space-y-6">
            {/* Coverage Card */}
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Must-Have Coverage
              </h3>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white">{coveragePercent}%</span>
                <span className="text-xs text-slate-400">
                  ({mustHaveCount - uncoveredCount}/{mustHaveCount} must-haves covered)
                </span>
              </div>

              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>

              <p className="text-xs text-slate-400">
                Coverage passes executed: <strong className="text-slate-200">{coverage.passes}</strong>
              </p>
            </div>

            {/* Extracted Requirements List */}
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-400" />
                Extracted Requirements ({role.requirements.length})
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
                {role.requirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-brand-400 font-semibold">{req.id}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            req.priority === 'must'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          {req.priority.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-slate-300">
                          {req.kind}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{req.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: INTERVIEW QUESTIONS (KIT BUILDER) ──────────────────────────── */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['all', 'technical', 'behavioural', 'system-design', 'company-fit'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    selectedCategory === cat
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {cat.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => handleRegenerateCategory(selectedCategory as QuestionCategory)}
                  disabled={regeneratingCat}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors disabled:opacity-50"
                  title="Regenerates category questions while keeping edited & pinned ones"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${regeneratingCat ? 'animate-spin' : ''}`} />
                  Regenerate Category
                </button>
              )}

              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setQuestionPrompt('');
                  setQuestionOutline('');
                  setQuestionCategory(selectedCategory === 'all' ? 'technical' : (selectedCategory as QuestionCategory));
                  setQuestionDifficulty(2);
                  setQuestionReqIds([]);
                  setIsAddingQuestion(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Question
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const isPinned = q._state === 'pinned';
              const isEdited = q._state === 'edited';
              const isExpanded = expandedOutlines[q.id];

              return (
                <div
                  key={q.id}
                  className={`p-6 rounded-2xl bg-white/[0.03] border transition-all ${
                    isPinned
                      ? 'border-amber-500/30 bg-amber-500/[0.02]'
                      : isEdited
                      ? 'border-brand-500/30'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">{q.id}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20 capitalize">
                        {q.category.replace('-', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-slate-300">
                        Difficulty: {q.difficulty === 1 ? 'Foundational' : q.difficulty === 2 ? 'Intermediate' : 'Advanced'}
                      </span>

                      {/* State badge */}
                      {isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Pin className="w-2.5 h-2.5 fill-amber-300" />
                          PINNED
                        </span>
                      )}
                      {isEdited && !isPinned && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          EDITED
                        </span>
                      )}

                      {/* Linked requirements */}
                      {q.requirement_ids.map((rid) => (
                        <span key={rid} className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400">
                          {rid}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleTogglePin(q)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          isPinned
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'text-slate-500 hover:text-amber-400 hover:bg-white/5'
                        }`}
                        title={isPinned ? 'Unpin question' : 'Pin question (protects from regeneration)'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setQuestionPrompt(q.prompt);
                          setQuestionOutline(q.answer_outline);
                          setQuestionCategory(q.category);
                          setQuestionDifficulty(q.difficulty);
                          setQuestionReqIds(q.requirement_ids);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Edit question"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-white leading-snug mb-3">
                    {q.prompt}
                  </h3>

                  {/* Outline collapsible */}
                  <div className="pt-2 border-t border-white/5">
                    <button
                      onClick={() => toggleOutline(q.id)}
                      className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          Hide Answer Outline
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Show Model Answer Outline
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                        {q.answer_outline}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: FLASHCARDS ─────────────────────────────────────────────────── */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div>
              <h2 className="text-base font-bold text-white">Revision Flashcards</h2>
              <p className="text-xs text-slate-400">
                Click any card to flip and view the answer. Practice mode tracks your recall confidence.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={`/kits/${id}/practice`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Launch Practice
              </Link>

              <button
                onClick={() => {
                  setEditingFlashcard(null);
                  setFlashcardFront('');
                  setFlashcardBack('');
                  setFlashcardReqIds([]);
                  setIsAddingFlashcard(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Flashcard
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {flashcards.map((card) => (
              <FlashcardItem
                key={card.id}
                card={card}
                onEdit={() => {
                  setEditingFlashcard(card);
                  setFlashcardFront(card.front);
                  setFlashcardBack(card.back);
                  setFlashcardReqIds(card.requirement_ids);
                }}
                onDelete={() => handleDeleteFlashcard(card.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: STUDY SCHEDULE ────────────────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div>
              <h2 className="text-base font-bold text-white">
                {schedule.days_available}-Day Structured Study Schedule
              </h2>
              <p className="text-xs text-slate-400">
                Priority-weighted questions mathematically distributed across your available preparation window.
              </p>
            </div>

            <button
              onClick={handleRegenerateSchedule}
              disabled={regeneratingSched}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${regeneratingSched ? 'animate-spin' : ''}`} />
              Recalculate Schedule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {schedule.days.map((day) => {
              const dayQuestions = day.question_ids
                .map((qid) => questions.find((q) => q.id === qid))
                .filter(Boolean) as Question[];

              return (
                <div
                  key={day.day}
                  className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                        Day {day.day}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/5">
                        <Clock className="w-3 h-3 text-brand-400" />
                        {day.minutes} mins
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-4">{day.focus}</h3>

                    {dayQuestions.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white/[0.01] border border-dashed border-white/10 text-center text-xs text-slate-400">
                        <BookOpen className="w-5 h-5 mx-auto mb-1.5 text-slate-500" />
                        Dedicated review & flashcard practice
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {dayQuestions.map((q) => (
                          <div
                            key={q.id}
                            className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-slate-400">{q.id}</span>
                              <span className="capitalize text-[10px] text-brand-400 font-semibold">
                                {q.category}
                              </span>
                            </div>
                            <p className="text-slate-200 line-clamp-2 leading-relaxed">{q.prompt}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400">
                    {dayQuestions.length} questions assigned
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── QUESTION MODAL (EDIT / ADD) ───────────────────────────────────────── */}
      {(editingQuestion || isAddingQuestion) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-[#141724] border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingQuestion ? `Edit Question ${editingQuestion.id}` : 'Add New Question'}
            </h3>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Question Prompt
                </label>
                <textarea
                  required
                  rows={3}
                  value={questionPrompt}
                  onChange={(e) => setQuestionPrompt(e.target.value)}
                  placeholder="Enter the question prompt..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Model Answer Outline
                </label>
                <textarea
                  required
                  rows={4}
                  value={questionOutline}
                  onChange={(e) => setQuestionOutline(e.target.value)}
                  placeholder="Key points a strong answer should cover..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={questionCategory}
                    onChange={(e) => setQuestionCategory(e.target.value as QuestionCategory)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="technical" className="bg-[#141724]">Technical</option>
                    <option value="behavioural" className="bg-[#141724]">Behavioural</option>
                    <option value="system-design" className="bg-[#141724]">System Design</option>
                    <option value="company-fit" className="bg-[#141724]">Company Fit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={questionDifficulty}
                    onChange={(e) => setQuestionDifficulty(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value={1} className="bg-[#141724]">1 - Foundational</option>
                    <option value={2} className="bg-[#141724]">2 - Intermediate</option>
                    <option value={3} className="bg-[#141724]">3 - Advanced</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion(null);
                    setIsAddingQuestion(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FLASHCARD MODAL (EDIT / ADD) ──────────────────────────────────────── */}
      {(editingFlashcard || isAddingFlashcard) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#141724] border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingFlashcard ? `Edit Flashcard ${editingFlashcard.id}` : 'Add New Flashcard'}
            </h3>

            <form onSubmit={handleSaveFlashcard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Front (Concept / Prompt)
                </label>
                <textarea
                  required
                  rows={2}
                  value={flashcardFront}
                  onChange={(e) => setFlashcardFront(e.target.value)}
                  placeholder="e.g. What is the CAP theorem?"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Back (Explanation / Answer)
                </label>
                <textarea
                  required
                  rows={4}
                  value={flashcardBack}
                  onChange={(e) => setFlashcardBack(e.target.value)}
                  placeholder="Key explanation points..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFlashcard(null);
                    setIsAddingFlashcard(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Interactive Flashcard Item component ──────────────────────────────────────

function FlashcardItem({
  card,
  onEdit,
  onDelete,
}: {
  card: Flashcard;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className="group relative cursor-pointer min-h-[220px] p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-brand-500/40 backdrop-blur-sm transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500">{card.id}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400">
              {flipped ? 'Answer' : 'Prompt'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1 rounded text-slate-500 hover:text-white transition-colors"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="py-2">
          {flipped ? (
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line animate-fadeIn">
              {card.back}
            </p>
          ) : (
            <p className="text-base font-semibold text-white leading-snug animate-fadeIn">
              {card.front}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1 font-mono">
          {card.requirement_ids.map((id) => (
            <span key={id} className="bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
              {id}
            </span>
          ))}
        </div>
        <span>Click to flip</span>
      </div>
    </div>
  );
}
