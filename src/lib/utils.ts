import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from "dompurify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'span', 'blockquote'],
    ALLOWED_ATTR: ['class', 'style']
  });
}

export function getHighResImage(url: string | null): string | null {
  if (!url) return url;
  
  // Anti-Bloqueio: Se for URL assinada ou de proxy conhecido, NÃO TOCAR.
  // Mudanças na URL (como re-ordenar parâmetros ou remover tags) quebram a assinatura HMAC.
  if (url.includes('glbimg.com') || 
      url.includes('oaidalleapiprodscus.blob.core.windows.net') ||
      url.includes('fbcdn.net') || 
      url.includes('googleusercontent.com') ||
      url.includes('wp-content')) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    // Removemos apenas parâmetros de redimensionamento conhecidos.
    const resizeParams = ['w', 'h', 'resize', 'fit', 'quality', 'zoom', 'width', 'height'];
    resizeParams.forEach(p => { if (urlObj.searchParams.has(p)) urlObj.searchParams.delete(p); });
    let cleaned = urlObj.toString();
    cleaned = cleaned.replace(/-(\d+)x(\d+)(\.(?:jpg|jpeg|png|webp|gif))$/i, '$3');
    return cleaned;
  } catch (e) {
    return url;
  }
}

export function safeParseAiContent(title: string | null, content: string | null) {
  const cleanTitle = (t: string | null) => {
    if (!t) return t;
    return t.replace(/\s*[\(\[]\s*(Reescrito|Processado)\s*[\)\]]\s*$/gi, '').trim();
  };

  const result: { 
    title: string | null, 
    content: string | null, 
    slug?: string, 
    metaDescription?: string, 
    socialSummary?: string, 
    tags?: string[], 
    keywords?: string[],
    isParsed?: boolean 
  } = { 
    title: cleanTitle(title), 
    content: content?.trim() || null 
  };

  if (!content) return result;
  
  const text = content.trim();
  
  // Try to find JSON structure
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const maybeJson = text.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(maybeJson);
      
      if (parsed.title || parsed.content) {
        let extractedContent = parsed.content;
        
        if (Array.isArray(extractedContent)) {
          extractedContent = extractedContent.map((block: any) => typeof block === 'string' ? block : (block.text || '')).join('\n\n');
        } else if (typeof extractedContent === 'object' && extractedContent !== null) {
          extractedContent = JSON.stringify(extractedContent, null, 2);
        }

        return {
          title: cleanTitle(parsed.title || title),
          content: extractedContent || 'Conteúdo não identificado.',
          slug: parsed.slug,
          metaDescription: parsed.meta_description || parsed.metaDescription,
          socialSummary: parsed.social_summary || parsed.socialSummary,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          isParsed: true
        };
      }
    } catch (e) {}
  }

  // Regex fallbacks for non-JSON or partial JSON
  const extractField = (pattern: RegExp) => {
    const match = text.match(pattern);
    return match ? match[1].trim() : undefined;
  };

  const slug = extractField(/"slug":\s*"([^"]+)"/) || extractField(/Slug:\s*([^\n]+)/);
  const meta = extractField(/"meta_description":\s*"([^"]+)"/) || extractField(/Meta:\s*([^\n]+)/);
  const social = extractField(/"social_summary":\s*"([^"]+)"/) || extractField(/Resumo:\s*([^\n]+)/);
  
  if (slug) result.slug = slug;
  if (meta) result.metaDescription = meta;
  if (social) result.socialSummary = social;
  
  return result;
}
