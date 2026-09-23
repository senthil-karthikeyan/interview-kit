import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { kitsApi, type KitDetail } from '../api/client.js';
import type { Flashcard } from '@interviewkit/schemas';
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Eye,
  Loader2,
  Award,
} from 'lucide-react';

export function PracticeModePage() {
  const { id } = useParams<{ id: string }>();

  const [kit, setKit] = useState<KitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRatings, setSessionRatings] = useState<Array<{ flashcardId: string; confidence: number }>>([]);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const data = await kitsApi.getKit(id);
        setKit(data);
      } catch (err) {
        console.error('Failed to load kit for practice:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Order cards: prioritize unpracticed and low-confidence cards
  const orderedCards = useMemo(() => {
    if (!kit?.data?.flashcards) return [];
    const history = kit.practiceHistory || [];

    // Map cardId -> average confidence
    const confidenceMap = new Map<string, { total: number; count: number }>();
    for (const record of history) {
      const existing = confidenceMap.get(record.flashcard_id) || { total: 0, count: 0 };
      confidenceMap.set(record.flashcard_id, {
        total: existing.total + record.confidence,
        count: existing.count + 1,
      });
    }

    return [...kit.data.flashcards].sort((a, b) => {
      const statsA = confidenceMap.get(a.id);
      const statsB = confidenceMap.get(b.id);

      const scoreA = statsA ? statsA.total / statsA.count : 0;
      const scoreB = statsB ? statsB.total / statsB.count : 0;

      // Lower score first (unpracticed cards with score 0 appear first)
      return scoreA - scoreB;
    });
  }, [kit?.data?.flashcards, kit?.practiceHistory]);

  const currentCard: Flashcard | undefined = orderedCards[currentIndex];

  const handleRate = async (confidence: number) => {
    if (!id || !currentCard || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await kitsApi.recordPractice(id, {
        flashcard_id: currentCard.id,
        confidence,
      });

      setSessionRatings((prev) => [...prev, { flashcardId: currentCard.id, confidence }]);

      if (currentIndex + 1 < orderedCards.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsRevealed(false);
      } else {
        setIsFinished(true);
      }
    } catch (err) {
      console.error('Failed to record practice:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsRevealed(false);
    setSessionRatings([]);
    setIsFinished(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-slate-400 text-sm">Preparing flashcards...</p>
        </div>
      </div>
    );
  }

  if (!kit?.data || orderedCards.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-slate-400 mb-4">No flashcards found for this kit.</p>
        <Link to={`/kits/${id}`} className="text-brand-400 text-sm">
          Back to Kit
        </Link>
      </div>
    );
  }

  // Finished Screen
  if (isFinished) {
    const avgConfidence =
      sessionRatings.length > 0
        ? (sessionRatings.reduce((sum, r) => sum + r.confidence, 0) / sessionRatings.length).toFixed(1)
        : '0.0';

    const masteredCount = sessionRatings.filter((r) => r.confidence >= 4).length;
    const reviewCount = sessionRatings.filter((r) => r.confidence <= 2).length;

    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/25">
          <Award className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Practice Complete!</h1>
        <p className="text-slate-400 text-sm mb-8">
          You've reviewed {sessionRatings.length} flashcards for {kit.data.role.title} at {kit.data.source.company}.
        </p>

        {/* Stats card */}
        <div className="grid grid-cols-3 gap-3 p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl mb-8">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Average Score
            </div>
            <div className="text-3xl font-extrabold text-brand-400">{avgConfidence} / 5</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Strong Recall
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">{masteredCount}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Needs Work
            </div>
            <div className="text-3xl font-extrabold text-amber-400">{reviewCount}</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Practice Again
          </button>

          <Link
            to={`/kits/${id}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/25 transition-all hover:scale-105"
          >
            <CheckCircle2 className="w-4 h-4" />
            Done & Return to Kit
          </Link>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / orderedCards.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          to={`/kits/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Exit Practice
        </Link>

        <div className="text-xs font-semibold text-slate-400">
          Card <span className="text-white font-bold">{currentIndex + 1}</span> of{' '}
          <span className="text-white font-bold">{orderedCards.length}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-brand-500 transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Interactive Card */}
      <div className="min-h-[360px] p-8 sm:p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col justify-between mb-8 transition-all">
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="font-mono text-xs font-bold text-brand-400">
              {currentCard.id}
            </span>
            <div className="flex items-center gap-1.5">
              {currentCard.requirement_ids.map((rid) => (
                <span
                  key={rid}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/5"
                >
                  {rid}
                </span>
              ))}
            </div>
          </div>

          {/* Front Prompt */}
          <div className="mb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Concept / Prompt
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {currentCard.front}
            </h2>
          </div>

          {/* Back Reveal */}
          {isRevealed && (
            <div className="pt-6 border-t border-white/10 animate-fadeIn">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                Explanation & Answer
              </span>
              <p className="text-base text-slate-200 leading-relaxed whitespace-pre-line">
                {currentCard.back}
              </p>
            </div>
          )}
        </div>

        {/* Reveal Button */}
        {!isRevealed && (
          <div className="pt-6">
            <button
              onClick={() => setIsRevealed(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <Eye className="w-4 h-4 text-brand-400" />
              Reveal Answer
            </button>
          </div>
        )}
      </div>

      {/* Rating Bar (appears once revealed) */}
      {isRevealed && (
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-sm animate-fadeIn">
          <div className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            How well did you recall this concept?
          </div>

          <div className="grid grid-cols-5 gap-2.5">
            {[
              { score: 1, label: 'Needs Work', color: 'hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-300' },
              { score: 2, label: 'Shaky', color: 'hover:bg-amber-500/20 hover:border-amber-500/40 text-amber-300' },
              { score: 3, label: 'Decent', color: 'hover:bg-yellow-500/20 hover:border-yellow-500/40 text-yellow-300' },
              { score: 4, label: 'Good', color: 'hover:bg-emerald-500/20 hover:border-emerald-500/40 text-emerald-300' },
              { score: 5, label: 'Mastered', color: 'hover:bg-brand-500/20 hover:border-brand-500/40 text-brand-300' },
            ].map((rating) => (
              <button
                key={rating.score}
                onClick={() => handleRate(rating.score)}
                disabled={isSubmitting}
                className={`py-3 px-2 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95 ${rating.color}`}
              >
                <span className="text-lg font-bold text-white">{rating.score}</span>
                <span className="text-[10px] font-medium hidden sm:inline">{rating.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
