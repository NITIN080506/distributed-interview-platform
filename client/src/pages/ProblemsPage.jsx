import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Code2, Search, Filter, Play, CheckCircle2, Plus, Sparkles, BookOpen } from 'lucide-react';

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

  const getDifficultyBadge = (diff) => {
    switch (diff) {
      case 'EASY':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Easy</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Medium</span>;
      case 'HARD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Hard</span>;
      default:
        return null;
    }
  };

  const handleCreateQuickSession = async (problem) => {
    try {
      const { data } = await api.post('/sessions', {
        title: `Live Practice: ${problem.title}`,
        problemId: problem.id,
        language: 'python',
      });
      navigate(`/room/${data.session.id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      // Fallback: navigate directly to problem view
      navigate(`/room/practice-${problem.id}?problemId=${problem.id}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold tracking-wide uppercase">
            <BookOpen className="h-4 w-4" />
            Curated Problem Bank
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            Algorithm Challenges & System Tasks
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Execute in real-time sandboxed Docker environments with automated test case evaluation and memory telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/sessions"
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-700 text-sm font-medium transition-colors"
          >
            My Interview Sessions
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems by name or tag (e.g. Hash Table)..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Difficulty pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
          {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                difficultyFilter === diff
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-slate-950/40">
                <th className="py-3.5 px-6">Problem</th>
                <th className="py-3.5 px-6">Difficulty</th>
                <th className="py-3.5 px-6">Tags</th>
                <th className="py-3.5 px-6">Limits</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading problem bank from PostgreSQL...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    No problems match your query.
                  </td>
                </tr>
              ) : (
                filteredProblems.map((problem) => (
                  <tr
                    key={problem.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleCreateQuickSession(problem)}
                  >
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                        {problem.title}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {problem._count?.testCases || 4} test cases (auto-evaluated)
                      </span>
                    </td>
                    <td className="py-4 px-6">{getDifficultyBadge(problem.difficulty)}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {problem.tags?.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700/50"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                      <div>{problem.timeLimitMs || 2000} ms</div>
                      <div className="text-slate-500">{problem.memoryLimitMb || 128} MB</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateQuickSession(problem);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-semibold transition-all shadow-sm"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Enter Room
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
