import { create } from 'zustand';
import { Feed, Schedule, LogEntry, Category, Author } from '@/types';

interface AppState {
  // Data
  feeds: Feed[];
  schedules: Schedule[];
  logs: LogEntry[];
  categories: Category[];
  authors: Author[];
  
  // Actions - Feeds
  addFeed: (feed: Feed) => void;
  updateFeed: (id: string, feed: Partial<Feed>) => void;
  deleteFeed: (id: string) => void;
  
  // Actions - Schedules
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (id: string, schedule: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  toggleScheduleActive: (id: string) => void;
  
  // Actions - Logs
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  
  // Actions - Categories & Authors
  addCategory: (category: Category) => void;
  addAuthor: (author: Author) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial empty state
  feeds: [],
  schedules: [],
  logs: [],
  categories: [
    { id: '1', name: 'Tecnologia', slug: 'tecnologia' },
    { id: '2', name: 'Negócios', slug: 'negocios' },
    { id: '3', name: 'Ciência', slug: 'ciencia' },
    { id: '4', name: 'Saúde', slug: 'saude' },
    { id: '5', name: 'Entretenimento', slug: 'entretenimento' },
  ],
  authors: [],
  
  // Feed actions
  addFeed: (feed) => set((state) => ({ 
    feeds: [...state.feeds, feed] 
  })),
  
  updateFeed: (id, updates) => set((state) => ({
    feeds: state.feeds.map(f => f.id === id ? { ...f, ...updates } : f)
  })),
  
  deleteFeed: (id) => set((state) => ({
    feeds: state.feeds.filter(f => f.id !== id),
    schedules: state.schedules.filter(s => s.feedId !== id),
    logs: state.logs.filter(l => l.feedId !== id)
  })),
  
  // Schedule actions
  addSchedule: (schedule) => set((state) => ({
    schedules: [...state.schedules, schedule]
  })),
  
  updateSchedule: (id, updates) => set((state) => ({
    schedules: state.schedules.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
  
  deleteSchedule: (id) => set((state) => ({
    schedules: state.schedules.filter(s => s.id !== id)
  })),
  
  toggleScheduleActive: (id) => set((state) => ({
    schedules: state.schedules.map(s => 
      s.id === id ? { ...s, isActive: !s.isActive } : s
    )
  })),
  
  // Log actions
  addLog: (log) => set((state) => ({
    logs: [log, ...state.logs].slice(0, 1000) // Keep last 1000 logs
  })),
  
  clearLogs: () => set({ logs: [] }),
  
  // Category & Author actions
  addCategory: (category) => set((state) => ({
    categories: [...state.categories, category]
  })),
  
  addAuthor: (author) => set((state) => ({
    authors: [...state.authors, author]
  })),
}));

// Helper selectors (pure functions, not in store)
export const selectFeedById = (feeds: Feed[], id: string) => 
  feeds.find(f => f.id === id);

export const selectScheduleByFeedId = (schedules: Schedule[], feedId: string) => 
  schedules.find(s => s.feedId === feedId);

export const selectLogsByFeedId = (logs: LogEntry[], feedId: string) => 
  logs.filter(l => l.feedId === feedId);

export const selectCategoryById = (categories: Category[], id: string) => 
  categories.find(c => c.id === id);
