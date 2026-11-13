import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Shield,
  Search,
  Filter,
  FileCode,
  ArrowUpRight,
  RefreshCw,
  Terminal,
  X,
} from 'lucide-react';

export default function SubmissionHistoryPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await api.get('/submissions', { params });
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Accepted
          </span>
        );
      case 'WRONG_ANSWER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="h-3.5 w-3.5" />
            Wrong Answer
          </span>
        );
      case 'TIME_LIMIT_EXCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5" />
            Time Limit Exceeded
          </span>
        );
      case 'RUNTIME_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="h-3.5 w-3.5" />
            Runtime Error
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="h-3.5 w-3.5 animate-spin" />
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Clock className="h-3.5 w-3.5" />
            Queued
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-500" />
            Execution Telemetry & Submission Logs
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Audit history of all sandboxed code executions, resource limits, and test evaluation telemetry.
          </p>
        </div>

        <button
          onClick={fetchSubmissions}
          className="self-start sm:self-auto px-4 py-2 text-sm font-semibold text-zinc-200 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg border border-white/10 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* ── Filter Strip ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111827] border border-white/[0.08] p-3 rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {filter.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          Showing {submissions.length} executions
        </div>
      </div>

      {/* ── Submissions Table / Cards ── */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 space-y-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Retrieving telemetry logs from PostgreSQL...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="glass-card p-12 text-center max-w-lg mx-auto space-y-4">
          <FileCode className="h-12 w-12 text-zinc-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Executions Found</h3>
          <p className="text-sm text-zinc-400">
            Submit code in any interview room or practice problem to record execution telemetry.
          </p>
          <Link
            to="/problems"
            className="btn-primary inline-flex"
          >
            Go to Problem Bank
          </Link>
        </div>
      ) : (
        <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0c101b] text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-5">Problem / Task</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Language</th>
                  <th className="py-3.5 px-4">Test Cases</th>
                  <th className="py-3.5 px-4">Runtime</th>
                  <th className="py-3.5 px-4">Peak Memory</th>
                  <th className="py-3.5 px-4">Sandbox</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSubmission(sub)}
                    className="hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-5 font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {sub.problem?.title || 'Ad-Hoc Practice Session'}
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(sub.status)}</td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-white/[0.05] text-zinc-300">
                        {sub.language}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-zinc-300">
                      {sub.passedTestCases} / {sub.totalTestCases}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-cyan-400">
                      {sub.telemetry?.runtimeMs !== undefined ? `${sub.telemetry.runtimeMs} ms` : '—'}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-purple-400">
                      {sub.telemetry?.memoryKb ? `${Math.round(sub.telemetry.memoryKb / 1024 * 10) / 10} MB` : '—'}
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                        <Shield className="h-3 w-3" />
                        {sub.telemetry?.sandboxType || 'Docker'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-zinc-500 font-mono whitespace-nowrap">
                      {new Date(sub.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubmission(sub);
                        }}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-auto"
                      >
                        Details
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Inspection Modal ── */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-blue-400" />
                  Submission Execution Trace
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  ID: <span className="font-mono text-zinc-300">{selectedSubmission.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.05]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm font-sans">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="bg-black/30 p-3 rounded-lg border border-white/[0.06]">
                  <span className="text-zinc-500 block text-[10px]">STATUS</span>
                  <span className="font-bold text-white">{selectedSubmission.status}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/[0.06]">
                  <span className="text-zinc-500 block text-[10px]">LANGUAGE</span>
                  <span className="font-bold text-cyan-400 uppercase">{selectedSubmission.language}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/[0.06]">
                  <span className="text-zinc-500 block text-[10px]">RUNTIME</span>
                  <span className="font-bold text-emerald-400">{selectedSubmission.telemetry?.runtimeMs || 0} ms</span>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/[0.06]">
                  <span className="text-zinc-500 block text-[10px]">CONTAINER</span>
                  <span className="font-bold text-purple-400">{selectedSubmission.telemetry?.sandboxType || 'Docker'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Source Code Evaluated
                </label>
                <pre className="bg-[#090d16] border border-white/[0.08] rounded-xl p-4 font-mono text-xs text-zinc-200 overflow-x-auto max-h-60 leading-relaxed">
                  {selectedSubmission.code}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-black/20 flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
