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
    <header className="h-16 border-b border-white/[0.08] bg-[#0a0e1a]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
              <Terminal className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              CodePulse
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  isActive('/dashboard')
                    ? 'text-white bg-white/[0.08] text-blue-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]'
                }`}
              >
                Dashboard
              </Link>
            )}
            <Link
              to="/problems"
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                isActive('/problems')
                  ? 'text-white bg-white/[0.08] text-blue-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]'
              }`}
            >
              Problem Bank
            </Link>
            <Link
              to="/sessions"
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                isActive('/sessions')
                  ? 'text-white bg-white/[0.08] text-blue-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]'
              }`}
            >
              Interviews
            </Link>
            {isAuthenticated && (
              <Link
                to="/submissions"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  isActive('/submissions')
                    ? 'text-white bg-white/[0.08] text-blue-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]'
                }`}
              >
                Telemetry
              </Link>
            )}
          </nav>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                className="flex items-center gap-3 p-1 rounded-lg hover:bg-white/[0.04] transition-colors group"
                title="View Profile & Settings"
              >
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-md group-hover:scale-105 transition-transform">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {isConnected && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0e1a]" />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm text-zinc-100 font-medium max-w-[130px] truncate leading-tight group-hover:text-blue-300 transition-colors">
                    {user.name}
                  </span>
                  <span className="text-xs text-zinc-500 leading-tight capitalize">
                    {user.role?.toLowerCase()}
                  </span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="text-sm text-zinc-400 hover:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm text-zinc-400 hover:text-white px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2 rounded-lg transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40"
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
