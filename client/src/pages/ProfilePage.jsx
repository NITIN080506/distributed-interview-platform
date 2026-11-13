import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Shield,
  Calendar,
  Code2,
  Activity,
  Award,
  CheckCircle2,
  Mail,
  Key,
  Layers,
  Settings,
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalSubmissions: 0,
    problemsSolved: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [sessRes, subRes] = await Promise.allSettled([
          api.get('/sessions'),
          api.get('/submissions?limit=100'),
        ]);

        let sessionsCount = 0;
        let submissionsCount = 0;
        let acceptedCount = 0;

        if (sessRes.status === 'fulfilled') {
          sessionsCount = sessRes.value.data.sessions?.length || 0;
        }
        if (subRes.status === 'fulfilled') {
          const subs = subRes.value.data.submissions || [];
          submissionsCount = subs.length;
          const uniqueProblems = new Set(
            subs.filter((s) => s.status === 'ACCEPTED').map((s) => s.problemId)
          );
          acceptedCount = uniqueProblems.size;
        }

        setStats({
          totalSessions: sessionsCount,
          totalSubmissions: submissionsCount,
          problemsSolved: acceptedCount,
        });
      } catch (err) {
        console.error('Failed to load profile metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 font-sans">
      {/* ── User Profile Header Card ── */}
      <div className="glass-card p-8 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl shadow-blue-500/25">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{user?.name || 'Developer'}</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <Shield className="h-3.5 w-3.5" />
                {user?.role || 'CANDIDATE'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-zinc-500" />
                <span>{user?.email || 'developer@example.com'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Key className="h-4 w-4 text-zinc-500" />
                <span className="font-mono text-xs">Role: {user?.role}</span>
              </div>
            </div>

            <p className="text-sm text-zinc-400 pt-2">
              Collaborative software engineer utilizing sandboxed real-time distributed execution.
            </p>
          </div>
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-6 text-center space-y-2">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.problemsSolved}</div>
          <div className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Unique Problems Solved</div>
        </div>

        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-6 text-center space-y-2">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-2">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.totalSessions}</div>
          <div className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Interview Sessions</div>
        </div>

        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-6 text-center space-y-2">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
            <Activity className="h-5 w-5" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.totalSubmissions}</div>
          <div className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Total Code Executions</div>
        </div>
      </div>

      {/* ── System Credentials & Environment Configuration ── */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-400" />
          Platform Environment & Sandbox Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-sans">
          <div className="p-4 rounded-lg bg-black/20 border border-white/[0.06] space-y-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Docker Execution Sandbox</span>
            <div className="font-medium text-emerald-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Isolated Linux Containers (--network none)
            </div>
            <p className="text-xs text-zinc-500">Resource quotas: 128MB RAM, 0.5 CPU, 64 PIDs</p>
          </div>

          <div className="p-4 rounded-lg bg-black/20 border border-white/[0.06] space-y-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Monaco Editor Configuration</span>
            <div className="font-medium text-blue-400">JetBrains Mono • VS Dark High-Contrast</div>
            <p className="text-xs text-zinc-500">Auto-completion, multi-cursor, and real-time socket syncing</p>
          </div>
        </div>
      </div>
    </div>
  );
}
