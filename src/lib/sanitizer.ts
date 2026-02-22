import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML removendo scripts e tags perigosas
 * @param dirty - HTML potencialmente sujo
 * @returns HTML seguro e limpo
 * 
 * @example
 * const safeHTML = sanitizeHTML(userContent);
 * <div dangerouslySetInnerHTML={{ __html: safeHTML }} />
 */
export const sanitizeHTML = (dirty: string | undefined): string => {
  if (!dirty) return '';

  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
      'span', 'div'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'target', 'rel', 'class'
    ],
    KEEP_CONTENT: true,
  };

  return DOMPurify.sanitize(dirty, config) as string;
};

/**
 * Sanitiza texto removendo toda a formatação HTML
 * @param dirty - Texto potencialmente sujo
 * @returns Texto limpo sem HTML
 * 
 * @example
 * const safeText = sanitizeText(userInput);
 */
export const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitiza atributos HTML
 * @param dirty - Atributo potencialmente sujo
 * @returns Atributo limpo
 */
export const sanitizeAttributes = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};
