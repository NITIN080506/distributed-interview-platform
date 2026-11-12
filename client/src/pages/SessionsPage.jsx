import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Video, Plus, Calendar, Clock, ArrowRight, UserCheck, Code, Sparkles } from 'lucide-react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal state
  const [title, setTitle] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [problemId, setProblemId] = useState('');
  const [language, setLanguage] = useState('python');
  const [submitting, setSubmitting] = useState(false);

  const { user, isInterviewer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
    fetchProblems();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProblems = async () => {
    try {
      const { data } = await api.get('/problems');
      setProblems(data.problems || []);
      if (data.problems?.length > 0) {
        setProblemId(data.problems[0].id);
      }
    } catch (err) {
      console.error('Failed to load problems:', err);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/sessions', {
        title: title || 'Technical Coding Interview',
        candidateEmail,
        problemId,
        language,
      });
      setIsModalOpen(false);
      navigate(`/room/${data.session.id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      alert(err.response?.data?.error || 'Failed to create session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold tracking-wide uppercase">
            <Video className="h-4 w-4" />
            Interview Rooms
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            Active Collaborative Sessions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-user Monaco editor synchronization with automated Docker container evaluation.
          </p>
        </div>

        {isInterviewer && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            Schedule Interview
          </button>
        )}
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading your active interview rooms...
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Video className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Active Interview Sessions</h3>
          <p className="text-sm text-slate-400 mb-6">
            Get started by scheduling a new interview session or pick a problem from the Problem Bank.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Create New Session
            </button>
            <Link
              to="/problems"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors"
            >
              Browse Problems
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 transition-all shadow-lg flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {sess.status}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(sess.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                  {sess.title}
                </h3>

                <div className="mt-4 space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>Host: <strong className="text-slate-200">{sess.interviewer?.name}</strong></span>
                  </div>
                  {sess.problem && (
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span>Task: <strong className="text-slate-200">{sess.problem.title}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500 uppercase">{sess.language || 'python'}</span>
                <Link
                  to={`/room/${sess.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  Join Room
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Schedule Session */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-1">Create Technical Interview</h2>
            <p className="text-xs text-slate-400 mb-6">
              Spin up a sandboxed live interview room with real-time editor synchronization.
            </p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Session Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer - Round 1"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Assign Problem Challenge
                </label>
                <select
                  value={problemId}
                  onChange={(e) => setProblemId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {problems.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Candidate Email (Optional)
                </label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Primary Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="python">Python 3.10</option>
                  <option value="javascript">JavaScript (Node 20)</option>
                  <option value="cpp">C++17 (GCC 12)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating Room...' : 'Start Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
