'use client';

import React from 'react';

interface OrderStatusTimelineProps {
  currentStatus: string;
  statusOptions: readonly string[];
  statusLabel: Record<string, string>;
  statusColor: Record<string, string>;
}

const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({
  currentStatus,
  statusOptions,
  statusLabel,
  statusColor,
}) => {
  return (
    <div className="relative flex justify-between py-4">
      {statusOptions.map((status, index) => (
        <div key={status} className="flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300
              ${currentStatus === status
                ? statusColor[status]
                : index < statusOptions.indexOf(currentStatus)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--surface2)] text-[var(--muted)]'
              }`}
          >
            {index + 1}
          </div>
          <div className="mt-2 text-[10px] text-center text-[var(--muted)]">
            {statusLabel[status]}
          </div>
        </div>
      ))}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--border)] -z-10" />
    </div>
  );
};

export default OrderStatusTimeline;
