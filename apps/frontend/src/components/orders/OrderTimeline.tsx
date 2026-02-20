'use client';

interface OrderTimelineProps {
  currentStatus: string;
  steps: Array<{ key: string; label: string; icon: string }>;
}

export function OrderTimeline({ currentStatus, steps }: OrderTimelineProps) {
  const currentIndex = steps.findIndex(step => step.key === currentStatus);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2">
          <span>📍</span>
          <span>Estado del Pedido</span>
        </h3>
      </div>
      <div className="p-5">
        <div className="space-y-0">
          {steps.map((step, i) => {
            const isDone = currentIndex !== -1 && i < currentIndex;
            const isActive = i === currentIndex;

            return (
              <div
                key={step.key}
                className={`flex gap-4 relative ${isDone ? 'opacity-90' : ''}`}
              >
                {i < steps.length - 1 && (
                  <div
                    className={`absolute left-4 top-9 w-0.5 h-[calc(100%-14px)] ${
                      isDone ? 'bg-[var(--green)]/40' : 'bg-[var(--border2)]'
                    }`}
                  />
                )}
                <div
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0 z-10 transition-all ${
                    isDone
                      ? 'bg-[var(--green)]/15 border-[var(--green)]'
                      : isActive
                        ? 'bg-[var(--accent)]/15 border-[var(--accent)] shadow-[0_0_0_4px_rgba(245,200,66,.1)]'
                        : 'bg-[var(--surface2)] border-[var(--border2)]'
                  }`}
                >
                  {step.icon}
                </div>
                <div className="pb-6">
                  <div
                    className={`text-sm font-semibold ${
                      isDone
                        ? 'text-[var(--green)]'
                        : isActive
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--muted)]'
                    }`}
                  >
                    {step.label}
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] mt-1 inline-block">
                      En proceso
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
