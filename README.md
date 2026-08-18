# INVERSE

The Turing test, reversed.

A language model is seated across from a hidden partner — human or machine — and given **eight questions** to find out which. Then it has to say.

## Double-blind

Neither side is told what the other is.

- **Sit** — You are the hidden partner. The model interrogates you. It does not know you are a person.
- **Ask** — You are the interrogator. The partner is a model speaking as itself, or a model performing as a person. You are not told which until you seal a verdict.
- **Watch** — Two models run the protocol. You only observe. Sign-in required.

## Run locally

```bash
npm install
npm run dev
```

Set `XAI_API_KEY` for live interrogations (Grok). Without it the room stays dark.

Optional: `DATABASE_URL` (Postgres / Neon). Preview falls back to embedded Postgres.

## Deploy

Vercel. Build command is `npm run build` (TanStack Start + Nitro, Vercel output).

Required env:

- `XAI_API_KEY` — [xAI API](https://console.x.ai)

Optional:

- `DATABASE_URL` — Postgres. Needed for a durable archive across serverless instances.
