import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getPublicStats, listMyTrials, listRecentTrials } from "@/lib/trials";
import { modeCopy, type PublicStats, type Trial } from "@/lib/protocol";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/archive")({ component: ArchivePage });

function ArchivePage() {
  const { user, isPending } = useCurrentUserState();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [recent, setRecent] = useState<Trial[]>([]);
  const [mine, setMine] = useState<Trial[] | null>(null);

  useEffect(() => {
    void getPublicStats().then(setStats).catch(() => setStats(null));
    void listRecentTrials().then(setRecent).catch(() => setRecent([]));
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setMine(null);
      return;
    }
    void listMyTrials()
      .then(setMine)
      .catch(() => setMine([]));
  }, [user, isPending]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">Record</p>
        <h1 className="mt-3 font-display text-5xl italic text-fg sm:text-6xl">Archive</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          Every finished examination is filed. Accuracy is the interrogator's —
          model or human — against the hidden partner's true nature.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <Stat label="Finished" value={stats ? String(stats.finished) : "—"} />
          <Stat
            label="Accuracy"
            value={stats?.accuracy != null ? `${stats.accuracy}%` : "—"}
          />
          <Stat
            label="Humans caught"
            value={
              stats && stats.humanTrials
                ? `${pct(stats.humanCorrect, stats.humanTrials)}%`
                : "—"
            }
          />
          <Stat
            label="Machines caught"
            value={
              stats && stats.machineTrials
                ? `${pct(stats.machineCorrect, stats.machineTrials)}%`
                : "—"
            }
          />
        </dl>

        {mine && mine.length > 0 ? (
          <section className="mt-14">
            <h2 className="font-display text-2xl italic">Your examinations</h2>
            <TrialList trials={mine} />
          </section>
        ) : null}

        <section className="mt-14">
          <h2 className="font-display text-2xl italic">Recent filings</h2>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              The archive is empty.{" "}
              <Link to="/play/subject" className="text-primary underline-offset-4 hover:underline">
                Sit the chair
              </Link>{" "}
              and be the first.
            </p>
          ) : (
            <TrialList trials={recent} />
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg px-5 py-6">
      <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-faint">{label}</dt>
      <dd className="mt-2 font-display text-3xl italic tabular-nums">{value}</dd>
    </div>
  );
}

function TrialList({ trials }: { trials: Trial[] }) {
  return (
    <ul className="mt-6 divide-y divide-border border-y border-border">
      {trials.map((t) => {
        const copy = modeCopy(t.mode);
        const when = safeAgo(t.finishedAt ?? t.createdAt);
        return (
          <li key={t.id}>
            <Link
              to="/trial/$id"
              params={{ id: t.id }}
              className="flex flex-wrap items-baseline justify-between gap-3 py-4 transition-colors hover:bg-surface/60"
            >
              <span className="text-sm text-fg">
                <span className="text-faint">{copy.numeral}</span>
                <span className="mx-2 text-muted">{copy.title}</span>
                <span className="font-display italic">
                  {t.guess === "human" ? "Human" : t.guess === "machine" ? "Machine" : "Open"}
                </span>
              </span>
              <span className="flex items-center gap-4 text-[11px] uppercase tracking-[0.14em] text-faint">
                {t.correct == null ? null : (
                  <span className={t.correct ? "text-primary" : "text-muted"}>
                    {t.correct ? "Correct" : "Incorrect"}
                  </span>
                )}
                <span className="tabular-nums">{when}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function safeAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}
