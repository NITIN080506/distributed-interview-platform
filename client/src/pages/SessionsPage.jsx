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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Technical Interview Sessions</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Active and scheduled collaborative rooms with live Monaco editor sync and sandboxed execution.
          </p>
        </div>

        {isInterviewer && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Schedule Interview
          </button>
        )}
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading interview rooms...
        </div>
      ) : sessions.length === 0 ? (
        <div className="border border-white/[0.06] rounded-lg p-10 text-center bg-[#0c0d12] max-w-lg mx-auto">
          <h3 className="text-sm font-semibold text-white mb-1">No Active Interviews</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Schedule a new interview session to start live coding with candidates.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors"
          >
            Create Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="border border-white/[0.06] hover:border-white/10 rounded-lg p-4 bg-[#0c0d12] transition-colors flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="flex items-center gap-1 text-[10px] font-mono font-medium uppercase text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {sess.status}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {new Date(sess.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors line-clamp-1 mb-3">
                  {sess.title}
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">
                      Interviewer: <strong className="text-zinc-200 font-medium">{sess.interviewer?.name}</strong>
                    </span>
                  </div>
                  {sess.problem && (
                    <div className="flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        Task: <strong className="text-zinc-200 font-medium">{sess.problem.title}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {sess.language || 'python'}
                </span>
                <Link
                  to={`/room/${sess.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Join Room
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Schedule Session */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0f1117] border border-white/10 rounded-xl p-5 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
              <h2 className="text-sm font-bold text-white">Create Interview Session</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Session Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer - Round 1"
                  required
                  className="w-full bg-[#161822] border border-white/10 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Problem Challenge</label>
                <select
                  value={problemId}
                  onChange={(e) => setProblemId(e.target.value)}
                  className="w-full bg-[#161822] border border-white/10 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  {problems.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Candidate Email (Optional)</label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full bg-[#161822] border border-white/10 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Initial Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#161822] border border-white/10 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="python">Python 3.10</option>
                  <option value="javascript">JavaScript (Node 20)</option>
                  <option value="cpp">C++17 (GCC 12)</option>
                  <option value="java">Java 17 (OpenJDK)</option>
                  <option value="go">Go 1.21</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
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
