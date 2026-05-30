import { useState, useEffect, useCallback } from 'react';

let globalTimeOffset: number | null = null;
let fetching = false;

export function useServerTime() {
  const [offset, setOffset] = useState<number | null>(globalTimeOffset);

  useEffect(() => {
    if (globalTimeOffset !== null || fetching) return;
    
    fetching = true;
    fetch('/api/time')
      .then(res => res.json())
      .then(data => {
        const localNow = Date.now();
        const serverNow = data.serverTime;
        const calcOffset = serverNow - localNow;
        globalTimeOffset = calcOffset;
        setOffset(calcOffset);
      })
      .catch(err => {
        console.error('Failed to sync server time', err);
        globalTimeOffset = 0; // fallback
        setOffset(0);
      })
      .finally(() => {
        fetching = false;
      });
  }, []);

  const now = useCallback(() => Date.now() + (offset || 0), [offset]);

  return {
    isSynced: offset !== null,
    now,
  };
}
