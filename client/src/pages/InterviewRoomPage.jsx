import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Users,
  Send,
  MessageSquare,
  FileCode,
  Check,
  RotateCcw,
  Terminal,
  Shield,
  Layers,
  Sparkles,
  PenTool,
  Video,
  Award,
  History,
  FileCheck2,
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
  const [activeLeftTab, setActiveLeftTab] = useState('problem'); // 'problem' | 'testcases' | 'chat' | 'whiteboard' | 'video'
  
  // Modals
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
  const [activeTelemetryTab, setActiveTelemetryTab] = useState(0);

  // Presence & Chat
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const isRemoteUpdate = useRef(false);

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
          // Direct problem practice mode
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

  // 2. Setup WebSockets Room and Listeners
  useEffect(() => {
    if (!socket || !sessionId) return;

    joinRoom(sessionId, user || { id: 'anon', name: 'Guest Developer', role: 'CANDIDATE' });

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
      }, 1000);

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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#0b0f17] text-slate-200 overflow-hidden">
      {/* Top Action Bar */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
              {session?.title || problem?.title || 'Collaborative Coding Sandbox'}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="python">Python 3.10</option>
            <option value="javascript">JavaScript (Node 20)</option>
            <option value="cpp">C++17 (GCC 12)</option>
            <option value="java">Java 17 (OpenJDK)</option>
            <option value="go">Go 1.21</option>
          </select>
        </div>

        {/* Right Tools & Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* AI Code Review Trigger */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Inspect Algorithmic Time & Space Complexity"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI Review</span>
          </button>

          {/* Audit Playback Trigger */}
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Replay candidate typing history"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </button>

          {/* Interviewer Scorecard Trigger */}
          {isInterviewer && (
            <button
              onClick={() => setIsScorecardOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Award className="h-3.5 w-3.5 text-purple-400" />
              <span>Scorecard</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Run Code */}
          <button
            onClick={() => handleRunOrSubmit(false)}
            disabled={isExecuting}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current text-slate-400" />
            <span>Run</span>
          </button>

          {/* Submit Code */}
          <button
            onClick={() => handleRunOrSubmit(true)}
            disabled={isExecuting}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Tabs (Problem | Testcases | Whiteboard | Video Call | Chat) */}
        <div className="w-full md:w-[480px] lg:w-[540px] border-r border-slate-800 flex flex-col shrink-0 bg-slate-950/50">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900/60 text-xs font-medium px-2 overflow-x-auto">
            <button
              onClick={() => setActiveLeftTab('problem')}
              className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeLeftTab === 'problem'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              Task
            </button>
            <button
              onClick={() => setActiveLeftTab('testcases')}
              className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeLeftTab === 'testcases'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Test Cases
            </button>
            <button
              onClick={() => setActiveLeftTab('whiteboard')}
              className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeLeftTab === 'whiteboard'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              Whiteboard
            </button>
            <button
              onClick={() => setActiveLeftTab('video')}
              className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeLeftTab === 'video'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              Call
            </button>
            <button
              onClick={() => setActiveLeftTab('chat')}
              className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeLeftTab === 'chat'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
              {chatMessages.length > 0 && (
                <span className="h-4 w-4 rounded-full bg-blue-600 text-[10px] text-white flex items-center justify-center font-mono">
                  {chatMessages.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed">
            {activeLeftTab === 'problem' && (
              <div className="space-y-4">
                {problem ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white">{problem.title}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {problem.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400 py-2 border-y border-slate-800">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        Time: {problem.timeLimitMs || 2000}ms
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3.5 w-3.5 text-slate-500" />
                        Memory: {problem.memoryLimitMb || 128}MB
                      </span>
                    </div>

                    <div className="text-slate-300 whitespace-pre-wrap font-sans text-sm">
                      {problem.description}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 py-8 text-center">
                    Select a problem from the Problem Bank or paste your task instructions here.
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'testcases' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Test Case Inputs
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomInput}
                      onChange={(e) => setUseCustomInput(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-600"
                    />
                    Custom Input
                  </label>
                </div>

                {useCustomInput ? (
                  <div>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter custom stdin input here..."
                      rows={6}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {problem?.testCases?.map((tc, idx) => (
                        <button
                          key={tc.id || idx}
                          onClick={() => setSelectedTestCaseIndex(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                            selectedTestCaseIndex === idx
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                    </div>

                    {problem?.testCases?.[selectedTestCaseIndex] && (
                      <div className="space-y-3 font-mono text-xs">
                        <div>
                          <label className="text-slate-500 block mb-1">Standard Input (stdin):</label>
                          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-200 whitespace-pre">
                            {problem.testCases[selectedTestCaseIndex].input}
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-500 block mb-1">Expected Output (stdout):</label>
                          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-emerald-400 whitespace-pre">
                            {problem.testCases[selectedTestCaseIndex].expectedOutput}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'whiteboard' && (
              <div className="h-[calc(100vh-10rem)]">
                <Whiteboard sessionId={sessionId} />
              </div>
            )}

            {activeLeftTab === 'video' && (
              <div className="h-[calc(100vh-10rem)]">
                <VideoCall sessionId={sessionId} activeUsers={activeUsers} />
              </div>
            )}

            {activeLeftTab === 'chat' && (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No messages yet. Send a message to chat in real-time with the interviewer/candidate.
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                          msg.user?.id === user?.id
                            ? 'ml-auto bg-blue-600/20 border border-blue-500/30 text-blue-200'
                            : 'bg-slate-900 border border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1 text-[10px] text-slate-400 font-mono">
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

                <form onSubmit={handleSendChat} className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to room..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Monaco Editor & Live Execution Console */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[300px]">
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
                padding: { top: 12, bottom: 12 },
                tabSize: 4,
              }}
            />
          </div>

          {/* Bottom Execution Telemetry Drawer */}
          <div className="h-64 border-t border-slate-800 bg-[#0f172a] flex flex-col shrink-0">
            <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-blue-400" />
                  Sandbox Execution Telemetry
                </span>

                {executionStatus === 'QUEUED' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-spin" /> Queued in Redis
                  </span>
                )}
                {executionStatus === 'PROCESSING' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                    <Cpu className="h-3 w-3 animate-pulse" /> Running in Docker Sandbox...
                  </span>
                )}
                {executionStatus === 'ACCEPTED' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Accepted
                  </span>
                )}
                {executionStatus === 'WRONG_ANSWER' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Wrong Answer
                  </span>
                )}
                {executionStatus === 'TIME_LIMIT_EXCEEDED' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Time Limit Exceeded (TLE)
                  </span>
                )}
                {executionStatus === 'RUNTIME_ERROR' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Runtime Error
                  </span>
                )}
              </div>

              {telemetry && (
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    <Clock className="h-3 w-3 text-cyan-400" />
                    {telemetry.runtimeMs} ms
                  </span>
                  <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    <HardDrive className="h-3 w-3 text-purple-400" />
                    {telemetry.memoryKb} KB
                  </span>
                  <span className="hidden sm:inline bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                    {telemetry.sandboxType || 'Docker Isolated Container'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
              {!telemetry && !isExecuting && (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Click "Run" or "Submit" to dispatch execution to the Docker sandbox worker.
                </div>
              )}

              {isExecuting && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating code in sandboxed Docker container...</span>
                </div>
              )}

              {telemetry && (
                <div className="space-y-3">
                  {telemetry.testCaseResults && telemetry.testCaseResults.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {telemetry.testCaseResults.map((tc, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveTelemetryTab(idx)}
                            className={`px-3 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 transition-colors ${
                              activeTelemetryTab === idx
                                ? 'bg-slate-800 text-white border border-slate-700'
                                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/50'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                tc.passed ? 'bg-emerald-400' : 'bg-rose-500'
                              }`}
                            />
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>

                      {telemetry.testCaseResults[activeTelemetryTab] && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                          <div>
                            <span className="text-slate-500 block mb-1 font-semibold">Your Output:</span>
                            <pre className="text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre">
                              {telemetry.testCaseResults[activeTelemetryTab].actualOutput || '(Empty stdout)'}
                            </pre>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-1 font-semibold">Expected Output:</span>
                            <pre className="text-emerald-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre">
                              {telemetry.testCaseResults[activeTelemetryTab].expectedOutput}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {telemetry.stderr && (
                    <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-xl text-rose-300">
                      <span className="font-semibold block mb-1">Standard Error (stderr):</span>
                      <pre className="whitespace-pre-wrap">{telemetry.stderr}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
