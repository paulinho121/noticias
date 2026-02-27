import { supabase } from '@/integrations/supabase/client';

export interface Feed {
  id: string;
  name: string;
  url: string;
  category_id: string | null;
  author_id: string | null;
  post_status: 'draft' | 'published' | 'scheduled';
  auto_publish: boolean;
  extract_images: boolean;
  image_selector: string | null;
  avoid_logo: boolean;
  is_active: boolean;
  custom_prompt: string | null;
  is_pending_review: boolean;
  source_type: 'rss' | 'keywords';
  keywords: string | null;
  image_engine: 'scraped' | 'google_gemini' | 'dalle' | 'banana' | 'nano_banana' | 'pexels' | 'grok' | 'xai' | 'gemini_2_5';
  generate_highlights: boolean;
  credit_source: boolean;
  image_credit_text: string | null;
  include_source_link: boolean;
  enhance_scraped_image: boolean;
  target_platform: 'wordpress' | 'blogger' | 'custom_api' | 'local';
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
  status: 'pending' | 'processing' | 'success' | 'error' | 'published' | 'ready';
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  slug: string | null;
  meta_description: string | null;
  tags: string[] | null;
  keywords: string[] | null;
  social_summary: string | null;
  viral_titles: string[] | null;
  published_url: string | null;
  rewritten_image: string | null;
  source_video?: string | null;
  feeds?: { 
    name: string;
    custom_prompt?: string;
    credit_source?: boolean;
    image_credit_text?: string | null;
  };
}

export interface LogEntry {
  id: string;
  feed_id: string | null;
  feed_item_id: string | null;
  source_url: string | null;
  source_title: string | null;
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
  user_id?: string | null;
  external_id?: string | null;
  created_at: string;
}

// Feeds API
export const feedsApi = {
  async getAll(): Promise<Feed[]> {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Feed[];
  },

  async getById(id: string): Promise<Feed | null> {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Feed;
  },

  async create(feed: Omit<Feed, 'id' | 'created_at' | 'updated_at'>): Promise<Feed> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Buscar a organização do usuário - usar maybeSingle mas tratar nulos
    const { data: memberData } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user?.id)
      .limit(1)
      .maybeSingle();

    const insertData: any = {
      ...feed,
      organization_id: memberData?.organization_id || null,
      custom_prompt: feed.custom_prompt || null,
      is_pending_review: feed.is_pending_review ?? false,
      source_type: feed.source_type ?? 'rss',
      keywords: feed.keywords || null,
      image_engine: feed.image_engine ?? 'scraped',
      generate_highlights: feed.generate_highlights ?? false,
      credit_source: feed.credit_source ?? false,
      image_credit_text: feed.image_credit_text || null,
      include_source_link: feed.include_source_link ?? false,
      enhance_scraped_image: (feed as any).enhance_scraped_image ?? false
    };

    // Tentar setar user_id e author_id se o banco suportar
    if (user?.id) {
      insertData.user_id = user.id;
      insertData.author_id = user.id;
    }

    const { data, error } = await supabase
      .from('feeds')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data as Feed;
  },

  async update(id: string, updates: Partial<Feed>): Promise<Feed> {
    const { data, error } = await supabase
      .from('feeds')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Feed;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('feeds')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async processFeed(feedId: string): Promise<{ success: boolean; error?: string; itemsFetched?: number; itemsRewritten?: number }> {
    const { data, error } = await supabase.functions.invoke('process-feed', {
      body: { feedId },
    });

    if (error) throw error;
    return data;
  },
};

// Schedules API
export const schedulesApi = {
  async getAll(): Promise<Schedule[]> {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Schedule[];
  },

  async getByFeedId(feedId: string): Promise<Schedule | null> {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('feed_id', feedId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Schedule | null;
  },

  async create(schedule: Omit<Schedule, 'id' | 'created_at'>): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .insert(schedule)
      .select()
      .single();

    if (error) throw error;
    return data as Schedule;
  },

  async update(id: string, updates: Partial<Schedule>): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Schedule;
  },

  async toggleActive(id: string): Promise<Schedule> {
    const { data: current, error: fetchError } = await supabase
      .from('schedules')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('schedules')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Schedule;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Feed Items API
export const feedItemsApi = {
  async getAll(): Promise<FeedItem[]> {
    const { data, error } = await supabase
      .from('feed_items')
      .select('*, feeds(name, credit_source, image_credit_text)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as FeedItem[];
  },

  async getByFeedId(feedId: string): Promise<FeedItem[]> {
    const { data, error } = await supabase
      .from('feed_items')
      .select('*, feeds(name, credit_source, image_credit_text)')
      .eq('feed_id', feedId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as FeedItem[];
  },

  async rewriteItem(itemId: string, title: string, content: string, tone?: string, onlyImage?: boolean, customImagePrompt?: string, customSourceImageB64?: string): Promise<{ success: boolean; error?: string; rewritten?: any; queued?: boolean; status?: number }> {
    const { data, error } = await supabase.functions.invoke('rewrite-content', {
      body: { feedItemId: itemId, title, content, tone, onlyImage, customImagePrompt, customSourceImageB64 },
    });

    if (error) throw error;
    return data;
  },

  async publishToWordpress(feedItemId: string): Promise<{ success: boolean; error?: string; link?: string }> {
    const { data, error } = await supabase.functions.invoke('publish-to-wordpress', {
      body: { feedItemId },
    });

    if (error) throw error;
    return data;
  },

  async publishToBlogger(feedItemId: string): Promise<{ success: boolean; error?: string; email_id?: string }> {
    const { data, error } = await supabase.functions.invoke('publish-to-blogger', {
      body: { feedItemId },
    });

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<FeedItem>): Promise<FeedItem> {
    const { data, error } = await supabase
      .from('feed_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FeedItem;
  },

  async create(item: Omit<FeedItem, 'id' | 'created_at'>): Promise<FeedItem> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('feed_items')
      .insert({
        ...item,
        user_id: user?.id,
        status: item.status || 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as FeedItem;
  },
};

// Logs API
export const logsApi = {
  async getAll(): Promise<LogEntry[]> {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data || []) as LogEntry[];
  },

  async getByFeedId(feedId: string): Promise<LogEntry[]> {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('feed_id', feedId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as LogEntry[];
  },

  async clear(): Promise<void> {
    const { error } = await supabase
      .from('logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) throw error;
  },

  async deleteLog(logId: string): Promise<void> {
    const { error } = await supabase
      .from('logs')
      .delete()
      .eq('id', logId);
    if (error) throw error;
  },

  async cancelProcessing(logId: string, feedItemId?: string): Promise<void> {
    // 1. Delete the log entry
    const { error: logError } = await supabase
      .from('logs')
      .delete()
      .eq('id', logId);
    if (logError) throw logError;

    // 2. If we have a feed item ID, move it back to pending
    if (feedItemId) {
      const { error: itemError } = await supabase
        .from('feed_items')
        .update({ status: 'pending' })
        .eq('id', feedItemId);
      if (itemError) throw itemError;
    }
  },

  async clearAllProcessing(): Promise<void> {
    // 1. Get all IDs of items currently in processing to reset them
    const { data: activeLogs } = await supabase
      .from('logs')
      .select('feed_item_id')
      .eq('status', 'processing');
    
    const itemIds = Array.from(new Set(activeLogs?.map(l => l.feed_item_id).filter(Boolean) || []));

    // 2. Delete all processing logs
    const { error: logError } = await supabase
      .from('logs')
      .delete()
      .eq('status', 'processing');
    if (logError) throw logError;

    // 3. Reset items
    if (itemIds.length > 0) {
      await supabase
        .from('feed_items')
        .update({ status: 'pending' })
        .in('id', itemIds);
    }
  },
};

// Categories API
export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Category[];
  },

  async create(category: { name: string; slug: string; external_id?: string | null }): Promise<Category> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Buscar a organização do usuário
    const { data: memberData } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user?.id)
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        user_id: user?.id || null,
        organization_id: memberData?.organization_id || null
      })
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async syncWordPressCategories(): Promise<{ success: boolean; count: number; categories: Category[] }> {
    const { data, error } = await supabase.functions.invoke('sync-wordpress-categories');
    if (error) throw error;
    return data;
  },
};

// Platform Settings API
export const platformSettingsApi = {
  async getAll(): Promise<any[]> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user?.id) return [];

    const { data, error } = await (supabase as any)
      .from('platform_settings_secure')
      .select('*')
      .eq('user_id', currentUser.user.id);

    if (error) throw error;
    return data || [];
  },

  async save(platformId: string, credentials: any, isConnected: boolean, isAutoPublishValue: boolean): Promise<void> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user?.id) throw new Error('Usuário não autenticado');

    // Fetch organization_id
    const { data: memberData } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', currentUser.user.id)
      .maybeSingle();

    const { error } = await (supabase as any)
      .from('platform_settings')
      .upsert({
        user_id: currentUser.user.id,
        organization_id: memberData?.organization_id || null,
        platform_id: platformId,
        credentials,
        is_connected: isConnected,
        is_auto_publish: isAutoPublishValue,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,platform_id' 
      });

    if (error) throw error;
  },

  async disconnect(platformId: string): Promise<void> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user?.id) return;

    const { error } = await (supabase as any)
      .from('platform_settings')
      .update({ is_connected: false })
      .eq('platform_id', platformId)
      .eq('user_id', currentUser.user.id);

    if (error) throw error;
  }
};

// White Label API
export const whiteLabelApi = {
  async save(settings: { 
    app_name?: string; 
    logo_url?: string; 
    primary_color?: string;
    hero_title?: string;
    hero_subtitle?: string;
    ai_model?: string;
    writing_tone?: string;
    system_prompt?: string | null;
    seo_optimized?: boolean;
    plagiarism_check?: boolean;
    extract_images?: boolean;
    avoid_logo?: boolean;
    image_size?: string;
    image_instruction?: string;
    ai_provider?: string;
    image_provider?: string;
  }): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Usuário não autenticado');

    const { data: memberData } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!memberData) throw new Error('Organização não encontrada');

    const orgId = memberData.organization_id;

    // Update organizations table if needed
    if (settings.logo_url || settings.primary_color) {
      const orgUpdates: any = {};
      if (settings.logo_url !== undefined) orgUpdates.logo_url = settings.logo_url;
      if (settings.primary_color !== undefined) orgUpdates.primary_color = settings.primary_color;
      
      const { error: orgError } = await (supabase as any)
        .from('organizations')
        .update(orgUpdates)
        .eq('id', orgId);
      
      if (orgError) throw orgError;
    }

    // Update white_label_settings table
    const wlUpdates: any = {};
    if (settings.app_name !== undefined) wlUpdates.app_name = settings.app_name;
    if (settings.hero_title !== undefined) wlUpdates.hero_title = settings.hero_title;
    if (settings.hero_subtitle !== undefined) wlUpdates.hero_subtitle = settings.hero_subtitle;
    
    // New AI & Media Fields
    if (settings.ai_model !== undefined) wlUpdates.ai_model = settings.ai_model;
    if (settings.writing_tone !== undefined) wlUpdates.writing_tone = settings.writing_tone;
    if (settings.system_prompt !== undefined) wlUpdates.system_prompt = settings.system_prompt;
    if (settings.seo_optimized !== undefined) wlUpdates.seo_optimized = settings.seo_optimized;
    if (settings.plagiarism_check !== undefined) wlUpdates.plagiarism_check = settings.plagiarism_check;
    if (settings.extract_images !== undefined) wlUpdates.extract_images = settings.extract_images;
    if (settings.avoid_logo !== undefined) wlUpdates.avoid_logo = settings.avoid_logo;
    if (settings.image_size !== undefined) wlUpdates.image_size = settings.image_size;
    if (settings.image_instruction !== undefined) wlUpdates.image_instruction = settings.image_instruction;
    if (settings.ai_provider !== undefined) wlUpdates.ai_provider = settings.ai_provider;
    if (settings.image_provider !== undefined) wlUpdates.image_provider = settings.image_provider;

    const { error: wlError } = await (supabase as any)
      .from('white_label_settings')
      .update(wlUpdates)
      .eq('organization_id', orgId);

    if (wlError) throw wlError;
  }
};

// Maintenance API
export const maintenanceApi = {
  async runSqlOnce(): Promise<any> {
    const { data, error } = await supabase.functions.invoke('run-sql-once');
    if (error) throw error;
    return data;
  }
};
