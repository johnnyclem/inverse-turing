import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { RoomShell } from "@/components/room-shell";
import { Transcript } from "@/components/transcript";
import { VerdictCard } from "@/components/verdict-card";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { advanceLab, checkAi, startLabTrial } from "@/lib/trials";
import { displayedQuestion, type Trial, type TrialMessage } from "@/lib/protocol";

export const Route = createFileRoute("/play/lab")({ component: LabPage });

function LabPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <RoomShell mode="lab" current={0}>
        <div className="h-8 w-40 animate-pulse bg-raised" />
      </RoomShell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <LabRoom />;
}

function LabRoom() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [messages, setMessages] = useState<TrialMessage[]>([]);
  const running = useRef(false);

  useEffect(() => {
    void checkAi()
      .then((r) => setAvailable(r.available))
      .catch(() => setAvailable(false));
  }, []);

  async function start() {
    setStarting(true);
    setPending("The interrogator is taking a seat…");
    const result = await startLabTrial();
    setStarting(false);
    if (!result.ok) {
      setPending(null);
      toast.error(result.error);
      return;
    }
    setTrial(result.trial);
    setMessages(result.messages);
    running.current = true;
    void playOut(result.trial, result.messages);
  }

  async function playOut(current: Trial, currentMessages: TrialMessage[]) {
    let t = current;
    let msgs = currentMessages;
    while (running.current && t.status === "active") {
      const last = msgs[msgs.length - 1];
      setPending(
        last?.speaker === "interrogator"
          ? "The subject is answering…"
          : "The interrogator is considering…",
      );
      await wait(900);
      const result = await advanceLab({ data: { trialId: t.id } });
      if (!result.ok) {
        setPending(null);
        toast.error(result.error);
        running.current = false;
        return;
      }
      t = result.trial;
      msgs = result.messages;
      setTrial(t);
      setMessages(msgs);
    }
    setPending(null);
    running.current = false;
  }

  if (available === false) {
    return (
      <RoomShell mode="lab" current={0}>
        <div className="max-w-xl">
          <p className="font-display text-2xl italic text-fg">The lab is dark.</p>
          <p className="mt-3 text-sm text-muted">
            AI features are unavailable in this environment.
          </p>
        </div>
      </RoomShell>
    );
  }

  if (!trial) {
    return (
      <RoomShell mode="lab" current={0}>
        <div className="max-w-xl">
          <p className="font-display text-2xl italic leading-snug text-fg">
            Two models. One asks. One answers. The interrogator does not know
            whether it is speaking to a machine being itself, or a machine
            wearing a person.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            You only watch. Eight questions, then a verdict. A few observations
            a day — the models spend real thought.
          </p>
          <Button className="mt-8" onClick={() => void start()} disabled={starting || available !== true}>
            {starting ? "Dimming the lights…" : available === null ? "Checking the room…" : "Begin the observation"}
          </Button>
        </div>
      </RoomShell>
    );
  }

  if (trial.status === "verdict") {
    return (
      <RoomShell mode="lab" current={displayedQuestion(trial.questionCount, messages)}>
        <Transcript messages={messages} />
        <div className="mt-12">
          <VerdictCard trial={trial} againHref="/play/lab" againLabel="Watch another" />
        </div>
      </RoomShell>
    );
  }

  return (
    <RoomShell mode="lab" current={displayedQuestion(trial.questionCount, messages)} live>
      <Transcript messages={messages} pendingLabel={pending} />
      <p className="mt-10 text-xs text-faint">
        Do not interrupt.{" "}
        <Link to="/" className="underline-offset-4 hover:underline">
          Leave the gallery
        </Link>
      </p>
    </RoomShell>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
