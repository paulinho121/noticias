import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * @param value - O valor a debounce
 * @param delay - Delay em milissegundos (padrão: 300ms)
 * @returns O valor debounceado
 * 
 * @example
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
