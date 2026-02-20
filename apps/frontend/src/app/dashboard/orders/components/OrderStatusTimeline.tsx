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
  const currentIndex = statusOptions.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between space-x-2 py-4">
      {statusOptions.map((status, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isCancelled = currentStatus === 'CANCELLED' && status === 'CANCELLED';

        let bgColor = 'bg-zinc-700';
        let textColor = 'text-zinc-400';
        let borderColor = 'border-zinc-600';

        if (isCancelled) {
          bgColor = 'bg-red-500';
          textColor = 'text-white';
          borderColor = 'border-red-500';
        } else if (isActive) {
          bgColor = 'bg-[var(--accent)]';
          textColor = 'text-zinc-950';
          borderColor = 'border-[var(--accent)]';
        }

        return (
          <React.Fragment key={status}>
            <div className="flex flex-col items-center">
              <div
                className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ease-in-out ${borderColor} ${bgColor}`}
              >
                <span className={`text-xs font-bold ${textColor}`}>
                  {index + 1}
                </span>
                {isCurrent && (
                  <div className="absolute -bottom-6 text-[10px] font-medium text-zinc-200 animate-pulse">
                    {statusLabel[status]}
                  </div>
                )}
              </div>
            </div>
            {index < statusOptions.length - 1 && (
              <div
                className={`flex-1 h-0.5 transition-all duration-300 ease-in-out ${
                  isActive && !isCancelled ? 'bg-[var(--accent)]' : 'bg-zinc-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default OrderStatusTimeline;
