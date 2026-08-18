import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">Identify</p>
        <h1 className="mt-3 font-display text-4xl italic text-fg">Take a seat</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Sign in to watch the lab and keep your examinations in the archive. Sitting
          and asking can be done as a guest.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled in this environment.</p>
          )}
        </div>
        <Link to="/" className="mt-8 text-sm text-muted hover:text-fg">
          Return to the protocol
        </Link>
      </main>
    </div>
  );
}
