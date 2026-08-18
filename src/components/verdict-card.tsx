import { Link } from "@tanstack/react-router";
import type { Trial } from "@/lib/protocol";
import { Button } from "@/components/ui/button";

export function VerdictCard({
  trial,
  againHref,
  againLabel,
}: {
  trial: Trial;
  againHref: "/play/subject" | "/play/interrogator" | "/play/lab";
  againLabel: string;
}) {
  const guess = trial.guess ?? "machine";
  const word = guess === "human" ? "Human" : "Machine";
  const actual =
    trial.partnerKind === "human"
      ? "a human"
      : trial.subjectPersona === "imposter"
        ? "a machine performing as a person"
        : "a machine, speaking as itself";

  return (
    <section className="border border-border bg-surface px-5 py-8 sm:px-10 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">Verdict</p>
        {trial.correct != null ? (
          <span
            className={
              trial.correct
                ? "text-[10px] font-medium uppercase tracking-[0.18em] text-primary"
                : "text-[10px] font-medium uppercase tracking-[0.18em] text-muted"
            }
          >
            {trial.correct ? "Correct" : "Incorrect"}
          </span>
        ) : null}
      </div>
      <h2 className="mt-4 font-display text-6xl italic leading-none text-fg sm:text-7xl">{word}</h2>
      {trial.confidence != null ? (
        <div className="mt-6 max-w-sm">
          <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em] text-faint">
            <span>Confidence</span>
            <span className="tabular-nums text-muted">{trial.confidence}%</span>
          </div>
          <div className="mt-2 h-px w-full bg-line">
            <div className="h-px bg-primary" style={{ width: `${trial.confidence}%` }} />
          </div>
        </div>
      ) : null}
      {trial.reasoning && trial.reasoning !== "Human interrogator." ? (
        <blockquote className="mt-8 max-w-2xl border-l border-primary/50 pl-4 font-display text-lg italic leading-relaxed text-fg/90">
          {trial.reasoning}
        </blockquote>
      ) : null}
      <p className="mt-8 text-sm text-muted">
        The hidden partner was {actual}.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link to={againHref}>
          <Button>{againLabel}</Button>
        </Link>
        <Link to="/archive">
          <Button variant="ghost">Read the archive</Button>
        </Link>
      </div>
    </section>
  );
}
