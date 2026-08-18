import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Guess } from "@/lib/protocol";

export function GuessForm({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (guess: Guess, confidence: number) => Promise<void> | void;
}) {
  const [guess, setGuess] = useState<Guess | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [busy, setBusy] = useState(false);

  return (
    <div className="border border-border bg-surface p-5 sm:p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">Your verdict</p>
      <p className="mt-2 font-display text-2xl italic text-fg">Who were you speaking to?</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {(["human", "machine"] as const).map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled || busy}
            onClick={() => setGuess(option)}
            className={
              guess === option
                ? "h-16 border border-primary bg-primary/10 font-display text-2xl italic text-fg"
                : "h-16 border border-border font-display text-2xl italic text-muted hover:border-line hover:text-fg"
            }
          >
            {option === "human" ? "Human" : "Machine"}
          </button>
        ))}
      </div>
      <label className="mt-6 block">
        <span className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em] text-faint">
          Confidence
          <span className="tabular-nums text-muted">{confidence}%</span>
        </span>
        <input
          type="range"
          min={50}
          max={100}
          step={1}
          value={confidence}
          disabled={disabled || busy}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="mt-3 w-full accent-primary"
        />
      </label>
      <Button
        className="mt-6 w-full"
        disabled={!guess || disabled || busy}
        onClick={() => {
          if (!guess) return;
          setBusy(true);
          void Promise.resolve(onSubmit(guess, confidence)).finally(() => setBusy(false));
        }}
      >
        {busy ? "Sealing…" : "Seal the verdict"}
      </Button>
    </div>
  );
}
