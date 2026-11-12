import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, Shield, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/problems');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
    setLoading(true);

    try {
      await login(demoEmail, 'password123');
      navigate('/problems');
    } catch (err) {
      setError(err.response?.data?.error || 'Database connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center p-4 bg-[#090a0d]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="h-8 w-8 rounded-lg bg-[#141720] border border-white/10 flex items-center justify-center text-blue-400 mx-auto mb-3">
            <Terminal className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">Sign in to CodePulse</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Distributed Real-Time Code Execution Platform</p>
        </div>

        <div className="bg-[#0f1117] border border-white/[0.08] rounded-xl p-5 shadow-xl">
          {error && (
            <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full bg-[#161822] border border-white/10 rounded-md px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-400 font-medium">Password</label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#161822] border border-white/10 rounded-md px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Continue'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 text-center mb-2.5">
              1-Click Demo Profiles
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('interviewer@example.com')}
                className="py-1.5 px-2 rounded bg-white/[0.03] border border-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.06] text-[11px] font-medium transition-colors"
              >
                Interviewer
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('candidate@example.com')}
                className="py-1.5 px-2 rounded bg-white/[0.03] border border-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.06] text-[11px] font-medium transition-colors"
              >
                Candidate
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-zinc-300 hover:text-white underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
