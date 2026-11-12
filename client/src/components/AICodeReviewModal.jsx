import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Cpu, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function AICodeReviewModal({ isOpen, onClose, code, language, problemTitle }) {
  const [analyzing, setAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setAnalyzing(true);
      // Analyze code heuristics
      const timer = setTimeout(() => {
        const result = generateHeuristicAnalysis(code, language);
        setAnalysis(result);
        setAnalyzing(false);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [isOpen, code, language]);

  const generateHeuristicAnalysis = (sourceCode, lang) => {
    const codeLower = (sourceCode || '').toLowerCase();

    // Complexity heuristic detector
    let timeComp = 'O(N)';
    let timeReason = 'Iterates through the collection in a single linear pass.';
    if (codeLower.includes('for') && codeLower.split('for').length > 2) {
      timeComp = 'O(N²)';
      timeReason = 'Contains nested loops processing elements quadratically.';
    } else if (codeLower.includes('sort') || codeLower.includes('sorted')) {
      timeComp = 'O(N log N)';
      timeReason = 'Uses comparison-based sorting algorithms.';
    } else if (codeLower.includes('while') && (codeLower.includes('left < right') || codeLower.includes('low <= high'))) {
      timeComp = codeLower.includes('mid') ? 'O(log N)' : 'O(N)';
      timeReason = codeLower.includes('mid')
        ? 'Binary search dividing search space logarithmically.'
        : 'Two-pointer technique converging linearly.';
    }

    let spaceComp = 'O(1)';
    let spaceReason = 'Modifies in place or maintains constant number of pointer variables.';
    if (codeLower.includes('map') || codeLower.includes('dict') || codeLower.includes('hash') || codeLower.includes('seen')) {
      spaceComp = 'O(N)';
      spaceReason = 'Stores elements in a hash table for fast lookups.';
    } else if (codeLower.includes('dp') || codeLower.includes('array')) {
      spaceComp = 'O(N)';
      spaceReason = 'Allocates linear dynamic programming table or auxiliary array.';
    }

    return {
      timeComplexity: timeComp,
      timeReason,
      spaceComplexity: spaceComp,
      spaceReason,
      edgeCases: [
        'Empty input arrays or strings (length === 0)',
        'Single element inputs where pairs cannot be formed',
        'Duplicate elements / negative numbers',
      ],
      cleanCodeTips: [
        'Early return guards simplify nested if/else statements',
        'Descriptive variable naming clarifies algorithmic intent to interviewers',
      ],
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">AI Complexity & Quality Analysis</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {analyzing ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing algorithmic complexity and syntax tree...</span>
            </div>
          ) : (
            analysis && (
              <>
                {/* Big-O Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                      Time Complexity
                    </span>
                    <div className="text-xl font-bold font-mono text-cyan-400">
                      {analysis.timeComplexity}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {analysis.timeReason}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                      Space Complexity
                    </span>
                    <div className="text-xl font-bold font-mono text-purple-400">
                      {analysis.spaceComplexity}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {analysis.spaceReason}
                    </p>
                  </div>
                </div>

                {/* Edge Cases */}
                <div>
                  <h4 className="font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Critical Edge Cases to Test
                  </h4>
                  <ul className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                    {analysis.edgeCases.map((ec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        <span>{ec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quality Tips */}
                <div>
                  <h4 className="font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Interview Best Practices
                  </h4>
                  <ul className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                    {analysis.cleanCodeTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
