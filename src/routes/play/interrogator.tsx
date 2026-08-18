import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RoomShell } from "@/components/room-shell";
import { Transcript } from "@/components/transcript";
import { Composer } from "@/components/composer";
import { GuessForm } from "@/components/guess-form";
import { VerdictCard } from "@/components/verdict-card";
import { Button } from "@/components/ui/button";
import {
  askInterrogator,
  checkAi,
  startInterrogatorTrial,
  submitGuess,
} from "@/lib/trials";
import { QUESTION_BUDGET, displayedQuestion, type Guess, type Trial, type TrialMessage } from "@/lib/protocol";

export const Route = createFileRoute("/play/interrogator")({ component: AskPage });

const STORAGE_KEY = "inverse.active.interrogator";

function AskPage() {
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
    void import("@/lib/trials").then(({ getTrial }) => {
      getTrial({ data: saved })
        .then((payload) => {
          if (payload && payload.trial.mode === "interrogator") {
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
    const result = await startInterrogatorTrial();
    setStarting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTrial(result.trial);
    setMessages(result.messages);
    sessionStorage.setItem(STORAGE_KEY, result.trial.id);
  }

  async function ask(question: string) {
    if (!trial) return;
    setPending("The hidden partner is answering…");
    const result = await askInterrogator({ data: { trialId: trial.id, question } });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTrial(result.trial);
    setMessages(result.messages);
  }

  async function decide(guess: Guess, confidence: number) {
    if (!trial) return;
    const result = await submitGuess({ data: { trialId: trial.id, guess, confidence } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTrial(result.trial);
    setMessages(result.messages);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  if (available === false) {
    return (
      <RoomShell mode="interrogator" current={0}>
        <div className="max-w-xl">
          <p className="font-display text-2xl italic text-fg">The subject is not seated.</p>
          <p className="mt-3 text-sm text-muted">
            AI features are unavailable in this environment.
          </p>
        </div>
      </RoomShell>
    );
  }

  if (!trial) {
    return (
      <RoomShell mode="interrogator" current={0}>
        <div className="max-w-xl">
          <p className="font-display text-2xl italic leading-snug text-fg">
            You have eight questions. The partner on the other side is either a
            machine speaking as itself, or a machine performing as a person. You
            will not be told which.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Spend the questions. Then say human or machine.
          </p>
          <Button className="mt-8" onClick={() => void start()} disabled={starting || available !== true}>
            {starting ? "Seating…" : available === null ? "Checking the room…" : "Begin the examination"}
          </Button>
        </div>
      </RoomShell>
    );
  }

  if (trial.status === "verdict") {
    return (
      <RoomShell mode="interrogator" current={displayedQuestion(trial.questionCount, messages)}>
        <Transcript messages={messages} />
        <div className="mt-12">
          <VerdictCard trial={trial} againHref="/play/interrogator" againLabel="Ask again" />
        </div>
      </RoomShell>
    );
  }

  const readyToGuess = trial.questionCount >= QUESTION_BUDGET;

  return (
    <RoomShell
      mode="interrogator"
      current={displayedQuestion(trial.questionCount, messages)}
      live
      footer={
        readyToGuess ? (
          <GuessForm disabled={Boolean(pending)} onSubmit={decide} />
        ) : (
          <Composer
            placeholder="Your question"
            submitLabel="Ask"
            disabled={Boolean(pending)}
            onSubmit={ask}
          />
        )
      }
    >
      <Transcript messages={messages} pendingLabel={pending} />
    </RoomShell>
  );
}
