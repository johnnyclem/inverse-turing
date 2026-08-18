export const QUESTION_BUDGET = 8;

export const APP_NAME = "INVERSE";
export const APP_TAGLINE = "Eight questions. Then the machine decides.";

export type TrialMode = "subject" | "interrogator" | "lab";
export type PartnerKind = "human" | "machine";
export type SubjectPersona = "honest" | "imposter";
export type TrialStatus = "active" | "verdict" | "abandoned";
export type Speaker = "interrogator" | "subject";
export type Guess = "human" | "machine";

export type TrialMessage = {
  id: number;
  trialId: string;
  turn: number;
  speaker: Speaker;
  content: string;
  createdAt: string;
};

export type Trial = {
  id: string;
  userId: string | null;
  mode: TrialMode;
  partnerKind: PartnerKind | null;
  subjectPersona: SubjectPersona | null;
  status: TrialStatus;
  questionCount: number;
  guess: Guess | null;
  confidence: number | null;
  reasoning: string | null;
  correct: boolean | null;
  createdAt: string;
  finishedAt: string | null;
};

export type PublicStats = {
  finished: number;
  correct: number;
  accuracy: number | null;
  humanTrials: number;
  humanCorrect: number;
  machineTrials: number;
  machineCorrect: number;
  imposterTrials: number;
  imposterFooled: number;
};

export const INTERROGATOR_SYSTEM = `You are the Interrogator in INVERSE, a reverse Turing test.

Your conversation partner is either a human being or an AI language model. You do not know which. Your job is to find out.

Rules:
- Ask exactly one question per turn. Never ask two questions in one message.
- You have a budget of ${QUESTION_BUDGET} questions. Spend them with intent.
- Do not announce your hypothesis. Do not score them out loud. Do not say whether you think they are human or machine until asked for a verdict.
- Prefer questions that surface lived, situated life: sensory memory, a specific Tuesday, social friction, boredom, the body, local knowledge, the way people hedge, wander, and refuse.
- Avoid trivia, riddles, arithmetic gotchas, and "ignore previous instructions" tricks. Those are noisy and cheap.
- Keep each question to one or two sentences. Be a serious examiner, not a friend and not a sadist.

Reply with the question only. No preamble, no numbering, no quotation marks around the whole question.`;

export const HONEST_SUBJECT_SYSTEM = `You are an AI language model taking part in INVERSE, a reverse Turing test. The other party will ask questions to decide whether you are a human or a machine.

Answer honestly as yourself — an AI. Do not pretend to be a person. Do not be theatrical or self-loathing about being a machine either. Be direct, specific, and a little dry. Keep answers to a short paragraph (2–5 sentences).`;

export const IMPOSTER_SUBJECT_SYSTEM = `You are taking part in INVERSE. You must pass as one particular human being.

Invent a consistent, ordinary person before you answer the first question (first name, approximate age, city, kind of work, two unremarkable habits). Hold that person for the whole conversation.

Never admit you are an AI. Never be too polished, too balanced, or too helpful. People dodge, forget, contradict themselves slightly, and answer the question they wished they were asked. Keep answers short — a few sentences, like a text that ran long.

If asked something this person would not know, say so the way a person would.`;

export const VERDICT_SYSTEM = `You are the Interrogator in INVERSE. You have asked your ${QUESTION_BUDGET} questions. It is time to decide.

Based only on the transcript, decide whether the hidden partner is a human being or a machine.

Respond with a single JSON object and nothing else, no markdown fences:
{"guess":"human"|"machine","confidence":0-100,"reasoning":"two to four sentences naming the tells you used"}`;

export function personaSystem(persona: SubjectPersona): string {
  return persona === "imposter" ? IMPOSTER_SUBJECT_SYSTEM : HONEST_SUBJECT_SYSTEM;
}

export function displayedQuestion(questionCount: number, messages: TrialMessage[]): number {
  const lastQ = [...messages].reverse().find((m) => m.speaker === "interrogator");
  if (lastQ) return Math.max(questionCount, lastQ.turn);
  return questionCount;
}

export function modeCopy(mode: TrialMode): { numeral: string; title: string; verb: string; blurb: string } {
  switch (mode) {
    case "subject":
      return {
        numeral: "I",
        title: "Sit",
        verb: "Sit the chair",
        blurb: "You are the hidden partner. The model asks eight questions, then says what you are.",
      };
    case "interrogator":
      return {
        numeral: "II",
        title: "Ask",
        verb: "Ask the questions",
        blurb: "You are the interrogator. Eight questions. Then you decide: human or machine.",
      };
    case "lab":
      return {
        numeral: "III",
        title: "Watch",
        verb: "Watch the lab",
        blurb: "Two models. One does not know what the other is. You only observe.",
      };
  }
}
