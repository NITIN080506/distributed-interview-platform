import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, ArrowRight, AlertCircle } from 'lucide-react';

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
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center p-4 bg-[#090a0d]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="h-8 w-8 rounded-lg bg-[#141720] border border-white/10 flex items-center justify-center text-blue-400 mx-auto mb-3">
            <Terminal className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">Create an account</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Start real-time technical interview sessions</p>
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
              <label className="block text-zinc-400 mb-1 font-medium">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                required
                className="w-full bg-[#161822] border border-white/10 rounded-md px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@company.com"
                required
                className="w-full bg-[#161822] border border-white/10 rounded-md px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#161822] border border-white/10 rounded-md px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">Account Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('CANDIDATE')}
                  className={`py-2 px-3 rounded-md text-xs font-medium border text-left transition-colors ${
                    role === 'CANDIDATE'
                      ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                      : 'bg-[#161822] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div>Candidate</div>
                  <div className="text-[10px] text-zinc-500 font-normal">Take interviews</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('INTERVIEWER')}
                  className={`py-2 px-3 rounded-md text-xs font-medium border text-left transition-colors ${
                    role === 'INTERVIEWER'
                      ? 'bg-purple-600/15 border-purple-500/40 text-purple-300'
                      : 'bg-[#161822] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div>Interviewer</div>
                  <div className="text-[10px] text-zinc-500 font-normal">Host & evaluate</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Account'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-4">
          Already registered?{' '}
          <Link to="/login" className="text-zinc-300 hover:text-white underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
