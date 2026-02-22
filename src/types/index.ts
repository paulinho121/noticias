export interface Feed {
  id: string;
  name: string;
  url: string | null;
  category_id: string | null;
  author_id: string | null;
  post_status: 'draft' | 'published' | 'scheduled';
  auto_publish: boolean;
  extract_images: boolean;
  image_selector: string | null;
  avoid_logo: boolean;
  credit_source: boolean;
  image_credit_text: string | null;
  is_active: boolean;
  custom_prompt: string | null;
  is_pending_review: boolean;
  source_type: 'rss' | 'keywords';
  keywords: string | null;
  image_engine: 'scraped' | 'dalle' | 'banana' | 'pexels';
  generate_highlights: boolean;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  feed_id: string;
  schedule_type: 'fixed' | 'interval';
  schedule_time: string | null;
  interval_minutes: number | null;
  days: string[];
  last_run: string | null;
  next_run: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FeedItem {
  id: string;
  feed_id: string;
  source_url: string;
  source_title: string;
  source_content: string | null;
  source_image: string | null;
  source_pub_date: string | null;
  rewritten_title: string | null;
  rewritten_content: string | null;
  status: 'pending' | 'processing' | 'success' | 'error' | 'published';
  error_message: string | null;
  slug: string | null;
  meta_description: string | null;
  tags: string[] | null;
  viral_titles: string[] | null;
  rewritten_image: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface LogEntry {
  id: string;
  feed_id: string;
  source_url: string;
  source_title: string;
  status: 'success' | 'error' | 'processing' | 'pending';
  step: string;
  message: string;
  error_details: string | null;
  post_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Author {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}
