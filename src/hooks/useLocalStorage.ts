import { useState, useEffect } from 'react';

/**
 * Hook para persistir dados em localStorage
 * @param key - Chave no localStorage
 * @param initialValue - Valor inicial
 * @returns [value, setValue] - Como useState
 * 
 * @example
 * const [activeTab, setActiveTab] = useLocalStorage('settings-tab', 'api');
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Erro ao ler localStorage[${key}]`, error);
      return initialValue;
    }
  });

  const setStoredValue = (newValue: T) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Erro ao escrever localStorage[${key}]`, error);
    }
  };

  return [value, setStoredValue];
}
