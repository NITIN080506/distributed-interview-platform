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
    switch (diff) {
      case 'EASY':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Easy
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Medium
          </span>
        );
      case 'HARD':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Hard
          </span>
        );
      default:
        return null;
    }
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Algorithmic Problem Bank</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time multi-language evaluation with strict CPU and memory resource isolation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/sessions"
            className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-md border border-white/[0.06] transition-colors"
          >
            View Active Interviews
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems, topics, tags..."
            className="w-full bg-[#111318] border border-white/[0.08] rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-auto bg-[#111318] p-0.5 rounded-md border border-white/[0.06]">
          {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                difficultyFilter === diff
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table */}
      <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-[#0c0d12]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-zinc-500 bg-[#090a0d]">
              <th className="py-2.5 px-4 font-medium">Title</th>
              <th className="py-2.5 px-4 font-medium">Difficulty</th>
              <th className="py-2.5 px-4 font-medium">Topics</th>
              <th className="py-2.5 px-4 font-medium">Constraints</th>
              <th className="py-2.5 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-zinc-500">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading problem bank...
                </td>
              </tr>
            ) : filteredProblems.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-10 text-center text-zinc-500">
                  No problems found matching criteria.
                </td>
              </tr>
            ) : (
              filteredProblems.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => handleCreateQuickSession(p)}
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-medium text-zinc-200 group-hover:text-blue-400 transition-colors">
                    {p.title}
                  </td>
                  <td className="py-3 px-4">{getDifficultyPill(p.difficulty)}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {p.tags?.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.05]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                    {p.timeLimitMs}ms / {p.memoryLimitMb}MB
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateQuickSession(p);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-400 group-hover:text-white transition-colors"
                    >
                      Solve
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
