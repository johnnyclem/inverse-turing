import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { QuestionMeter } from "@/components/question-meter";
import { modeCopy, type TrialMode } from "@/lib/protocol";

export function RoomShell({
  mode,
  current,
  live = false,
  children,
  footer,
}: {
  mode: TrialMode;
  current: number;
  live?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const copy = modeCopy(mode);
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader solid />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
              Protocol {copy.numeral} · {copy.title}
            </p>
            <h1 className="mt-2 font-display text-3xl italic text-fg sm:text-4xl">{copy.verb}</h1>
          </div>
          <div className="flex items-center gap-3">
            {live ? (
              <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                Live
              </span>
            ) : null}
            <Link
              to="/"
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted hover:text-fg"
            >
              Leave
            </Link>
          </div>
        </div>

        <div className="grid flex-1 gap-10 lg:grid-cols-[10rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <QuestionMeter current={current} />
            </div>
          </aside>
          <div className="flex min-w-0 flex-col">
            <div className="mb-6 lg:hidden">
              <QuestionMeter current={current} compact />
            </div>
            <div className="min-w-0 flex-1">{children}</div>
            {footer ? <div className="sticky bottom-0 mt-8 bg-bg/95 pb-2 pt-3 backdrop-blur-sm">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
