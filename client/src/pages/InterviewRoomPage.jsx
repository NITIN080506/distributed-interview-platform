import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Whiteboard from '../components/Whiteboard';
import VideoCall from '../components/VideoCall';
import ScorecardModal from '../components/ScorecardModal';
import AICodeReviewModal from '../components/AICodeReviewModal';
import AuditPlaybackModal from '../components/AuditPlaybackModal';
import {
  Play,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  Cpu,
  Terminal,
  FileCode,
  MessageSquare,
  Sparkles,
  PenTool,
  Video,
  Award,
  History,
  Send,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Shield,
  Layers,
  Copy,
} from 'lucide-react';

const STARTER_TEMPLATES = {
  python: `# Distributed Code Execution Sandbox
# Language: Python 3.10

import sys

def solve():
    input_data = sys.stdin.read().strip()
    print("Output: " + input_data)

if __name__ == "__main__":
    solve()
`,
  javascript: `// Distributed Code Execution Sandbox
// Language: Node.js 20

const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  console.log("Output: " + input);
}

solve();
`,
  cpp: `// Distributed Code Execution Sandbox
// Language: C++17 (GCC 12)

#include <iostream>
#include <string>

using namespace std;

int main() {
    string input;
    if (cin >> input) {
        cout << "Output: " << input << endl;
    }
    return 0;
}
`,
  java: `// Distributed Code Execution Sandbox
// Language: OpenJDK 17

import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNext()) {
            System.out.println("Output: " + sc.next());
        }
    }
}
`,
  go: `// Distributed Code Execution Sandbox
// Language: Go 1.21

package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    if scanner.Scan() {
        fmt.Println("Output: " + scanner.Text())
    }
}
`,
};

export default function InterviewRoomPage() {
  const { id: sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const problemIdFromQuery = searchParams.get('problemId');

  const { user, isInterviewer } = useAuth();
  const { socket, joinRoom, sendCodeChange, sendLanguageChange, sendChatMessage } = useSocket();

  // State
  const [session, setSession] = useState(null);
  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(STARTER_TEMPLATES.python);
  const [activeLeftTab, setActiveLeftTab] = useState('problem'); // 'problem' | 'testcases' | 'chat'

  // Overlays / Floating Panels
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isVideoDockOpen, setIsVideoDockOpen] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Test cases & Custom input
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);

  // Execution & Telemetry
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState('results'); // 'results' | 'stdout' | 'telemetry'

  // Presence & Chat
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Interview Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const isRemoteUpdate = useRef(false);

  // Keep latest state in ref to avoid stale closure during keyboard shortcuts
  const latestStateRef = useRef({});
  latestStateRef.current = { code, language, problem, sessionId, useCustomInput, customInput };

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Fetch Session or Problem Details
  useEffect(() => {
    const initData = async () => {
      try {
        if (sessionId && !sessionId.startsWith('practice-')) {
          const { data } = await api.get(`/sessions/${sessionId}`);
          setSession(data.session);
          if (data.session.problem) {
            setProblem(data.session.problem);
          }
          if (data.session.language) {
            setLanguage(data.session.language);
          }
          if (data.session.code) {
            setCode(data.session.code);
          } else if (data.session.problem?.starterCodes?.[data.session.language]) {
            setCode(data.session.problem.starterCodes[data.session.language]);
          }
        } else {
          const probId = problemIdFromQuery || sessionId.replace('practice-', '');
          const { data } = await api.get(`/problems/${probId}`);
          setProblem(data.problem);
          if (data.problem.starterCodes?.[language]) {
            setCode(data.problem.starterCodes[language]);
          }
        }
      } catch (err) {
        console.error('Failed to load session/problem:', err);
      }
    };

    initData();
  }, [sessionId, problemIdFromQuery]);

  // 2. Setup WebSockets
  useEffect(() => {
    if (!socket || !sessionId) return;

    joinRoom(sessionId, user || { id: 'anon', name: 'Developer', role: 'CANDIDATE' });

    socket.on('active-users', (users) => {
      setActiveUsers(users);
    });

    socket.on('code-update', (data) => {
      if (data.code !== undefined && data.code !== code) {
        isRemoteUpdate.current = true;
        setCode(data.code);
      }
    });

    socket.on('language-update', (data) => {
      if (data.language) {
        setLanguage(data.language);
        if (data.code) {
          isRemoteUpdate.current = true;
          setCode(data.code);
        }
      }
    });

    socket.on('submission-telemetry', (data) => {
      if (data.status === 'PROCESSING') {
        setExecutionStatus('PROCESSING');
      } else if (data.telemetry) {
        setIsExecuting(false);
        setExecutionStatus(data.status);
        setTelemetry(data.telemetry);
      }
    });

    socket.on('new-chat-message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('active-users');
      socket.off('code-update');
      socket.off('language-update');
      socket.off('submission-telemetry');
      socket.off('new-chat-message');
    };
  }, [socket, sessionId, user]);

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to Run
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunOrSubmit(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEditorChange = (value) => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    const newCode = value || '';
    setCode(newCode);
    sendCodeChange(sessionId, newCode, language);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    let newCode = STARTER_TEMPLATES[newLang] || '';
    if (problem?.starterCodes?.[newLang]) {
      newCode = problem.starterCodes[newLang];
    }
    setCode(newCode);
    sendLanguageChange(sessionId, newLang, newCode);
  };

  const handleRunOrSubmit = async (isSubmit = false) => {
    const current = latestStateRef.current;
    setIsExecuting(true);
    setExecutionStatus('QUEUED');
    setTelemetry(null);

    try {
      const payload = {
        problemId: current.problem?.id,
        sessionId: current.sessionId,
        code: current.code,
        language: current.language,
        isCustomRun: !isSubmit,
        customInput: current.useCustomInput ? current.customInput : undefined,
      };

      const { data } = await api.post('/submissions', payload);

      const checkInterval = setInterval(async () => {
        try {
          const res = await api.get(`/submissions/${data.submissionId}`);
          if (
            res.data.submission?.status &&
            res.data.submission.status !== 'QUEUED' &&
            res.data.submission.status !== 'PROCESSING'
          ) {
            clearInterval(checkInterval);
            setIsExecuting(false);
            setExecutionStatus(res.data.submission.status);
            setTelemetry(res.data.submission.telemetry);
          }
        } catch (_) {}
      }, 800);

      setTimeout(() => clearInterval(checkInterval), 15000);
    } catch (err) {
      setIsExecuting(false);
      setExecutionStatus('RUNTIME_ERROR');
      setTelemetry({
        stderr: err.response?.data?.error || err.message,
        stdout: '',
        runtimeMs: 0,
        memoryKb: 0,
        testCaseResults: [],
      });
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(sessionId, chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#0a0e1a] text-zinc-100 overflow-hidden font-sans select-none">
      {/* ── Top Toolbar (Professional IDE Workspace Bar) ── */}
      <div className="h-14 border-b border-white/[0.08] bg-[#0c101c] px-4 flex items-center justify-between shrink-0 shadow-sm">
        {/* Left: Breadcrumbs & Meta */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Link to="/sessions" className="hover:text-white transition-colors font-medium">
              Interviews
            </Link>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
            <span className="text-white font-semibold truncate max-w-[200px] sm:max-w-xs">
              {session?.title || problem?.title || 'Interactive Sandbox'}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/[0.1]" />

          {/* Stopwatch Timer */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.08] font-mono text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="h-8 bg-[#131929] border border-white/10 rounded-lg px-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
          >
            <option value="python">Python 3.10</option>
            <option value="javascript">JavaScript (Node 20)</option>
            <option value="cpp">C++17 (GCC 12)</option>
            <option value="java">Java 17 (OpenJDK)</option>
            <option value="go">Go 1.21</option>
          </select>
        </div>

        {/* Right: Tools & Execution Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Whiteboard Toggle */}
          <button
            onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isWhiteboardOpen
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:text-white hover:bg-white/[0.08]'
            }`}
            title="Toggle Architecture Whiteboard"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Whiteboard</span>
          </button>

          {/* Video Call PiP Toggle */}
          <button
            onClick={() => setIsVideoDockOpen(!isVideoDockOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isVideoDockOpen
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:text-white hover:bg-white/[0.08]'
            }`}
            title="Toggle WebRTC Video Call"
          >
            <Video className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Video Call</span>
          </button>

          {/* AI Complexity Review */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden md:inline">AI Review</span>
          </button>

          {/* Interviewer Scorecard */}
          {isInterviewer && (
            <button
              onClick={() => setIsScorecardOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Award className="h-3.5 w-3.5" />
              <span>Scorecard</span>
            </button>
          )}

          {/* Audit Playback */}
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
            title="Keystroke Timeline Playback"
          >
            <History className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-white/[0.1]" />

          {/* Run Code Button */}
          <button
            onClick={() => handleRunOrSubmit(false)}
            disabled={isExecuting}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.1] flex items-center gap-2 transition-all disabled:opacity-50"
            title="Ctrl + Enter / Cmd + Enter"
          >
            <Play className="h-3.5 w-3.5 fill-current text-blue-400" />
            <span>Run</span>
            <kbd className="hidden sm:inline font-mono text-[10px] text-zinc-400 bg-black/40 px-1.5 py-0.5 rounded">
              ⌘↵
            </kbd>
          </button>

          {/* Submit Button */}
          <button
            onClick={() => handleRunOrSubmit(true)}
            disabled={isExecuting}
            className="btn-primary py-1.5 px-4 text-xs font-semibold disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-1.5" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Workspace Body ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Tasks & Testcases & Chat */}
        <div className="w-full md:w-[460px] lg:w-[500px] border-r border-white/[0.08] flex flex-col shrink-0 bg-[#0c101c] select-text">
          {/* Tab Navigation */}
          <div className="h-10 flex items-center border-b border-white/[0.08] bg-[#090d18] px-3 gap-2 shrink-0">
            <button
              onClick={() => setActiveLeftTab('problem')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeLeftTab === 'problem'
                  ? 'text-white bg-white/[0.08] text-blue-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="h-4 w-4" />
              Description
            </button>
            <button
              onClick={() => setActiveLeftTab('testcases')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeLeftTab === 'testcases'
                  ? 'text-white bg-white/[0.08] text-blue-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="h-4 w-4" />
              Test Cases
            </button>
            <button
              onClick={() => setActiveLeftTab('chat')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeLeftTab === 'chat'
                  ? 'text-white bg-white/[0.08] text-blue-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Room Chat
              {chatMessages.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                  {chatMessages.length}
                </span>
              )}
            </button>
          </div>

          {/* Left Panel Content */}
          <div className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed">
            {activeLeftTab === 'problem' && (
              <div className="space-y-5">
                {problem ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        {problem.title}
                      </h2>
                      <span
                        className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full border font-semibold ${
                          problem.difficulty === 'EASY'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : problem.difficulty === 'MEDIUM'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {problem.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 pb-3 border-b border-white/[0.08]">
                      <span>Time: <strong className="text-zinc-200">{problem.timeLimitMs || 2000}ms</strong></span>
                      <span>•</span>
                      <span>Memory: <strong className="text-zinc-200">{problem.memoryLimitMb || 128}MB</strong></span>
                      <span>•</span>
                      <span>Isolation: <strong className="text-emerald-400">Docker</strong></span>
                    </div>

                    <div className="text-zinc-300 font-normal leading-relaxed whitespace-pre-wrap text-sm">
                      {problem.description}
                    </div>
                  </>
                ) : (
                  <div className="text-zinc-500 py-12 text-center">
                    Select a challenge from the Problem Bank to begin.
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'testcases' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Test Case Inputs
                  </span>
                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomInput}
                      onChange={(e) => setUseCustomInput(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-blue-500 h-4 w-4"
                    />
                    Custom Standard Input
                  </label>
                </div>

                {useCustomInput ? (
                  <div>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter custom stdin input here..."
                      rows={8}
                      className="w-full bg-[#111625] border border-white/10 rounded-xl p-4 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {problem?.testCases?.map((tc, idx) => (
                        <button
                          key={tc.id || idx}
                          onClick={() => setSelectedTestCaseIndex(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                            selectedTestCaseIndex === idx
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                          }`}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                    </div>

                    {problem?.testCases?.[selectedTestCaseIndex] && (
                      <div className="space-y-3 font-mono text-xs">
                        <div>
                          <label className="text-zinc-400 block mb-1.5 text-xs font-semibold uppercase">
                            Standard Input (stdin):
                          </label>
                          <div className="bg-[#111625] p-3 rounded-xl border border-white/[0.08] text-zinc-200 whitespace-pre">
                            {problem.testCases[selectedTestCaseIndex].input}
                          </div>
                        </div>

                        <div>
                          <label className="text-zinc-400 block mb-1.5 text-xs font-semibold uppercase">
                            Expected Output (stdout):
                          </label>
                          <div className="bg-[#111625] p-3 rounded-xl border border-white/[0.08] text-emerald-400 whitespace-pre">
                            {problem.testCases[selectedTestCaseIndex].expectedOutput}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'chat' && (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-16rem)] pr-1">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                      No messages yet. Send a note or message to the interview room.
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl text-xs max-w-[88%] ${
                          msg.user?.id === user?.id
                            ? 'ml-auto bg-blue-600/20 border border-blue-500/30 text-blue-100'
                            : 'bg-white/[0.04] border border-white/[0.08] text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1 text-[11px] text-zinc-400 font-mono">
                          <span className="font-semibold">{msg.user?.name || 'Peer'}</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendChat} className="mt-4 pt-3 border-t border-white/[0.08] flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to room..."
                    className="flex-1 bg-[#111625] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Center / Right: Monaco Code Editor & Bottom Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Editor Header Tab Bar */}
          <div className="h-10 border-b border-white/[0.08] bg-[#0a0e1a] px-4 flex items-center justify-between text-xs text-zinc-400 font-mono shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-zinc-100 font-semibold flex items-center gap-2">
                <FileCode className="h-4 w-4 text-blue-400" />
                solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'go'}
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" title="Synchronized" />
            </div>

            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span>{Math.max(activeUsers.length, 1)} collaborator{activeUsers.length > 1 ? 's' : ''} live</span>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-[300px] bg-[#080b14] select-text">
            <Editor
              height="100%"
              language={
                language === 'cpp'
                  ? 'cpp'
                  : language === 'java'
                  ? 'java'
                  : language === 'go'
                  ? 'go'
                  : language
              }
              value={code}
              theme="vs-dark"
              onChange={handleEditorChange}
              options={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                tabSize: 4,
                cursorBlinking: 'smooth',
                lineDecorationsWidth: 6,
                renderLineHighlight: 'line',
              }}
            />
          </div>

          {/* Bottom Execution Telemetry Drawer */}
          <div className="h-64 border-t border-white/[0.08] bg-[#0c101c] flex flex-col shrink-0 select-text">
            {/* Terminal Tab Bar */}
            <div className="h-10 px-4 border-b border-white/[0.08] flex items-center justify-between bg-[#090d18]">
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={() => setActiveConsoleTab('results')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                    activeConsoleTab === 'results'
                      ? 'text-white bg-white/[0.08]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Test Results
                </button>
                <button
                  onClick={() => setActiveConsoleTab('stdout')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                    activeConsoleTab === 'stdout'
                      ? 'text-white bg-white/[0.08]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Output (stdout)
                </button>
                <button
                  onClick={() => setActiveConsoleTab('telemetry')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                    activeConsoleTab === 'telemetry'
                      ? 'text-white bg-white/[0.08]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Container Telemetry
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {executionStatus === 'QUEUED' && (
                  <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5 font-semibold">
                    <Clock className="h-3.5 w-3.5 animate-spin" /> Enqueued in Redis
                  </span>
                )}
                {executionStatus === 'PROCESSING' && (
                  <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 font-semibold">
                    <Cpu className="h-3.5 w-3.5 animate-pulse" /> Sandbox Container Running...
                  </span>
                )}
                {executionStatus === 'ACCEPTED' && (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All Test Cases Passed
                  </span>
                )}
                {executionStatus === 'WRONG_ANSWER' && (
                  <span className="text-xs font-mono text-rose-400 flex items-center gap-1.5 font-semibold">
                    <XCircle className="h-3.5 w-3.5" /> Wrong Answer
                  </span>
                )}
                {executionStatus === 'TIME_LIMIT_EXCEEDED' && (
                  <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5 font-semibold">
                    <Clock className="h-3.5 w-3.5" /> Time Limit Exceeded
                  </span>
                )}
                {executionStatus === 'RUNTIME_ERROR' && (
                  <span className="text-xs font-mono text-rose-400 flex items-center gap-1.5 font-semibold">
                    <XCircle className="h-3.5 w-3.5" /> Runtime Error
                  </span>
                )}
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono bg-[#080b14]">
              {!telemetry && !isExecuting && (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                  Press Run (⌘↵) or Submit to evaluate code in isolated Docker sandbox.
                </div>
              )}

              {isExecuting && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-300">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Dispatching job to Redis worker queue...</span>
                </div>
              )}

              {telemetry && activeConsoleTab === 'results' && (
                <div className="space-y-3">
                  {telemetry.testCaseResults?.map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-start justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              tc.passed ? 'bg-emerald-400' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-bold text-white text-sm">Test Case {idx + 1}</span>
                          <span className="text-zinc-500">• {tc.executionTimeMs}ms</span>
                        </div>
                        <div className="text-xs text-zinc-400">
                          Output: <span className="text-zinc-100 font-semibold">{tc.actualOutput || '(Empty)'}</span> | Expected: <span className="text-emerald-400 font-semibold">{tc.expectedOutput}</span>
                        </div>
                      </div>
                      <span
                        className={`text-xs uppercase font-bold px-2 py-0.5 rounded-md ${
                          tc.passed ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'
                        }`}
                      >
                        {tc.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  ))}
                  {telemetry.stderr && (
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs whitespace-pre-wrap leading-relaxed">
                      {telemetry.stderr}
                    </div>
                  )}
                </div>
              )}

              {telemetry && activeConsoleTab === 'stdout' && (
                <div className="text-zinc-200 whitespace-pre leading-relaxed">
                  {telemetry.stdout || '(Standard output stream is empty)'}
                </div>
              )}

              {telemetry && activeConsoleTab === 'telemetry' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/[0.08]">
                    <span className="text-zinc-500 text-xs block font-semibold mb-1">WALL-CLOCK RUNTIME</span>
                    <span className="text-base font-bold text-cyan-400">{telemetry.runtimeMs} ms</span>
                  </div>
                  <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/[0.08]">
                    <span className="text-zinc-500 text-xs block font-semibold mb-1">PEAK MEMORY RSS</span>
                    <span className="text-base font-bold text-purple-400">{telemetry.memoryKb} KB</span>
                  </div>
                  <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/[0.08]">
                    <span className="text-zinc-500 text-xs block font-semibold mb-1">CONTAINER ISOLATION</span>
                    <span className="text-xs font-semibold text-emerald-400">{telemetry.sandboxType}</span>
                  </div>
                  <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/[0.08]">
                    <span className="text-zinc-500 text-xs block font-semibold mb-1">EXIT STATUS</span>
                    <span className="text-xs font-semibold text-zinc-100">Code {telemetry.exitCode}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Floating Picture-in-Picture Video Call Tile */}
          {isVideoDockOpen && (
            <div className="absolute top-12 right-6 z-40 w-88 h-68 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black/95 backdrop-blur-xl flex flex-col">
              <div className="h-9 px-4 bg-zinc-900/90 border-b border-white/10 flex items-center justify-between text-xs text-zinc-200">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live WebRTC Video Call
                </span>
                <button
                  onClick={() => setIsVideoDockOpen(false)}
                  className="p-1 hover:text-white rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1">
                <VideoCall sessionId={sessionId} activeUsers={activeUsers} />
              </div>
            </div>
          )}

          {/* Floating Whiteboard Overlay */}
          {isWhiteboardOpen && (
            <div className="absolute inset-4 z-40 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black/95 backdrop-blur-xl flex flex-col">
              <div className="h-10 px-5 bg-zinc-900 border-b border-white/10 flex items-center justify-between text-sm text-zinc-200">
                <span className="font-bold flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-blue-400" />
                  Collaborative System Architecture Whiteboard
                </span>
                <button
                  onClick={() => setIsWhiteboardOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1">
                <Whiteboard sessionId={sessionId} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ScorecardModal
        sessionId={sessionId}
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
      />
      <AICodeReviewModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        code={code}
        language={language}
        problemTitle={problem?.title}
      />
      <AuditPlaybackModal
        sessionId={sessionId}
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        language={language}
      />
    </div>
  );
}
