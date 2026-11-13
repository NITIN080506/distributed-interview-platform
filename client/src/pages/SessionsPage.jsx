import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, ArrowRight, UserCheck, Code, Calendar, X } from 'lucide-react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal State
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
        title: title || 'Technical Interview Session',
        candidateEmail,
        problemId,
        language,
      });
      setIsModalOpen(false);
      navigate(`/room/${data.session.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create session.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const isActive = status?.toLowerCase() === 'active' || status?.toLowerCase() === 'in_progress';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isActive
            ? 'text-emerald-400 bg-emerald-400/10'
            : 'text-zinc-400 bg-white/[0.06]'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isActive ? 'bg-emerald-400' : 'bg-zinc-500'
          }`}
        />
        {isActive ? 'Active' : status}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Interview Sessions</h1>
          <p className="text-base text-zinc-400 mt-2">
            Manage and join collaborative coding interview rooms.
          </p>
        </div>

        {isInterviewer && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-blue-600/20 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Schedule Interview
          </button>
        )}
      </div>

      {/* Sessions List */}
      {loading ? (
        /* Skeleton Loading */
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-5 bg-white/[0.06] rounded-lg w-20" />
                  <div className="h-5 bg-white/[0.06] rounded-lg w-64" />
                  <div className="h-4 bg-white/[0.04] rounded w-48" />
                </div>
                <div className="h-8 bg-white/[0.04] rounded-lg w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-6">
            <Calendar className="h-9 w-9 text-zinc-600" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-200 mb-2">No interview sessions yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mb-6">
            Schedule your first interview session to start live coding with candidates in a collaborative environment.
          </p>
          {isInterviewer && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-blue-600/20 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Create Your First Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="bg-[#111827] border border-white/[0.06] hover:border-blue-500/30 rounded-xl p-6 transition-all duration-200 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    {getStatusBadge(sess.status)}
                    <span className="text-sm text-zinc-500">
                      {new Date(sess.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-zinc-200 group-hover:text-white transition-colors mb-3 line-clamp-1">
                    {sess.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-zinc-500 shrink-0" />
                      <span>
                        Interviewer:{' '}
                        <span className="text-zinc-200 font-medium">{sess.interviewer?.name}</span>
                      </span>
                    </div>
                    {sess.problem && (
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span>
                          Problem:{' '}
                          <span className="text-zinc-200 font-medium">{sess.problem.title}</span>
                        </span>
                      </div>
                    )}
                    <span className="text-xs font-mono text-zinc-500 uppercase bg-white/[0.04] px-2 py-0.5 rounded">
                      {sess.language || 'python'}
                    </span>
                  </div>
                </div>

                {/* Right Action */}
                <Link
                  to={`/room/${sess.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors shrink-0 mt-2 sm:mt-1"
                >
                  Join Room
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Schedule Session */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Create Interview Session</h2>
                <p className="text-sm text-zinc-400 mt-1">Set up a new collaborative coding room.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Session Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer - Round 1"
                  required
                  className="w-full h-11 bg-[#0a0e1a] border border-white/[0.08] rounded-lg px-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Problem Challenge</label>
                <select
                  value={problemId}
                  onChange={(e) => setProblemId(e.target.value)}
                  className="w-full h-11 bg-[#0a0e1a] border border-white/[0.08] rounded-lg px-4 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                >
                  {problems.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Candidate Email (Optional)</label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full h-11 bg-[#0a0e1a] border border-white/[0.08] rounded-lg px-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Initial Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-11 bg-[#0a0e1a] border border-white/[0.08] rounded-lg px-4 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="python">Python 3.10</option>
                  <option value="javascript">JavaScript (Node 20)</option>
                  <option value="cpp">C++17 (GCC 12)</option>
                  <option value="java">Java 17 (OpenJDK)</option>
                  <option value="go">Go 1.21</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-blue-600/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
