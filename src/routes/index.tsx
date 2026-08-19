import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getPublicStats } from "@/lib/trials";
import { modeCopy, type PublicStats, type TrialMode } from "@/lib/protocol";

export const Route = createFileRoute("/")({ component: Home });

const MODES: TrialMode[] = ["subject", "interrogator", "lab"];

function Home() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    void getPublicStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-faint">
          Protocol 01 · Reverse Turing
        </p>
        <h1 className="mt-5 max-w-full overflow-x-clip font-display text-[3.5rem] italic leading-[0.88] tracking-tight text-fg sm:text-[7.5rem]">
          Inverse
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
          The Turing test, reversed. A language model is seated across from a hidden
          partner — human or machine — and given eight questions to find out which.
          Then it has to say.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/play/interrogator">
            <Button size="lg">Begin a double-blind</Button>
          </Link>
          <Link to="/play/subject">
            <Button size="lg" variant="ghost">
              Sit as the unknown
            </Button>
          </Link>
        </div>

        <section className="mt-14 grid gap-px bg-border sm:grid-cols-3">
          {MODES.map((mode) => {
            const copy = modeCopy(mode);
            const to =
              mode === "subject"
                ? "/play/subject"
                : mode === "interrogator"
                  ? "/play/interrogator"
                  : "/play/lab";
            return (
              <Link
                key={mode}
                to={to}
                className="group flex flex-col bg-bg p-6 transition-colors hover:bg-surface sm:p-8"
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
                  {copy.numeral}
                </span>
                <span className="mt-4 font-display text-4xl italic text-fg transition-colors group-hover:text-primary">
                  {copy.title}
                </span>
                <span className="mt-3 text-sm leading-relaxed text-muted">{copy.blurb}</span>
              </Link>
            );
          })}
        </section>

        <StatsRibbon stats={stats} />

        <section className="mt-20 grid gap-12 border-t border-border pt-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl italic text-fg">How it works</h2>
            <ol className="mt-6 space-y-5 text-sm leading-relaxed text-muted">
              <li>
                <span className="mr-3 font-display italic text-fg">01</span>
                The interrogator does not know who sits opposite. Identity is
                sealed — neither chair may say what they are. The verdict has to
                come from texture, not a nameplate.
              </li>
              <li>
                <span className="mr-3 font-display italic text-fg">02</span>
                Exactly eight questions. No more. Chosen to surface lived texture
                rather than trivia or traps.
              </li>
              <li>
                <span className="mr-3 font-display italic text-fg">03</span>
                A verdict: human or machine, with a confidence and the tells that
                decided it. The archive keeps the score.
              </li>
            </ol>
          </div>
          <div>
            <h2 className="font-display text-2xl italic text-fg">Why reverse it</h2>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              Turing asked whether a machine could pass for a person. Inverse asks
              the other question: can a machine tell when it is speaking to one?
              The interesting failure is not a wrong guess — it is a confident one,
              built on the wrong tells.
            </p>
            <Link
              to="/archive"
              className="mt-6 inline-flex text-sm text-primary underline-offset-4 hover:underline"
            >
              Read the archive
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatsRibbon({ stats }: { stats: PublicStats | null }) {
  const cells = [
    { label: "Finished trials", value: stats ? String(stats.finished) : "—" },
    {
      label: "Interrogator accuracy",
      value: stats?.accuracy != null ? `${stats.accuracy}%` : "—",
    },
    {
      label: "Humans identified",
      value:
        stats && stats.humanTrials > 0
          ? `${stats.humanCorrect}/${stats.humanTrials}`
          : "—",
    },
    {
      label: "Imposters who fooled",
      value:
        stats && stats.imposterTrials > 0
          ? `${stats.imposterFooled}/${stats.imposterTrials}`
          : "—",
    },
  ];

  return (
    <dl className="mt-px grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-bg px-5 py-6">
          <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-faint">
            {cell.label}
          </dt>
          <dd className="mt-2 font-display text-3xl italic tabular-nums text-fg">{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}
