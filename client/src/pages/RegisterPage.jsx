import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, ArrowRight, AlertCircle, Code2, Users } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CANDIDATE');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, role);
      navigate('/problems');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090a0d] relative overflow-hidden">
      {/* Subtle radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08)_0%,_transparent_70%)]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Terminal className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create your account</h2>
          <p className="text-base text-zinc-400 mt-1.5">Start real-time technical interview sessions</p>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                required
                className="w-full h-11 bg-[#0d1117] border border-white/10 rounded-lg px-3.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@company.com"
                required
                className="w-full h-11 bg-[#0d1117] border border-white/10 rounded-lg px-3.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 bg-[#0d1117] border border-white/10 rounded-lg px-3.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Account Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('CANDIDATE')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    role === 'CANDIDATE'
                      ? 'bg-blue-600/10 border-blue-500/40 ring-1 ring-blue-500/30'
                      : 'bg-[#0d1117] border-white/10 hover:border-white/20'
                  }`}
                >
                  <Code2 className={`h-5 w-5 mb-2 ${role === 'CANDIDATE' ? 'text-blue-400' : 'text-zinc-500'}`} />
                  <div className={`text-sm font-semibold ${role === 'CANDIDATE' ? 'text-blue-300' : 'text-zinc-300'}`}>
                    Candidate
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">Take interviews & solve problems</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('INTERVIEWER')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    role === 'INTERVIEWER'
                      ? 'bg-purple-600/10 border-purple-500/40 ring-1 ring-purple-500/30'
                      : 'bg-[#0d1117] border-white/10 hover:border-white/20'
                  }`}
                >
                  <Users className={`h-5 w-5 mb-2 ${role === 'INTERVIEWER' ? 'text-purple-400' : 'text-zinc-500'}`} />
                  <div className={`text-sm font-semibold ${role === 'INTERVIEWER' ? 'text-purple-300' : 'text-zinc-300'}`}>
                    Interviewer
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">Host sessions & evaluate code</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40"
            >
              {loading ? 'Creating...' : 'Create Account'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-zinc-300 hover:text-white underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
