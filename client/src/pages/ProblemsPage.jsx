import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Search, ChevronRight, Play, Terminal, ArrowUpRight } from 'lucide-react';

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const { isInterviewer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProblems();
  }, [difficultyFilter]);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (difficultyFilter !== 'ALL') params.difficulty = difficultyFilter;
      const { data } = await api.get('/problems', { params });
      setProblems(data.problems || []);
    } catch (err) {
      console.error('Failed to fetch problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = problems.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const getDifficultyPill = (diff) => {
    const config = {
      EASY: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400', label: 'Easy' },
      MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-400/10', dot: 'bg-amber-400', label: 'Medium' },
      HARD: { color: 'text-rose-400', bg: 'bg-rose-400/10', dot: 'bg-rose-400', label: 'Hard' },
    };
    const c = config[diff];
    if (!c) return null;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.color} ${c.bg}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  };

  const handleCreateQuickSession = async (problem) => {
    try {
      const { data } = await api.post('/sessions', {
        title: `Practice: ${problem.title}`,
        problemId: problem.id,
        language: 'python',
      });
      navigate(`/room/${data.session.id}`);
    } catch (err) {
      navigate(`/room/practice-${problem.id}?problemId=${problem.id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Problem Bank</h1>
        <p className="text-base text-zinc-400 mt-2">
          Browse and solve algorithmic challenges with real-time multi-language evaluation.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Terminal className="h-4 w-4 text-blue-400" />
          <span>
            <span className="text-white font-semibold">{filteredProblems.length}</span>{' '}
            {filteredProblems.length === 1 ? 'problem' : 'problems'}
          </span>
        </div>
        <Link
          to="/sessions"
          className="ml-auto px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg border border-white/[0.08] transition-all duration-200"
        >
          View Active Interviews
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems, topics, tags..."
            className="w-full h-11 bg-[#111827] border border-white/[0.08] rounded-xl pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`h-9 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                difficultyFilter === diff
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
              }`}
            >
              {diff === 'ALL' ? 'All' : diff.charAt(0) + diff.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Problem List */}
      <div className="space-y-3">
        {loading ? (
          /* Skeleton Loading */
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#111827] rounded-xl p-5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="h-4 bg-white/[0.06] rounded-lg w-48" />
                    <div className="flex gap-2">
                      <div className="h-5 bg-white/[0.04] rounded w-16" />
                      <div className="h-5 bg-white/[0.04] rounded w-20" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-6 bg-white/[0.04] rounded-full w-16" />
                    <div className="h-9 bg-white/[0.06] rounded-lg w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProblems.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-5">
              <Search className="h-7 w-7 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">No problems found</h3>
            <p className="text-sm text-zinc-500 max-w-sm">
              Try adjusting your search query or filter to find what you're looking for.
            </p>
          </div>
        ) : (
          filteredProblems.map((p) => (
            <div
              key={p.id}
              onClick={() => handleCreateQuickSession(p)}
              className="bg-[#111827] border border-white/[0.06] hover:border-blue-500/30 hover:bg-[#1e293b] rounded-xl p-5 cursor-pointer transition-all duration-200 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left Side */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white transition-colors mb-2">
                    {p.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags?.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-xs font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.06]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-4 shrink-0">
                  {getDifficultyPill(p.difficulty)}

                  <span className="text-sm text-zinc-500 font-mono hidden lg:inline">
                    {p.timeLimitMs}ms / {p.memoryLimitMb}MB
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateQuickSession(p);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg border border-blue-500/30 hover:border-blue-600 transition-all duration-200"
                  >
                    Solve
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
