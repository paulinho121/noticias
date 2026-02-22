/**
 * Constantes de status para feeds
 */
export const FEED_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
} as const;

export type FeedStatus = typeof FEED_STATUS[keyof typeof FEED_STATUS];

/**
 * Constantes de status para feed items
 */
export const ITEM_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
  PUBLISHED: 'published',
  READY: 'ready',
} as const;

export type ItemStatus = typeof ITEM_STATUS[keyof typeof ITEM_STATUS];

/**
 * Constantes de status para logs
 */
export const LOG_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PROCESSING: 'processing',
  PENDING: 'pending',
} as const;

export type LogStatus = typeof LOG_STATUS[keyof typeof LOG_STATUS];

/**
 * Constantes de source type
 */
export const SOURCE_TYPE = {
  RSS: 'rss',
  KEYWORDS: 'keywords',
} as const;

export type SourceType = typeof SOURCE_TYPE[keyof typeof SOURCE_TYPE];

/**
 * Constantes de plataforma de destino
 */
export const TARGET_PLATFORM = {
  WORDPRESS: 'wordpress',
  BLOGGER: 'blogger',
  CUSTOM_API: 'custom_api',
  LOCAL: 'local',
} as const;

export type TargetPlatform = typeof TARGET_PLATFORM[keyof typeof TARGET_PLATFORM];

/**
 * Constantes de engine de imagem
 */
export const IMAGE_ENGINE = {
  SCRAPED: 'scraped',
  GOOGLE_GEMINI: 'google_gemini',
  DALLE: 'dalle',
  BANANA: 'banana',
  NANO_BANANA: 'nano_banana',
  PEXELS: 'pexels',
  GROK: 'grok',
  XAI: 'xai',
  GEMINI_2_5: 'gemini_2_5',
} as const;

export type ImageEngine = typeof IMAGE_ENGINE[keyof typeof IMAGE_ENGINE];
