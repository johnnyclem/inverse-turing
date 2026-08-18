import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalUserMiddleware } from "@/lib/optional-user";
import {
  HONEST_SUBJECT_SYSTEM,
  IMPOSTER_SUBJECT_SYSTEM,
  INTERROGATOR_SYSTEM,
  QUESTION_BUDGET,
  VERDICT_SYSTEM,
  type Guess,
  type PartnerKind,
  type PublicStats,
  type SubjectPersona,
  type Trial,
  type TrialMessage,
  type TrialMode,
  type TrialStatus,
} from "@/lib/protocol";
import { aiAvailable, chatCompletion, parseVerdict } from "@/lib/xai";

type TrialRow = {
  id: string;
  user_id: string | null;
  mode: TrialMode;
  partner_kind: PartnerKind;
  subject_persona: SubjectPersona | null;
  status: TrialStatus;
  question_count: number;
  guess: Guess | null;
  confidence: number | null;
  reasoning: string | null;
  correct: boolean | null;
  created_at: string;
  finished_at: string | null;
};

type MessageRow = {
  id: number;
  trial_id: string;
  turn: number;
  speaker: "interrogator" | "subject";
  content: string;
  created_at: string;
};

export type TrialPayload = {
  trial: Trial;
  messages: TrialMessage[];
};

export type ActionResult =
  | { ok: true; trial: Trial; messages: TrialMessage[] }
  | { ok: false; error: string };

function mapTrial(row: TrialRow, reveal: boolean): Trial {
  const finished = row.status === "verdict";
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode,
    partnerKind: reveal || finished ? row.partner_kind : null,
    subjectPersona: reveal || finished ? row.subject_persona : null,
    status: row.status,
    questionCount: Number(row.question_count),
    guess: row.guess,
    confidence: row.confidence == null ? null : Number(row.confidence),
    reasoning: row.reasoning,
    correct: row.correct,
    createdAt: stringifyDate(row.created_at),
    finishedAt: row.finished_at ? stringifyDate(row.finished_at) : null,
  };
}

function mapMessage(row: MessageRow): TrialMessage {
  return {
    id: Number(row.id),
    trialId: row.trial_id,
    turn: Number(row.turn),
    speaker: row.speaker,
    content: row.content,
    createdAt: stringifyDate(row.created_at),
  };
}

function stringifyDate(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function loadTrial(id: string): Promise<TrialRow | null> {
  const sql = await getSql();
  const rows = await sql<TrialRow>`select * from trials where id = ${id} limit 1`;
  return rows[0] ?? null;
}

async function loadMessages(trialId: string): Promise<TrialMessage[]> {
  const sql = await getSql();
  const rows = await sql<MessageRow>`
    select * from trial_messages where trial_id = ${trialId} order by id asc
  `;
  return rows.map(mapMessage);
}

async function insertMessage(
  trialId: string,
  turn: number,
  speaker: "interrogator" | "subject",
  content: string,
) {
  const sql = await getSql();
  await sql`
    insert into trial_messages (trial_id, turn, speaker, content)
    values (${trialId}, ${turn}, ${speaker}, ${content})
  `;
}

function pickPersona(): SubjectPersona {
  return Math.random() < 0.5 ? "honest" : "imposter";
}

function subjectSystem(persona: SubjectPersona) {
  return persona === "imposter" ? IMPOSTER_SUBJECT_SYSTEM : HONEST_SUBJECT_SYSTEM;
}

function toInterrogatorChat(messages: TrialMessage[]) {
  const chat: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: INTERROGATOR_SYSTEM },
  ];
  for (const m of messages) {
    if (m.speaker === "interrogator") {
      chat.push({ role: "assistant", content: m.content });
    } else {
      chat.push({ role: "user", content: m.content });
    }
  }
  return chat;
}

function toSubjectChat(persona: SubjectPersona, messages: TrialMessage[]) {
  const chat: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: subjectSystem(persona) },
  ];
  for (const m of messages) {
    if (m.speaker === "interrogator") {
      chat.push({ role: "user", content: m.content });
    } else {
      chat.push({ role: "assistant", content: m.content });
    }
  }
  return chat;
}

async function nextQuestion(messages: TrialMessage[]) {
  return chatCompletion(toInterrogatorChat(messages), {
    maxTokens: 140,
    temperature: 0.85,
  });
}

async function nextAnswer(persona: SubjectPersona, messages: TrialMessage[]) {
  return chatCompletion(toSubjectChat(persona, messages), {
    maxTokens: 240,
    temperature: persona === "imposter" ? 0.95 : 0.55,
  });
}

async function writeVerdict(row: TrialRow, messages: TrialMessage[]) {
  const transcript = messages
    .map((m) => {
      const who = m.speaker === "interrogator" ? "INTERROGATOR" : "SUBJECT";
      return `${who} (${m.turn}): ${m.content}`;
    })
    .join("\n\n");

  const result = await chatCompletion(
    [
      { role: "system", content: VERDICT_SYSTEM },
      { role: "user", content: transcript },
    ],
    { maxTokens: 280, temperature: 0.3 },
  );
  if (!result.ok) return result;

  const parsed = parseVerdict(result.text);
  const correct = parsed.guess === row.partner_kind;
  const sql = await getSql();
  await sql`
    update trials
    set guess = ${parsed.guess},
        confidence = ${parsed.confidence},
        reasoning = ${parsed.reasoning},
        correct = ${correct},
        status = 'verdict',
        finished_at = now()
    where id = ${row.id}
  `;
  return { ok: true as const };
}

export const checkAi = createServerFn({ method: "GET" }).handler(async () => {
  return { available: aiAvailable() };
});

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{
    finished: number;
    correct: number;
    human_trials: number;
    human_correct: number;
    machine_trials: number;
    machine_correct: number;
    imposter_trials: number;
    imposter_fooled: number;
  }>`
    select
      count(*) filter (where status = 'verdict')::int as finished,
      count(*) filter (where status = 'verdict' and correct = true)::int as correct,
      count(*) filter (where status = 'verdict' and partner_kind = 'human')::int as human_trials,
      count(*) filter (where status = 'verdict' and partner_kind = 'human' and correct = true)::int as human_correct,
      count(*) filter (where status = 'verdict' and partner_kind = 'machine')::int as machine_trials,
      count(*) filter (where status = 'verdict' and partner_kind = 'machine' and correct = true)::int as machine_correct,
      count(*) filter (where status = 'verdict' and subject_persona = 'imposter')::int as imposter_trials,
      count(*) filter (where status = 'verdict' and subject_persona = 'imposter' and guess = 'human')::int as imposter_fooled
    from trials
  `;
  const r = rows[0];
  const finished = Number(r?.finished ?? 0);
  const correct = Number(r?.correct ?? 0);
  const stats: PublicStats = {
    finished,
    correct,
    accuracy: finished > 0 ? Math.round((correct / finished) * 100) : null,
    humanTrials: Number(r?.human_trials ?? 0),
    humanCorrect: Number(r?.human_correct ?? 0),
    machineTrials: Number(r?.machine_trials ?? 0),
    machineCorrect: Number(r?.machine_correct ?? 0),
    imposterTrials: Number(r?.imposter_trials ?? 0),
    imposterFooled: Number(r?.imposter_fooled ?? 0),
  };
  return stats;
});

export const listRecentTrials = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<TrialRow>`
    select * from trials
    where status = 'verdict'
    order by finished_at desc nulls last, created_at desc
    limit 24
  `;
  return rows.map((row) => mapTrial(row, true));
});

export const listMyTrials = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<TrialRow>`
      select * from trials
      where user_id = ${context.userId}
      order by created_at desc
      limit 40
    `;
    return rows.map((row) => mapTrial(row, true));
  });

export const getTrial = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const row = await loadTrial(id);
    if (!row) return null;
    const messages = await loadMessages(id);
    return { trial: mapTrial(row, false), messages } satisfies TrialPayload;
  });

async function createTrialRow(input: {
  userId: string | null;
  mode: TrialMode;
  partnerKind: PartnerKind;
  subjectPersona: SubjectPersona | null;
}) {
  const id = crypto.randomUUID();
  const sql = await getSql();
  await sql`
    insert into trials (id, user_id, mode, partner_kind, subject_persona, status, question_count)
    values (${id}, ${input.userId}, ${input.mode}, ${input.partnerKind}, ${input.subjectPersona}, 'active', 0)
  `;
  return id;
}

export const startSubjectTrial = createServerFn({ method: "POST" })
  .middleware([optionalUserMiddleware])
  .handler(async ({ context }): Promise<ActionResult> => {
    if (!aiAvailable()) return { ok: false, error: "The model is not seated in this environment." };
    const id = await createTrialRow({
      userId: context.userId,
      mode: "subject",
      partnerKind: "human",
      subjectPersona: null,
    });
    const q = await nextQuestion([]);
    if (!q.ok) return { ok: false, error: q.error };
    await insertMessage(id, 1, "interrogator", q.text);
    const row = await loadTrial(id);
    if (!row) return { ok: false, error: "Trial vanished." };
    return { ok: true, trial: mapTrial(row, false), messages: await loadMessages(id) };
  });

export const answerSubject = createServerFn({ method: "POST" })
  .validator((input: { trialId: string; answer: string }) => ({
    trialId: String(input.trialId),
    answer: String(input.answer ?? "").trim(),
  }))
  .handler(async ({ data }): Promise<ActionResult> => {
    if (!data.answer) return { ok: false, error: "Say something first." };
    if (data.answer.length > 2000) return { ok: false, error: "Keep the answer under 2,000 characters." };
    const row = await loadTrial(data.trialId);
    if (!row || row.mode !== "subject" || row.status !== "active") {
      return { ok: false, error: "This examination is closed." };
    }
    const nextTurn = Number(row.question_count) + 1;
    if (nextTurn > QUESTION_BUDGET) return { ok: false, error: "The eight questions are spent." };

    const sql = await getSql();
    await insertMessage(row.id, nextTurn, "subject", data.answer);
    await sql`update trials set question_count = ${nextTurn} where id = ${row.id}`;

    const messages = await loadMessages(row.id);
    if (nextTurn >= QUESTION_BUDGET) {
      const verdict = await writeVerdict(row, messages);
      if (!verdict.ok) return { ok: false, error: verdict.error };
    } else {
      const q = await nextQuestion(messages);
      if (!q.ok) return { ok: false, error: q.error };
      await insertMessage(row.id, nextTurn + 1, "interrogator", q.text);
    }

    const fresh = await loadTrial(row.id);
    if (!fresh) return { ok: false, error: "Trial vanished." };
    return { ok: true, trial: mapTrial(fresh, false), messages: await loadMessages(row.id) };
  });

export const startInterrogatorTrial = createServerFn({ method: "POST" })
  .middleware([optionalUserMiddleware])
  .handler(async ({ context }): Promise<ActionResult> => {
    if (!aiAvailable()) return { ok: false, error: "The model is not seated in this environment." };
    const id = await createTrialRow({
      userId: context.userId,
      mode: "interrogator",
      partnerKind: "machine",
      subjectPersona: pickPersona(),
    });
    const row = await loadTrial(id);
    if (!row) return { ok: false, error: "Trial vanished." };
    return { ok: true, trial: mapTrial(row, false), messages: [] };
  });

export const askInterrogator = createServerFn({ method: "POST" })
  .validator((input: { trialId: string; question: string }) => ({
    trialId: String(input.trialId),
    question: String(input.question ?? "").trim(),
  }))
  .handler(async ({ data }): Promise<ActionResult> => {
    if (!data.question) return { ok: false, error: "Ask a question." };
    if (data.question.length > 600) return { ok: false, error: "Keep the question under 600 characters." };
    const row = await loadTrial(data.trialId);
    if (!row || row.mode !== "interrogator" || row.status !== "active") {
      return { ok: false, error: "This examination is closed." };
    }
    const nextTurn = Number(row.question_count) + 1;
    if (nextTurn > QUESTION_BUDGET) return { ok: false, error: "The eight questions are spent." };
    if (!row.subject_persona) return { ok: false, error: "Subject is missing." };

    const sql = await getSql();
    await insertMessage(row.id, nextTurn, "interrogator", data.question);
    const afterQ = await loadMessages(row.id);
    const a = await nextAnswer(row.subject_persona, afterQ);
    if (!a.ok) return { ok: false, error: a.error };
    await insertMessage(row.id, nextTurn, "subject", a.text);
    await sql`update trials set question_count = ${nextTurn} where id = ${row.id}`;

    const fresh = await loadTrial(row.id);
    if (!fresh) return { ok: false, error: "Trial vanished." };
    return { ok: true, trial: mapTrial(fresh, false), messages: await loadMessages(row.id) };
  });

export const submitGuess = createServerFn({ method: "POST" })
  .validator((input: { trialId: string; guess: Guess; confidence: number }) => {
    const guess = input.guess === "human" ? "human" : input.guess === "machine" ? "machine" : null;
    if (!guess) throw new Error("Choose human or machine.");
    const confidence = Math.min(100, Math.max(1, Math.round(Number(input.confidence) || 60)));
    return { trialId: String(input.trialId), guess, confidence };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    const row = await loadTrial(data.trialId);
    if (!row || row.mode !== "interrogator" || row.status !== "active") {
      return { ok: false, error: "This examination is closed." };
    }
    if (Number(row.question_count) < QUESTION_BUDGET) {
      return { ok: false, error: "Spend all eight questions first." };
    }
    const correct = data.guess === row.partner_kind;
    const sql = await getSql();
    await sql`
      update trials
      set guess = ${data.guess},
          confidence = ${data.confidence},
          reasoning = ${"Human interrogator."},
          correct = ${correct},
          status = 'verdict',
          finished_at = now()
    where id = ${row.id}
    `;
    const fresh = await loadTrial(row.id);
    if (!fresh) return { ok: false, error: "Trial vanished." };
    return { ok: true, trial: mapTrial(fresh, true), messages: await loadMessages(row.id) };
  });

const LAB_DAILY_CAP = 6;

export const startLabTrial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ActionResult> => {
    if (!aiAvailable()) return { ok: false, error: "The model is not seated in this environment." };
    const sql = await getSql();
    const recent = await sql<{ n: number }>`
      select count(*)::int as n from trials
      where user_id = ${context.userId}
        and mode = 'lab'
        and created_at > now() - interval '1 day'
    `;
    if (Number(recent[0]?.n ?? 0) >= LAB_DAILY_CAP) {
      return { ok: false, error: "The lab is booked for today. Return tomorrow, or sit the chair instead." };
    }

    const id = await createTrialRow({
      userId: context.userId,
      mode: "lab",
      partnerKind: "machine",
      subjectPersona: pickPersona(),
    });
    const q = await nextQuestion([]);
    if (!q.ok) return { ok: false, error: q.error };
    await insertMessage(id, 1, "interrogator", q.text);
    const row = await loadTrial(id);
    if (!row) return { ok: false, error: "Trial vanished." };
    return { ok: true, trial: mapTrial(row, false), messages: await loadMessages(id) };
  });

export const advanceLab = createServerFn({ method: "POST" })
  .validator((input: { trialId: string }) => ({ trialId: String(input.trialId) }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const row = await loadTrial(data.trialId);
    if (!row || row.mode !== "lab" || row.status !== "active") {
      return { ok: false, error: "This examination is closed." };
    }
    if (row.user_id && row.user_id !== context.userId) {
      return { ok: false, error: "This is someone else's observation." };
    }
    if (!row.subject_persona) return { ok: false, error: "Subject is missing." };

    const messages = await loadMessages(row.id);
    const last = messages[messages.length - 1];
    if (!last) return { ok: false, error: "Nothing to advance." };

    const sql = await getSql();

    if (last.speaker === "interrogator") {
      const a = await nextAnswer(row.subject_persona, messages);
      if (!a.ok) return { ok: false, error: a.error };
      await insertMessage(row.id, last.turn, "subject", a.text);
      await sql`update trials set question_count = ${last.turn} where id = ${row.id}`;
    } else if (Number(row.question_count) >= QUESTION_BUDGET) {
      const verdict = await writeVerdict(row, messages);
      if (!verdict.ok) return { ok: false, error: verdict.error };
    } else {
      const q = await nextQuestion(messages);
      if (!q.ok) return { ok: false, error: q.error };
      await insertMessage(row.id, Number(row.question_count) + 1, "interrogator", q.text);
    }

    const fresh = await loadTrial(row.id);
    if (!fresh) return { ok: false, error: "Trial vanished." };
    return { ok: true, trial: mapTrial(fresh, false), messages: await loadMessages(row.id) };
  });
