import React, { useState } from 'react';
import { getInterpretation } from '../../utils/interpretationEngine';
import { Icons } from './Icons';

export const InterpretationPanel = ({ metricName, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const interpretation = getInterpretation(metricName);

  return (
    <div className={`relative ${className}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5"
        title={`Understand ${metricName}`}
      >
        <Icons.Info className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-[#111827] border border-white/10 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Icons.Lightbulb className="w-4 h-4 text-indigo-400" />
              {metricName}
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <span className="text-xl leading-none">&times;</span>
            </button>
          </div>
          
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">What is this?</span>
              <p className="text-gray-300">{interpretation.what}</p>
            </div>
            <div>
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">How is it calculated?</span>
              <p className="text-gray-300">{interpretation.how}</p>
            </div>
            <div>
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Why does it matter?</span>
              <p className="text-gray-300">{interpretation.why}</p>
            </div>
            <div className="flex gap-4 border-t border-white/5 pt-2 mt-2">
              <div className="flex-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Confidence</span>
                <p className="text-gray-300">{interpretation.confidence}</p>
              </div>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5 mt-2">
              <span className="text-white font-bold uppercase tracking-wider text-[10px] block mb-1 flex items-center gap-1">
                <Icons.Target className="w-3 h-3 text-cyan-400" /> Recommendation
              </span>
              <p className="text-gray-300">{interpretation.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
