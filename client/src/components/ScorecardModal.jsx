import React, { useState, useEffect } from 'react';
import api from '../api';
import { Star, Shield, Award, CheckCircle, X, Download, FileText } from 'lucide-react';

export default function ScorecardModal({ sessionId, isOpen, onClose }) {
  const [problemSolving, setProblemSolving] = useState(4);
  const [dsaRating, setDsaRating] = useState(4);
  const [codeQuality, setCodeQuality] = useState(3);
  const [communication, setCommunication] = useState(4);
  const [decision, setDecision] = useState('HIRE');
  const [notes, setNotes] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchScorecard();
    }
  }, [isOpen, sessionId]);

  const fetchScorecard = async () => {
    try {
      const { data } = await api.get(`/scorecards/${sessionId}`);
      if (data.scorecard) {
        setProblemSolving(data.scorecard.problemSolvingRating);
        setDsaRating(data.scorecard.dsaRating);
        setCodeQuality(data.scorecard.codeQualityRating);
        setCommunication(data.scorecard.communicationRating);
        setDecision(data.scorecard.decision);
        setNotes(data.scorecard.notes || '');
        setStrengths(data.scorecard.strengths || '');
        setWeaknesses(data.scorecard.weaknesses || '');
      }
    } catch (err) {
      console.warn('No existing scorecard:', err.message);
    }
  };

  const handleSave = async (submitFinal = false) => {
    setLoading(true);
    try {
      await api.post(`/scorecards/${sessionId}`, {
        problemSolvingRating: problemSolving,
        dsaRating,
        codeQualityRating: codeQuality,
        communicationRating: communication,
        decision,
        notes,
        strengths,
        weaknesses,
        isSubmitted: submitFinal,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      if (submitFinal) {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err) {
      console.error('Failed to save scorecard:', err);
      alert('Failed to save scorecard.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSummary = () => {
    const summary = `# TECHNICAL INTERVIEW EVALUATION REPORT
Session ID: ${sessionId}
Date: ${new Date().toLocaleDateString()}
Final Recommendation: ${decision}

## Competency Ratings (1 to 5):
- Problem Solving & Algorithmic Logic: ${problemSolving}/5
- Data Structures & Efficiency: ${dsaRating}/5
- Code Quality & Clean Architecture: ${codeQuality}/5
- Technical Communication & Articulation: ${communication}/5

## Key Candidate Strengths:
${strengths || 'N/A'}

## Areas for Improvement:
${weaknesses || 'N/A'}

## Private Interviewer Notes:
${notes || 'N/A'}
`;

    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `Interview-Evaluation-${sessionId}.md`;
    a.href = url;
    a.click();
  };

  if (!isOpen) return null;

  const renderStarPicker = (val, setVal, label) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-800">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setVal(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`h-4 w-4 ${
                star <= val ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Candidate Evaluation & Grading Rubric</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Rating Matrix */}
          <div>
            <h4 className="font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Core Competencies (1-5 Stars)
            </h4>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              {renderStarPicker(problemSolving, setProblemSolving, 'Problem Solving & Algorithmic Logic')}
              {renderStarPicker(dsaRating, setDsaRating, 'Data Structures & Algorithmic Complexity')}
              {renderStarPicker(codeQuality, setCodeQuality, 'Code Cleanliness, Modularity & Edge Cases')}
              {renderStarPicker(communication, setCommunication, 'Technical Articulation & Thought Process')}
            </div>
          </div>

          {/* Hire Decision */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Overall Hire Recommendation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'STRONG_HIRE', label: 'Strong Hire', color: 'emerald' },
                { id: 'HIRE', label: 'Hire', color: 'cyan' },
                { id: 'LEANING_HIRE', label: 'Leaning Hire', color: 'blue' },
                { id: 'LEANING_NO_HIRE', label: 'Leaning No Hire', color: 'amber' },
                { id: 'STRONG_NO_HIRE', label: 'Strong No Hire', color: 'rose' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDecision(item.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    decision === item.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Candidate Strengths</label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="e.g. Quickly identified O(n) hash map approach, very clean variable naming..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Areas for Growth</label>
              <textarea
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                placeholder="e.g. Needed hints on empty array edge case handling..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Private Notes */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">
              Private Interviewer Notes (Confidential)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes for recruiting team & debrief committee..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleExportSummary}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Summary Report (.md)
          </button>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Saved!
              </span>
            )}
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              Submit Final Scorecard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
