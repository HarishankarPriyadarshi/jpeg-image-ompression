import { useEffect, useState } from "react";

// true while the window is at most `px` wide (used to shorten long numbers on phones)
export default function useNarrow(px = 480) {
  const get = () => typeof window !== "undefined" && window.innerWidth <= px;
  const [narrow, setNarrow] = useState(get);
  useEffect(() => {
    const onResize = () => setNarrow(get());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [px]);
  return narrow;
}
