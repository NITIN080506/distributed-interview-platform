import React, { useState, useEffect } from 'react';
import api from '../api';
import Editor from '@monaco-editor/react';
import { History, Play, Pause, RotateCcw, AlertTriangle, ShieldCheck, X } from 'lucide-react';

export default function AuditPlaybackModal({ sessionId, isOpen, onClose, language = 'python' }) {
  const [logs, setLogs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchAuditLogs();
    }
  }, [isOpen, sessionId]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/audit/${sessionId}`);
      setLogs(data.logs || []);
      setCurrentIndex((data.logs || []).length > 0 ? (data.logs || []).length - 1 : 0);
    } catch (err) {
      console.warn('Failed to load audit logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= logs.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isPlaying, logs.length]);

  if (!isOpen) return null;

  const currentLog = logs[currentIndex] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">Interview Timeline Playback</h3>
              <p className="text-[11px] text-slate-400">
                Audit candidate problem-solving progression & detect bulk copy-paste actions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Editor Preview */}
        <div className="flex-1 min-h-[300px] relative bg-slate-950">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              Loading timeline audit events...
            </div>
          ) : logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No keystroke audit events recorded for this session yet.
            </div>
          ) : (
            <div className="h-full p-4 font-mono text-xs text-slate-300 overflow-y-auto whitespace-pre">
              {currentLog?.delta || '// Initial state'}
            </div>
          )}
        </div>

        {/* Timeline Scrubber Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            <button
              onClick={() => setCurrentIndex(0)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset to beginning"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Slider */}
            <div className="flex-1 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={Math.max(logs.length - 1, 0)}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                {currentIndex + 1} / {logs.length}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>
              Event Type: <strong className="text-white">{currentLog?.eventType || 'N/A'}</strong>
            </span>
            <span>
              Length: <strong className="text-white">{currentLog?.codeLength || 0} chars</strong>
            </span>
            <span>
              Time: {currentLog ? new Date(currentLog.timestamp).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
