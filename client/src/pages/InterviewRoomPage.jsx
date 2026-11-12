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
  Volume2,
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
  }, [code, language, problem, sessionId, useCustomInput, customInput]);

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
    setIsExecuting(true);
    setExecutionStatus('QUEUED');
    setTelemetry(null);

    try {
      const payload = {
        problemId: problem?.id,
        sessionId,
        code,
        language,
        isCustomRun: !isSubmit,
        customInput: useCustomInput ? customInput : undefined,
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
    <div className="h-[calc(100vh-3rem)] flex flex-col bg-[#090a0d] text-zinc-200 overflow-hidden font-sans">
      {/* 1. Sleek Top Bar (Breadcrumb + Timer + Actions) */}
      <div className="h-11 border-b border-white/[0.06] bg-[#0d0f14] px-3.5 flex items-center justify-between shrink-0">
        {/* Left: Breadcrumbs & Meta */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Link to="/sessions" className="hover:text-white transition-colors">
              Interviews
            </Link>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <span className="text-zinc-200 font-medium truncate max-w-[200px] sm:max-w-xs">
              {session?.title || problem?.title || 'Sandbox'}
            </span>
          </div>

          <div className="h-3 w-[1px] bg-white/[0.08]" />

          {/* Stopwatch Timer */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] font-mono text-[11px] text-zinc-400">
            <Clock className="h-3 w-3 text-zinc-500" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-[#141720] border border-white/10 rounded px-2 py-0.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="python">Python 3.10</option>
            <option value="javascript">JavaScript (Node 20)</option>
            <option value="cpp">C++17 (GCC 12)</option>
            <option value="java">Java 17 (OpenJDK)</option>
            <option value="go">Go 1.21</option>
          </select>
        </div>

        {/* Right: Tools & Execution Buttons */}
        <div className="flex items-center gap-2">
          {/* Whiteboard Toggle */}
          <button
            onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              isWhiteboardOpen
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Toggle Canvas Whiteboard"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Whiteboard</span>
          </button>

          {/* Video Call PiP Toggle */}
          <button
            onClick={() => setIsVideoDockOpen(!isVideoDockOpen)}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              isVideoDockOpen
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Toggle Video Call"
          >
            <Video className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Video</span>
          </button>

          {/* AI Complexity Review */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="px-2.5 py-1 rounded text-xs font-medium text-zinc-300 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden md:inline">AI Review</span>
          </button>

          {/* Interviewer Scorecard */}
          {isInterviewer && (
            <button
              onClick={() => setIsScorecardOpen(true)}
              className="px-2.5 py-1 rounded text-xs font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 flex items-center gap-1.5 transition-colors"
            >
              <Award className="h-3.5 w-3.5" />
              <span>Scorecard</span>
            </button>
          )}

          {/* Audit Playback */}
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/[0.06] transition-colors"
            title="Timeline Playback"
          >
            <History className="h-3.5 w-3.5" />
          </button>

          <div className="h-3.5 w-[1px] bg-white/[0.08]" />

          {/* Run Code Button */}
          <button
            onClick={() => handleRunOrSubmit(false)}
            disabled={isExecuting}
            className="px-3 py-1 rounded text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Ctrl + Enter"
          >
            <Play className="h-3 w-3 fill-current text-zinc-400" />
            <span>Run</span>
            <kbd className="hidden sm:inline font-mono text-[9px] text-zinc-500 bg-black/40 px-1 rounded ml-0.5">
              ⌘↵
            </kbd>
          </button>

          {/* Submit Button */}
          <button
            onClick={() => handleRunOrSubmit(true)}
            disabled={isExecuting}
            className="px-3.5 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Workbench Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Tasks & Testcases & Chat */}
        <div className="w-full md:w-[440px] lg:w-[480px] border-r border-white/[0.06] flex flex-col shrink-0 bg-[#0c0d12]">
          {/* Tab Navigation */}
          <div className="h-9 flex items-center border-b border-white/[0.06] bg-[#0a0b0e] text-xs px-2 gap-1 shrink-0">
            <button
              onClick={() => setActiveLeftTab('problem')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeLeftTab === 'problem'
                  ? 'text-white bg-white/[0.06]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              Description
            </button>
            <button
              onClick={() => setActiveLeftTab('testcases')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeLeftTab === 'testcases'
                  ? 'text-white bg-white/[0.06]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Test Cases
            </button>
            <button
              onClick={() => setActiveLeftTab('chat')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeLeftTab === 'chat'
                  ? 'text-white bg-white/[0.06]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Room Chat
              {chatMessages.length > 0 && (
                <span className="text-[10px] font-mono px-1 rounded bg-blue-500/20 text-blue-400">
                  {chatMessages.length}
                </span>
              )}
            </button>
          </div>

          {/* Left Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed">
            {activeLeftTab === 'problem' && (
              <div className="space-y-4">
                {problem ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-white tracking-tight">
                        {problem.title}
                      </h2>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-medium ${
                          problem.difficulty === 'EASY'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : problem.difficulty === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {problem.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 pb-2 border-b border-white/[0.06]">
                      <span>Time: {problem.timeLimitMs || 2000}ms</span>
                      <span>•</span>
                      <span>Memory: {problem.memoryLimitMb || 128}MB</span>
                    </div>

                    <div className="text-zinc-300 font-normal leading-relaxed whitespace-pre-wrap">
                      {problem.description}
                    </div>
                  </>
                ) : (
                  <div className="text-zinc-500 py-8 text-center">
                    Select a problem from the Problem Bank.
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'testcases' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
                    Test Case Inputs
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomInput}
                      onChange={(e) => setUseCustomInput(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-blue-500"
                    />
                    Custom Test Case
                  </label>
                </div>

                {useCustomInput ? (
                  <div>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter custom stdin input here..."
                      rows={6}
                      className="w-full bg-[#12141c] border border-white/[0.08] rounded-md p-3 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-1.5">
                      {problem?.testCases?.map((tc, idx) => (
                        <button
                          key={tc.id || idx}
                          onClick={() => setSelectedTestCaseIndex(idx)}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                            selectedTestCaseIndex === idx
                              ? 'bg-blue-600 text-white font-medium'
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
                          <label className="text-zinc-500 block mb-1 text-[11px]">Standard Input (stdin):</label>
                          <div className="bg-[#12141c] p-2.5 rounded border border-white/[0.06] text-zinc-200 whitespace-pre">
                            {problem.testCases[selectedTestCaseIndex].input}
                          </div>
                        </div>

                        <div>
                          <label className="text-zinc-500 block mb-1 text-[11px]">Expected Output (stdout):</label>
                          <div className="bg-[#12141c] p-2.5 rounded border border-white/[0.06] text-emerald-400 whitespace-pre">
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
                <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 text-xs">
                      No messages yet. Send a note or message to the room.
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-md text-xs max-w-[88%] ${
                          msg.user?.id === user?.id
                            ? 'ml-auto bg-blue-600/15 border border-blue-500/25 text-blue-200'
                            : 'bg-white/[0.03] border border-white/[0.06] text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1 text-[10px] text-zinc-500 font-mono">
                          <span>{msg.user?.name || 'Peer'}</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendChat} className="mt-3 pt-3 border-t border-white/[0.06] flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to room..."
                    className="flex-1 bg-[#12141c] border border-white/[0.08] rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Center / Right: Monaco Code Editor & Bottom Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Editor Header Tab Bar */}
          <div className="h-8 border-b border-white/[0.06] bg-[#0b0c10] px-3 flex items-center justify-between text-xs text-zinc-400 font-mono shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-zinc-200">
                solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'go'}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            </div>

            <div className="text-[11px] text-zinc-500">
              {Math.max(activeUsers.length, 1)} collaborator{activeUsers.length > 1 ? 's' : ''} in room
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-[300px] bg-[#090a0d]">
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
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                padding: { top: 10, bottom: 10 },
                tabSize: 4,
                cursorBlinking: 'smooth',
                lineDecorationsWidth: 6,
                renderLineHighlight: 'line',
              }}
            />
          </div>

          {/* Bottom Execution Telemetry Drawer (Developer Terminal Look) */}
          <div className="h-60 border-t border-white/[0.08] bg-[#0b0d13] flex flex-col shrink-0">
            {/* Terminal Tab Bar */}
            <div className="h-8 px-3 border-b border-white/[0.06] flex items-center justify-between bg-[#08090d]">
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  onClick={() => setActiveConsoleTab('results')}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    activeConsoleTab === 'results'
                      ? 'text-white bg-white/[0.08]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Test Results
                </button>
                <button
                  onClick={() => setActiveConsoleTab('stdout')}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    activeConsoleTab === 'stdout'
                      ? 'text-white bg-white/[0.08]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Output (stdout)
                </button>
                <button
                  onClick={() => setActiveConsoleTab('telemetry')}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
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
                  <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-spin" /> Enqueued in Redis
                  </span>
                )}
                {executionStatus === 'PROCESSING' && (
                  <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                    <Cpu className="h-3 w-3 animate-pulse" /> Sandbox Container Running...
                  </span>
                )}
                {executionStatus === 'ACCEPTED' && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> All Test Cases Passed
                  </span>
                )}
                {executionStatus === 'WRONG_ANSWER' && (
                  <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Wrong Answer
                  </span>
                )}
                {executionStatus === 'TIME_LIMIT_EXCEEDED' && (
                  <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Time Limit Exceeded
                  </span>
                )}
                {executionStatus === 'RUNTIME_ERROR' && (
                  <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Runtime Error
                  </span>
                )}
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 overflow-y-auto p-3 text-xs font-mono bg-[#090b10]">
              {!telemetry && !isExecuting && (
                <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
                  Press Run (⌘↵) or Submit to execute code in sandboxed Docker container.
                </div>
              )}

              {isExecuting && (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-400">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Dispatching job to Redis worker queue...</span>
                </div>
              )}

              {telemetry && activeConsoleTab === 'results' && (
                <div className="space-y-2">
                  {telemetry.testCaseResults?.map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              tc.passed ? 'bg-emerald-400' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-semibold text-zinc-200">Test Case {idx + 1}</span>
                          <span className="text-zinc-500">• {tc.executionTimeMs}ms</span>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Output: <span className="text-zinc-200">{tc.actualOutput || '(Empty)'}</span> | Expected: <span className="text-emerald-400">{tc.expectedOutput}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          tc.passed ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {tc.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  ))}
                  {telemetry.stderr && (
                    <div className="p-2 rounded bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs whitespace-pre-wrap">
                      {telemetry.stderr}
                    </div>
                  )}
                </div>
              )}

              {telemetry && activeConsoleTab === 'stdout' && (
                <div className="text-zinc-300 whitespace-pre">
                  {telemetry.stdout || '(Standard output stream is empty)'}
                </div>
              )}

              {telemetry && activeConsoleTab === 'telemetry' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/[0.02] p-2.5 rounded border border-white/[0.06]">
                    <span className="text-zinc-500 text-[10px] block">WALL-CLOCK RUNTIME</span>
                    <span className="text-sm font-bold text-cyan-400">{telemetry.runtimeMs} ms</span>
                  </div>
                  <div className="bg-white/[0.02] p-2.5 rounded border border-white/[0.06]">
                    <span className="text-zinc-500 text-[10px] block">PEAK MEMORY RSS</span>
                    <span className="text-sm font-bold text-purple-400">{telemetry.memoryKb} KB</span>
                  </div>
                  <div className="bg-white/[0.02] p-2.5 rounded border border-white/[0.06]">
                    <span className="text-zinc-500 text-[10px] block">CONTAINER ISOLATION</span>
                    <span className="text-xs font-semibold text-zinc-300">{telemetry.sandboxType}</span>
                  </div>
                  <div className="bg-white/[0.02] p-2.5 rounded border border-white/[0.06]">
                    <span className="text-zinc-500 text-[10px] block">EXIT STATUS</span>
                    <span className="text-xs font-semibold text-emerald-400">Code {telemetry.exitCode}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Floating Picture-in-Picture Video Call Tile */}
          {isVideoDockOpen && (
            <div className="absolute top-10 right-4 z-40 w-80 h-60 rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black/90 backdrop-blur-md flex flex-col">
              <div className="h-7 px-3 bg-zinc-900 border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live Interview Call
                </span>
                <button
                  onClick={() => setIsVideoDockOpen(false)}
                  className="p-1 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex-1">
                <VideoCall sessionId={sessionId} activeUsers={activeUsers} />
              </div>
            </div>
          )}

          {/* Floating Whiteboard Overlay */}
          {isWhiteboardOpen && (
            <div className="absolute inset-4 z-40 rounded-xl overflow-hidden shadow-2xl border border-white/15 bg-black/95 backdrop-blur-md flex flex-col">
              <div className="h-8 px-4 bg-zinc-900 border-b border-white/10 flex items-center justify-between text-xs text-zinc-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <PenTool className="h-3.5 w-3.5 text-blue-400" />
                  Collaborative System Architecture Whiteboard
                </span>
                <button
                  onClick={() => setIsWhiteboardOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white"
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
