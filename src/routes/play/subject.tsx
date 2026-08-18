import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RoomShell } from "@/components/room-shell";
import { Transcript } from "@/components/transcript";
import { Composer } from "@/components/composer";
import { VerdictCard } from "@/components/verdict-card";
import { Button } from "@/components/ui/button";
import { answerSubject, checkAi, startSubjectTrial } from "@/lib/trials";
import { displayedQuestion, type Trial, type TrialMessage } from "@/lib/protocol";

export const Route = createFileRoute("/play/subject")({ component: SitPage });

const STORAGE_KEY = "inverse.active.subject";

function SitPage() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [messages, setMessages] = useState<TrialMessage[]>([]);

  useEffect(() => {
    void checkAi()
      .then((r) => setAvailable(r.available))
      .catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    // Resume is best-effort via the start button; we keep the id so refresh
    // can restore after a start. Actual hydrate happens below.
    void import("@/lib/trials").then(({ getTrial }) => {
      getTrial({ data: saved })
        .then((payload) => {
          if (payload && payload.trial.mode === "subject") {
            setTrial(payload.trial);
            setMessages(payload.messages);
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        })
        .catch(() => sessionStorage.removeItem(STORAGE_KEY));
    });
  }, []);

  async function start() {
    setStarting(true);
    setPending("The interrogator is taking a seat…");
    const result = await startSubjectTrial();
    setStarting(false);
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTrial(result.trial);
    setMessages(result.messages);
    sessionStorage.setItem(STORAGE_KEY, result.trial.id);
  }

  async function reply(answer: string) {
    if (!trial) return;
    setPending("The interrogator is considering…");
    const result = await answerSubject({ data: { trialId: trial.id, answer } });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTrial(result.trial);
    setMessages(result.messages);
    if (result.trial.status === "verdict") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  if (available === false) {
    return (
      <RoomShell mode="subject" current={0}>
        <Unavailable />
      </RoomShell>
    );
  }

  if (!trial) {
    return (
      <RoomShell mode="subject" current={0}>
        <div className="max-w-xl">
          <p className="font-display text-2xl italic leading-snug text-fg">
            Sit down. The model will ask you eight questions. It does not know you
            are a person — unless you give it a reason to think otherwise.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Answer as yourself, or try to pass as a machine. When the eighth reply
            is in, it has to decide.
          </p>
          <Button className="mt-8" onClick={() => void start()} disabled={starting || available !== true}>
            {starting ? "Seating…" : available === null ? "Checking the room…" : "I will sit"}
          </Button>
        </div>
      </RoomShell>
    );
  }

  if (trial.status === "verdict") {
    return (
      <RoomShell mode="subject" current={displayedQuestion(trial.questionCount, messages)}>
        <Transcript messages={messages} />
        <div className="mt-12">
          <VerdictCard trial={trial} againHref="/play/subject" againLabel="Sit again" />
        </div>
      </RoomShell>
    );
  }

  return (
    <RoomShell
      mode="subject"
      current={displayedQuestion(trial.questionCount, messages)}
      live
      footer={
        <Composer
          placeholder="Your answer"
          submitLabel="Answer"
          disabled={Boolean(pending)}
          onSubmit={reply}
        />
      }
    >
      <Transcript messages={messages} pendingLabel={pending} />
    </RoomShell>
  );
}

function Unavailable() {
  return (
    <div className="max-w-xl">
      <p className="font-display text-2xl italic text-fg">The interrogator is not seated.</p>
      <p className="mt-3 text-sm text-muted">
        AI features are unavailable in this environment. The room will open when a
        model is present.
      </p>
    </div>
  );
}
