import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Transcript } from "@/components/transcript";
import { VerdictCard } from "@/components/verdict-card";
import { getTrial } from "@/lib/trials";
import { modeCopy, type Trial, type TrialMessage } from "@/lib/protocol";

export const Route = createFileRoute("/trial/$id")({ component: TrialPage });

function TrialPage() {
  const { id } = Route.useParams();
  const [trial, setTrial] = useState<Trial | null | undefined>(undefined);
  const [messages, setMessages] = useState<TrialMessage[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getTrial({ data: id }).then((payload) => {
      if (cancelled) return;
      if (!payload) {
        setTrial(null);
        return;
      }
      setTrial(payload.trial);
      setMessages(payload.messages);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {trial === undefined ? (
          <p className="text-sm text-muted">Retrieving the file…</p>
        ) : trial === null ? (
          <div>
            <h1 className="font-display text-3xl italic">No such filing</h1>
            <Link to="/archive" className="mt-4 inline-block text-sm text-primary">
              Return to the archive
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
              {modeCopy(trial.mode).numeral} · {modeCopy(trial.mode).title}
            </p>
            <h1 className="mt-3 font-display text-4xl italic">Examination</h1>
            <div className="mt-10">
              <Transcript messages={messages} />
            </div>
            {trial.status === "verdict" ? (
              <div className="mt-12">
                <VerdictCard
                  trial={trial}
                  againHref={
                    trial.mode === "subject"
                      ? "/play/subject"
                      : trial.mode === "interrogator"
                        ? "/play/interrogator"
                        : "/play/lab"
                  }
                  againLabel="Run another"
                />
              </div>
            ) : (
              <p className="mt-10 text-sm text-muted">This examination is still in progress.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
