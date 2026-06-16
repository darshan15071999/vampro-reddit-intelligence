import React, { useState } from 'react';

export const LLMVisibilityTrendChart = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return <div className="text-gray-500 h-full flex items-center justify-center font-mono text-sm">No trend data available</div>;

  const maxScore = 100, chartWidth = 100, chartHeight = 80;
  const spacing = chartWidth / data.length;
  const barWidth = Math.max(1.5, spacing * 0.6);

  return (
    <div className="relative w-full h-[180px] pt-8 pb-2">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barHeight = (d.llmScore / maxScore) * chartHeight;
          const x = i * spacing + (spacing - barWidth) / 2;
          const y = chartHeight - barHeight;
          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <rect x={x - (spacing - barWidth) / 2} y={0} width={spacing} height={chartHeight} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="1"
                fill={hoveredIdx === i ? "#06B6D4" : "url(#barGradient)"}
                className="transition-colors duration-300"
              />
            </g>
          );
        })}
      </svg>
      <div className="w-full h-[1px] bg-black/10 dark:bg-white/10 mt-2"></div>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 px-4 py-3 rounded-xl shadow-2xl pointer-events-none z-50 min-w-[240px] max-w-[320px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-2 border-b border-gray-100 dark:border-white/5 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">{data[hoveredIdx].type}</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">{data[hoveredIdx].llmScore}% Vis</span>
          </div>
          <div className="text-sm font-medium text-gray-800 dark:text-white line-clamp-2 leading-snug">
            {data[hoveredIdx].title}
          </div>
        </div>
      )}
    </div>
  );
};

export const SovTimelineChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const chartWidth = 100, chartHeight = 60;
  const maxVal = Math.max(...data.map(d => d.redditWeight));
  const spacing = chartWidth / data.length;
  const barWidth = Math.max(1, spacing * 0.8);

  return (
    <div className="relative w-full h-[140px] pt-2">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barHeight = maxVal > 0 ? (d.redditWeight / maxVal) * chartHeight : 0;
          const x = i * spacing + (spacing - barWidth) / 2;
          const y = chartHeight - barHeight;
          return (
            <g key={i} className="group cursor-pointer">
              <rect x={x - 1} y={0} width={barWidth + 2} height={chartHeight} fill="transparent" />
              {d.redditWeight > 0 && <rect x={x} y={y} width={barWidth} height={barHeight} rx="0.5" fill="url(#timeGradient)" className="opacity-80 group-hover:opacity-100 transition-opacity" />}
              {d.redditWeight > 0 && (
                <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <rect x={x + barWidth / 2 - 12} y={y - 12} width={24} height={8} rx="1" fill="#ffffff" stroke="#e2e8f0" className="dark:fill-[#111827] dark:stroke-[#334155]" strokeWidth="0.5" />
                  <text x={x + barWidth / 2} y={y - 6} fontSize="3.5" fill="currentColor" textAnchor="middle" className="font-bold font-mono text-gray-800 dark:text-[#f8fafc]">{d.redditWeight.toFixed(0)} wt</text>
                  <polygon points={`${x + barWidth / 2 - 2},${y - 4} ${x + barWidth / 2 + 2},${y - 4} ${x + barWidth / 2},${y - 2}`} className="fill-white dark:fill-[#111827]" />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="w-full h-[1px] bg-black/10 dark:bg-white/10 mt-1"></div>
    </div>
  );
};
