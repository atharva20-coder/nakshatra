// src/hooks/use-debounce.ts
"use client";

import { useEffect, useMemo } from 'react';
import { debounce } from 'lodash';

// --- FIX: Use type-safe generics for parameters and return type ---
export const useDebounce = <TParams extends unknown[], TReturn>(
  callback: (...args: TParams) => TReturn,
  wait: number
) => {
  const debounced = useMemo(
    () =>
      debounce(callback, wait, {
        leading: false,
        trailing: true,
      }),
    [callback, wait]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debounced.cancel();
    };
  }, [debounced]);

  return debounced;
};