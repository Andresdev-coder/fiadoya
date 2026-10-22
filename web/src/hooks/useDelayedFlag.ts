import { useEffect, useState } from "react";

export function useDelayedFlag(active: boolean, delay = 3000) {
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    if (!active) {
      setFlag(false);
      return;
    }
    const t = setTimeout(() => setFlag(true), delay);
    return () => clearTimeout(t);
  }, [active, delay]);

  return flag;
}