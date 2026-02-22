import { useState, useEffect } from 'react';

export type Palette = 
  | 'blue' 
  | 'purple' 
  | 'green' 
  | 'rose' 
  | 'orange' 
  | 'gold' 
  | 'emerald' 
  | 'ruby' 
  | 'midnight' 
  | 'cyan';

const ALL_PALETTES: Palette[] = [
  'blue', 'purple', 'green', 'rose', 'orange', 
  'gold', 'emerald', 'ruby', 'midnight', 'cyan'
];

export function usePalette() {
  const [palette, setPalette] = useState<Palette>(() => {
    const saved = localStorage.getItem('theme-palette');
    return (saved as Palette) || 'blue';
  });

  useEffect(() => {
    // Remove old themes
    ALL_PALETTES.forEach(t => document.body.classList.remove(`theme-${t}`));
    
    // Add new theme
    document.body.classList.add(`theme-${palette}`);
    localStorage.setItem('theme-palette', palette);
  }, [palette]);

  return { palette, setPalette };
}
