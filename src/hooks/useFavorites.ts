import { useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Hook para gerenciar feeds/items favoritos
 * Persiste em localStorage
 * 
 * @example
 * const { favorites, isFavorite, toggle } = useFavorites();
 * 
 * <Button onClick={() => toggle(feedId)}>
 *   {isFavorite(feedId) ? '⭐' : '☆'}
 * </Button>
 */
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>(
    'favorite-feeds',
    []
  );

  const isFavorite = (feedId: string): boolean => {
    return favorites.includes(feedId);
  };

  const toggle = (feedId: string) => {
    setFavorites(prev =>
      prev.includes(feedId)
        ? prev.filter(id => id !== feedId)
        : [...prev, feedId]
    );
  };

  const add = (feedId: string) => {
    if (!isFavorite(feedId)) {
      setFavorites(prev => [...prev, feedId]);
    }
  };

  const remove = (feedId: string) => {
    setFavorites(prev => prev.filter(id => id !== feedId));
  };

  return { favorites, isFavorite, toggle, add, remove };
}
