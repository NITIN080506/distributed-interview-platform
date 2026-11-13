import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Code2,
  Calendar,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  Plus,
  Play,
  Cpu,
  Radio,
  Clock,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [probRes, sessRes, subRes] = await Promise.allSettled([
          api.get('/problems'),
          api.get('/sessions'),
          api.get('/submissions?limit=10'),
        ]);

        if (probRes.status === 'fulfilled') {
          setProblems(probRes.value.data.problems || []);
        }
        if (sessRes.status === 'fulfilled') {
          setSessions(sessRes.value.data.sessions || []);
        }
        if (subRes.status === 'fulfilled') {
          setSubmissions(subRes.value.data.submissions || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const totalAccepted = submissions.filter((s) => s.status === 'ACCEPTED').length;
  const successRate = submissions.length > 0 ? Math.round((totalAccepted / submissions.length) * 100) : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Distributed Cloud Workspace
            </span>
            <span className="text-xs text-zinc-500">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back, <span className="gradient-text">{user?.name || 'Developer'}</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Multi-container sandboxed code execution, synchronized interview rooms, and runtime telemetry.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/problems"
            className="px-4 py-2 text-sm font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg border border-white/10 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Play className="h-4 w-4 text-blue-400 fill-current" />
            Problem Bank
          </Link>
          <Link
            to="/sessions"
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Interview Rooms
          </Link>
        </div>
      </div>

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Problems Available</span>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{problems.length}</div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">Multi-Language</span>
            <span>(Py, JS, C++, Java, Go)</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Interview Sessions</span>
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{sessions.length}</div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="text-indigo-400 font-medium">Real-Time</span>
            <span>WebSockets + WebRTC</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Submissions Logged</span>
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{submissions.length}</div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">{successRate}%</span>
            <span>Acceptance rate</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sandbox Isolation</span>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 tracking-tight flex items-center gap-2">
            <span>Docker</span>
            <span className="text-xs font-mono font-normal text-zinc-400">cgroups v2</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 font-mono">128MB / 0.5 CPU quota</span>
          </div>
        </div>
      </div>

      {/* ── Active Architecture Telemetry Strip ── */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-white">Redis Queue:</span>
            <span className="text-zinc-400 font-mono text-xs">BullMQ active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="font-semibold text-white">WebSocket Relay:</span>
            <span className="text-zinc-400 font-mono text-xs">{isConnected ? 'Connected' : 'Reconnecting'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold text-white">Execution Engine:</span>
            <span className="text-zinc-400 font-mono text-xs">Docker Sandboxed</span>
          </div>
        </div>

        <Link
          to="/submissions"
          className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          View Execution Audit Logs
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Split Section: Recent Sessions & Quick Problems ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active & Recent Interviews */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Active & Recent Interview Sessions
            </h2>
            <Link
              to="/sessions"
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              See all ({sessions.length})
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-8 text-center space-y-3">
              <p className="text-sm text-zinc-400">No interview sessions scheduled yet.</p>
              <Link
                to="/sessions"
                className="btn-primary"
              >
                Create Your First Session
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 4).map((sess) => (
                <div
                  key={sess.id}
                  className="bg-[#111827] border border-white/[0.08] hover:border-blue-500/40 rounded-xl p-4 transition-all duration-200 flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {sess.title}
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400">
                        {sess.language || 'python'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-3">
                      <span>Interviewer: {sess.interviewer?.name || 'Lead Engineer'}</span>
                      {sess.problem && <span>• Problem: {sess.problem.title}</span>}
                    </div>
                  </div>

                  <Link
                    to={`/room/${sess.id}`}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    Enter Room
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Challenges & Practice */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Code2 className="h-5 w-5 text-indigo-400" />
              Practice Problem Bank
            </h2>
            <Link
              to="/problems"
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Browse all
            </Link>
          </div>

          <div className="bg-[#111827] border border-white/[0.08] rounded-xl divide-y divide-white/[0.06] overflow-hidden">
            {problems.slice(0, 4).map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/room/practice-${p.id}?problemId=${p.id}`)}
                className="p-3.5 hover:bg-white/[0.03] cursor-pointer transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-sm font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors">
                    {p.title}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5">
                    {p.timeLimitMs}ms • {p.memoryLimitMb}MB limit
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${
                      p.difficulty === 'EASY'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : p.difficulty === 'MEDIUM'
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {p.difficulty}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
