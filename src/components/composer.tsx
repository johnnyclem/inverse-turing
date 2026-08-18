import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function Composer({
  placeholder,
  submitLabel,
  disabled,
  onSubmit,
}: {
  placeholder: string;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = value.trim();
    if (!next || busy || disabled) return;
    setBusy(true);
    try {
      await onSubmit(next);
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="border border-border bg-surface p-3 sm:p-4">
      <label className="sr-only" htmlFor="inverse-composer">
        {placeholder}
      </label>
      <textarea
        id="inverse-composer"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={busy || disabled}
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-fg placeholder:text-faint focus:outline-none disabled:opacity-50"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="hidden text-[11px] text-faint sm:block">⌘ / Ctrl + Enter to send</p>
        <Button type="submit" disabled={busy || disabled || !value.trim()} className="ml-auto">
          {busy ? "Sending…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
