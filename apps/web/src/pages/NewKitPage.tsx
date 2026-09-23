import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kitsApi } from '../api/client.js';
import {
  Sparkles,
  Globe,
  FileText,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';

const SAMPLE_JD = `Senior Full-Stack Software Engineer

About the Role:
We are seeking an experienced Senior Full-Stack Engineer to lead the architecture and development of our core web platform. You will build high-throughput APIs, intuitive user interfaces, and collaborate with cross-functional teams.

Responsibilities:
- Design, build, and maintain scalable microservices and real-time backend systems.
- Lead frontend architecture using React, TypeScript, and modern CSS.
- Partner with product managers, designers, and peer engineers to deliver customer features.
- Mentor junior engineers and participate in code reviews.

Requirements:
- 5+ years of production experience with TypeScript, Node.js, and React.
- Strong understanding of RESTful API design, PostgreSQL or MongoDB, and Redis caching.
- Solid grasp of asynchronous workflows, message queues, and distributed systems.
- Experience with unit and integration testing (Vitest, Jest).

Nice-to-Have:
- Familiarity with Kubernetes, Docker, and CI/CD pipelines.
- Experience with AI API integrations and prompt engineering.`;

export function NewKitPage() {
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleUseSample = () => {
    setJd(SAMPLE_JD);
    setCompanyUrl('https://stripe.com');
    setDays(7);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (jd.trim().length < 20) {
      setError('Please provide a complete job description (at least 20 characters).');
      return;
    }

    let validUrl = companyUrl.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = `https://${validUrl}`;
    }

    try {
      new URL(validUrl);
    } catch {
      setError('Please provide a valid company website URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await kitsApi.createKit({
        jd: jd.trim(),
        company_url: validUrl,
        days: Number(days),
      });
      navigate(`/kits/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate kit generation.');
      setIsSubmitting(false);
    }
  };

  const dayPresets = [3, 7, 14, 30];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 items-center justify-center mb-4 shadow-xl shadow-brand-500/25">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Create Interview Kit</h1>
        <p className="text-slate-400 text-sm mt-2">
          Paste the job description and company URL to generate an end-to-end preparation package.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl">
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <FileText className="w-4 h-4 text-brand-400" />
                    Job Description
                  </label>
                  <button
                    type="button"
                    onClick={handleUseSample}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                  >
                    Paste Sample JD
                  </button>
                </div>
                <textarea
                  rows={8}
                  required
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste the full job posting text here..."
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm leading-relaxed scrollbar-thin"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                  <span>Minimum 20 characters</span>
                  <span>{jd.length} characters</span>
                </div>
              </div>

              {/* Company Website URL */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  <Globe className="w-4 h-4 text-brand-400" />
                  Company Website URL
                </label>
                <input
                  type="text"
                  required
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Used by our crawler to research company mission, values, and interview insights.
                </p>
              </div>

              {/* Study Days Available */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <Calendar className="w-4 h-4 text-brand-400" />
                    Preparation Window (Days)
                  </label>
                  <span className="text-sm font-bold text-brand-400">{days} Days</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  {dayPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDays(preset)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        days === preset
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {preset} Days
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min={1}
                  max={60}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Launching Generation Pipeline...
                  </>
                ) : (
                  <>
                    Generate Preparation Kit
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Features */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              What You'll Get
            </h3>

            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-white">Requirements Analysis:</strong> Explicit Must-have
                  vs Nice-to-have breakdown.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-white">Company Research:</strong> Summarized corporate
                  mission, products, and interview intelligence.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-white">Categorized Questions:</strong> Technical,
                  Behavioural, System Design, and Culture Fit with model answer outlines.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-white">Revision Flashcards:</strong> Concept cards
                  linked directly to job requirements.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-white">Day-by-Day Study Plan:</strong> Mathematically
                  allocated study schedule prioritizing critical topics.
                </span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
            <span>
              All generated questions and flashcards can be edited, pinned, or regenerated anytime
              without losing your customizations.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
