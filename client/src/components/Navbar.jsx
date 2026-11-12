import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Terminal, LogOut, ChevronDown, Radio, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated, isInterviewer } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="h-12 border-b border-white/[0.06] bg-[#090a0d]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-6 w-6 rounded-md bg-[#161a23] border border-white/10 flex items-center justify-center text-blue-400 group-hover:border-blue-500/40 transition-colors">
              <Terminal className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              CodePulse
              <span className="text-[10px] font-mono text-zinc-500 font-normal">v1.2</span>
            </span>
          </Link>

          <div className="h-3.5 w-[1px] bg-white/[0.08]" />

          <nav className="flex items-center gap-1">
            <Link
              to="/problems"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                isActive('/problems')
                  ? 'text-white bg-white/[0.06]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              Problem Bank
            </Link>
            <Link
              to="/sessions"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                isActive('/sessions')
                  ? 'text-white bg-white/[0.06]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              Interviews
            </Link>
          </nav>
        </div>

        {/* Right: Telemetry Ping & User Menu */}
        <div className="flex items-center gap-3">
          {/* Real-time Socket Health Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.03] border border-white/[0.06] text-zinc-400">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-[10px] uppercase tracking-wide">
              {isConnected ? 'cluster live' : 'reconnecting'}
            </span>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
                <div className="h-5 w-5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[11px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-zinc-200 font-medium max-w-[120px] truncate">
                  {user.name}
                </span>
                <span
                  className={`text-[9px] font-mono font-medium uppercase px-1 py-0.2 rounded border ${
                    isInterviewer
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700/50'
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-md transition-colors shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
