"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Reusable OTP entry — ready to wire to phone/email verification later. */
export function OtpInput({
  length = 6,
  onComplete,
  className,
}: {
  length?: number;
  onComplete?: (code: string) => void;
  className?: string;
}) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const set = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[i] = digit;
    setValues(next);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) onComplete?.(next.join(""));
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={v}
          inputMode="numeric"
          maxLength={1}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !values[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          className="h-12 w-11 rounded-lg border border-input bg-background/60 text-center text-lg font-semibold outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
      ))}
    </div>
  );
}
