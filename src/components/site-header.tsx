import { Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/play/subject" as const, label: "Sit" },
  { to: "/play/interrogator" as const, label: "Ask" },
  { to: "/play/lab" as const, label: "Watch" },
  { to: "/archive" as const, label: "Archive" },
];

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/80",
        solid ? "bg-bg" : "bg-bg/80 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
          <span className="font-display text-lg italic tracking-tight text-fg">Inverse</span>
        </Link>
        <nav className="hidden items-center gap-6 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition-colors hover:text-fg"
              activeProps={{ className: "text-fg" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AuthSlot />
      </div>
      <nav className="flex items-center justify-between border-t border-border/60 px-4 py-2 sm:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted"
            activeProps={{ className: "text-fg" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-20 animate-pulse rounded-sm bg-raised" />;
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted transition-colors hover:text-primary"
      >
        Sign in
      </Link>
    );
  }
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[10rem] truncate text-xs text-muted sm:inline">{label}</span>
      <button
        type="button"
        onClick={() => void signOut("/")}
        className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted transition-colors hover:text-fg"
      >
        Sign out
      </button>
    </div>
  );
}
