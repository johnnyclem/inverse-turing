import { QUESTION_BUDGET } from "@/lib/protocol";
import { cn } from "@/lib/cn";

export function QuestionMeter({
  current,
  compact = false,
}: {
  current: number;
  compact?: boolean;
}) {
  const spent = Math.min(current, QUESTION_BUDGET);
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <p className="font-display text-2xl italic tabular-nums leading-none text-fg">
          {String(spent).padStart(2, "0")}
          <span className="mx-1 text-faint">/</span>
          {String(QUESTION_BUDGET).padStart(2, "0")}
        </p>
        <TickRow spent={spent} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">Questions</p>
      <div className="font-display italic leading-none text-fg">
        <span className="block text-6xl tabular-nums sm:text-7xl">{String(spent).padStart(2, "0")}</span>
        <span className="mt-2 block h-px w-12 bg-line" />
        <span className="mt-2 block text-3xl tabular-nums text-muted">
          {String(QUESTION_BUDGET).padStart(2, "0")}
        </span>
      </div>
      <TickRow spent={spent} vertical />
    </div>
  );
}

function TickRow({ spent, vertical = false }: { spent: number; vertical?: boolean }) {
  return (
    <div className={cn("flex gap-1.5", vertical ? "flex-col" : "flex-row")}>
      {Array.from({ length: QUESTION_BUDGET }, (_, i) => (
        <span
          key={i}
          className={cn(
            "transition-colors duration-300",
            vertical ? "h-3 w-px" : "h-px w-3",
            i < spent ? "bg-primary" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}
