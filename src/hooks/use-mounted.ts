"use client";

import { useEffect, useState } from "react";

/** True after first client mount — gate persisted/store-driven UI to avoid
 *  hydration mismatches. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
