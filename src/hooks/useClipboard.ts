import { useState, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Hook para copiar texto para clipboard
 * @returns { copy, copied } - Função copy e status
 * 
 * @example
 * const { copy, copied } = useClipboard();
 * <Button onClick={() => copy(text)}>
 *   {copied ? '✓ Copiado' : 'Copiar'}
 * </Button>
 */
export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('✓ Copiado!');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Falha ao copiar');
      console.error('Clipboard error:', err);
    }
  };

  return { copy, copied };
}
