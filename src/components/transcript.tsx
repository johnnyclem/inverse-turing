import type { TrialMessage } from "@/lib/protocol";
import { cn } from "@/lib/cn";

export function Transcript({
  messages,
  pendingLabel,
}: {
  messages: TrialMessage[];
  pendingLabel?: string | null;
}) {
  if (messages.length === 0 && !pendingLabel) {
    return (
      <p className="font-display text-xl italic text-muted">The room is quiet. The first question has not been asked.</p>
    );
  }

  return (
    <ol className="flex flex-col gap-8">
      {messages.map((m) => (
        <li
          key={m.id}
          className={cn(
            "stagger-in",
            m.speaker === "interrogator" ? "max-w-2xl" : "ml-0 max-w-2xl sm:ml-8",
          )}
        >
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">
            {m.speaker === "interrogator" ? `Question ${String(m.turn).padStart(2, "0")}` : `Reply ${String(m.turn).padStart(2, "0")}`}
          </p>
          {m.speaker === "interrogator" ? (
            <p className="font-display text-2xl italic leading-snug text-fg sm:text-[1.65rem]">{m.content}</p>
          ) : (
            <p className="border-l border-line pl-4 text-[15px] leading-relaxed text-fg/90">{m.content}</p>
          )}
        </li>
      ))}
      {pendingLabel ? (
        <li className="flex items-center gap-3 text-sm text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          <span className="italic">{pendingLabel}</span>
        </li>
      ) : null}
    </ol>
  );
}
