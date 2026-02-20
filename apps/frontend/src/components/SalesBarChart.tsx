'use client';

import React, { useMemo } from 'react';

interface SalesBarChartProps {
  data: { label: string; value: number; color: string }[];
  height?: number;
}

const SalesBarChart: React.FC<SalesBarChartProps> = ({ data, height = 150 }) => {
  const maxValue = useMemo(
    () => (data.length ? Math.max(...data.map(item => item.value)) : 1),
    [data]
  );
  const barWidth = 30;
  const barSpacing = 20;
  const totalBarWidth = data.length * barWidth + (data.length > 0 ? (data.length - 1) * barSpacing : 0);
  const labelOffset = 15;

  return (
    <div className="relative w-full" style={{ height: height + labelOffset }}>
      <svg width="100%" height={height + labelOffset} viewBox={`0 0 ${totalBarWidth} ${height + labelOffset}`} preserveAspectRatio="xMidYMid meet">
        {data.map((item, index) => {
          const barHeight = maxValue ? (item.value / maxValue) * height : 0;
          const y = height - barHeight;
          const opacity = barHeight > 0 ? 1 : 0;
          const x = index * (barWidth + barSpacing);

          return (
            <g key={item.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={item.color}
                rx="4"
                ry="4"
                className="transition-all duration-700 ease-out"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="10"
                fill="#e8eaf2"
                className="transition-opacity duration-500 ease-out"
                style={{ opacity }}
              >
                {item.value}
              </text>
              <text
                x={x + barWidth / 2}
                y={height + labelOffset - 5} // Position below the chart area
                textAnchor="middle"
                fontSize="10"
                fill="#a1a1aa" // zinc-400 equivalent
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SalesBarChart;
