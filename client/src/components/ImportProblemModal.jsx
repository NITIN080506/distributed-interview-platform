import React, { useState } from 'react';
import api from '../api';
import {
  X,
  DownloadCloud,
  Globe,
  Package,
  FileCode,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function ImportProblemModal({ isOpen, onClose, onProblemImported }) {
  const [activeTab, setActiveTab] = useState('leetcode'); // 'leetcode' | 'pack' | 'json'
  const [urlOrSlug, setUrlOrSlug] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [importedProblem, setImportedProblem] = useState(null);

  if (!isOpen) return null;

  const handleImportLeetCode = async (slugToUse) => {
    const target = slugToUse || urlOrSlug;
    if (!target.trim()) {
      setError('Please provide a LeetCode problem URL or slug.');
      return;
    }
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { data } = await api.post('/problems/import-leetcode', {
        urlOrSlug: target.trim(),
      });
      setSuccessMessage(data.message || 'Problem imported successfully!');
      setImportedProblem(data.problem);
      setUrlOrSlug('');
      if (onProblemImported) onProblemImported(data.problem);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to import problem from LeetCode.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportPack = async (packId = 'blind75') => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { data } = await api.post('/problems/import-pack', { packId });
      setSuccessMessage(data.message || `Successfully imported curated "${packId}" pack!`);
      if (onProblemImported) onProblemImported();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to import problem pack.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportJson = async () => {
    if (!jsonInput.trim()) {
      setError('Please paste JSON problem data.');
      return;
    }
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const parsed = JSON.parse(jsonInput);
      const problemsArray = Array.isArray(parsed) ? parsed : [parsed];
      const { data } = await api.post('/problems/import-json', {
        problems: problemsArray,
      });
      setSuccessMessage(data.message || 'Custom problems imported successfully!');
      setJsonInput('');
      if (onProblemImported) onProblemImported();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid JSON format.');
    } finally {
      setLoading(false);
    }
  };

  const quickLeetCodeExamples = [
    { name: 'Invert Binary Tree', slug: 'invert-binary-tree' },
    { name: 'Reverse Linked List', slug: 'reverse-linked-list' },
    { name: 'Valid Palindrome', slug: 'valid-palindrome' },
    { name: 'Climbing Stairs', slug: 'climbing-stairs' },
    { name: 'Maximum Subarray', slug: 'maximum-subarray' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <DownloadCloud className="h-6 w-6 text-blue-500" />
              Import Algorithmic Problems
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Enrich the problem bank instantly from LeetCode or curated interview packs — no interviewer account needed.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-white/[0.08] bg-[#0c101b] px-6">
          <button
            onClick={() => { setActiveTab('leetcode'); setError(''); setSuccessMessage(''); }}
            className={`py-3.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'leetcode'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="h-4 w-4" />
            LeetCode URL / Slug
          </button>
          <button
            onClick={() => { setActiveTab('pack'); setError(''); setSuccessMessage(''); }}
            className={`py-3.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'pack'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="h-4 w-4" />
            1-Click Curated Packs
          </button>
          <button
            onClick={() => { setActiveTab('json'); setError(''); setSuccessMessage(''); }}
            className={`py-3.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'json'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode className="h-4 w-4" />
            JSON Batch Import
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
              {importedProblem && (
                <a
                  href={`/room/practice-${importedProblem.id}?problemId=${importedProblem.id}`}
                  className="font-bold underline text-white hover:text-emerald-200 ml-3"
                >
                  Solve Now →
                </a>
              )}
            </div>
          )}

          {/* TAB 1: LEETCODE URL / SLUG */}
          {activeTab === 'leetcode' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                  LeetCode Problem URL or Slug
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlOrSlug}
                    onChange={(e) => setUrlOrSlug(e.target.value)}
                    placeholder="e.g. https://leetcode.com/problems/invert-binary-tree/ or invert-binary-tree"
                    className="flex-1 h-11 bg-[#090d16] border border-white/10 rounded-xl px-4 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleImportLeetCode()}
                  />
                  <button
                    onClick={() => handleImportLeetCode()}
                    disabled={loading}
                    className="btn-primary py-2 px-5 text-xs font-semibold shrink-0 disabled:opacity-50"
                  >
                    {loading ? 'Fetching...' : 'Import'}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block mb-2 font-medium">Or 1-click popular LeetCode questions:</span>
                <div className="flex flex-wrap gap-2">
                  {quickLeetCodeExamples.map((ex) => (
                    <button
                      key={ex.slug}
                      onClick={() => {
                        setUrlOrSlug(ex.slug);
                        handleImportLeetCode(ex.slug);
                      }}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors"
                    >
                      + {ex.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-zinc-300 space-y-1">
                <div className="font-semibold text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Automatic Multi-Language Synthesis
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Imports title, clean markdown problem description, difficulty tag, sample and hidden test cases, plus starter code templates for Python, JavaScript, C++, Java, and Go.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: 1-CLICK CURATED PACKS */}
          {activeTab === 'pack' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#0d121f] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                      75
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">Blind 75 Essentials Pack</h3>
                      <p className="text-xs text-zinc-400">
                        Top interview problems with complete test cases, starter code in 5 languages, and constraints.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleImportPack('blind75')}
                    disabled={loading}
                    className="btn-primary py-2 px-4 text-xs font-semibold disabled:opacity-50 shrink-0"
                  >
                    {loading ? 'Importing Pack...' : 'Import Pack (1-Click)'}
                  </button>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5 text-[11px] font-mono text-zinc-400">
                  <span className="px-2 py-0.5 rounded bg-white/[0.04]">Valid Palindrome</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.04]">Best Time to Buy & Sell Stock</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.04]">Contains Duplicate</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.04]">Maximum Subarray</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.04]">Climbing Stairs</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM JSON */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                JSON Problem Schema Definition
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={8}
                placeholder={`[
  {
    "title": "Fibonacci Number",
    "difficulty": "EASY",
    "tags": ["Math", "Dynamic Programming"],
    "description": "The Fibonacci numbers, commonly denoted F(n) form a sequence...",
    "testCases": [
      { "input": "2", "expectedOutput": "1" },
      { "input": "3", "expectedOutput": "2" }
    ]
  }
]`}
                className="w-full bg-[#090d16] border border-white/10 rounded-xl p-3.5 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
              <button
                onClick={handleImportJson}
                disabled={loading}
                className="btn-primary py-2 px-5 text-xs font-semibold disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import JSON Batch'}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0c101b] flex justify-end">
          <button
            onClick={onClose}
            className="btn-ghost py-1.5 px-4 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
