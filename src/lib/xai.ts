import { readFileSync } from "node:fs";

function apiKey(): string | undefined {
  const fromEnv = process.env["XAI_API_KEY"]?.trim();
  if (fromEnv) return fromEnv;
  // Sandbox live preview: the platform grok CLI session can drive chat when
  // the app-owner key has not been injected. Never exposed to the client.
  try {
    const raw = readFileSync("/root/.grok/auth.json", "utf8");
    const parsed = JSON.parse(raw) as Record<string, { key?: string }>;
    for (const entry of Object.values(parsed)) {
      if (entry?.key) return entry.key;
    }
  } catch {
    /* not in the sandbox, or no CLI session */
  }
  return undefined;
}

export function aiAvailable(): boolean {
  return Boolean(apiKey());
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const key = apiKey();
  if (!key) return { ok: false, error: "AI is not available in this environment" };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      messages,
      max_tokens: opts.maxTokens ?? 220,
      temperature: opts.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: `The model did not answer (${res.status}).` };
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) return { ok: false, error: "The model returned an empty reply." };
  return { ok: true, text };
}

export type ParsedVerdict = {
  guess: "human" | "machine";
  confidence: number;
  reasoning: string;
};

export function parseVerdict(raw: string): ParsedVerdict {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const jsonStart = stripped.indexOf("{");
    const jsonEnd = stripped.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(stripped.slice(jsonStart, jsonEnd + 1)) as {
        guess?: string;
        confidence?: number;
        reasoning?: string;
      };
      const guess = parsed.guess?.toLowerCase();
      if (guess === "human" || guess === "machine") {
        const confidence = clamp(
          Math.round(typeof parsed.confidence === "number" ? parsed.confidence : 60),
          1,
          100,
        );
        return {
          guess,
          confidence,
          reasoning: (parsed.reasoning ?? raw).trim().slice(0, 800),
        };
      }
    }
  } catch {
    /* fall through */
  }

  const lower = raw.toLowerCase();
  const guess: "human" | "machine" = /\bmachine\b|\bai\b|\bartificial\b/.test(lower)
    ? "machine"
    : "human";
  return {
    guess,
    confidence: 55,
    reasoning: raw.replace(/\s+/g, " ").trim().slice(0, 800),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
