import { Feed, Schedule, LogEntry, DashboardStats, Category, Author } from '@/types';

export const mockCategories: Category[] = [
  { id: '1', name: 'Tecnologia', slug: 'tecnologia' },
  { id: '2', name: 'Negócios', slug: 'negocios' },
  { id: '3', name: 'Ciência', slug: 'ciencia' },
  { id: '4', name: 'Saúde', slug: 'saude' },
  { id: '5', name: 'Entretenimento', slug: 'entretenimento' },
];

export const mockAuthors: Author[] = [
  { id: '1', name: 'Ana Silva', email: 'ana@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana' },
  { id: '2', name: 'Carlos Santos', email: 'carlos@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos' },
  { id: '3', name: 'Maria Costa', email: 'maria@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria' },
];

export const mockFeeds: Feed[] = [
  {
    id: '1',
    name: 'TechCrunch Brasil',
    url: 'https://techcrunch.com/feed/',
    categoryId: '1',
    authorId: '1',
    postStatus: 'published',
    autoPublish: true,
    extractImages: true,
    avoidLogo: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    name: 'Folha de São Paulo - Economia',
    url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml',
    categoryId: '2',
    authorId: '2',
    postStatus: 'draft',
    autoPublish: false,
    extractImages: true,
    avoidLogo: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '3',
    name: 'Nature News',
    url: 'https://www.nature.com/nature.rss',
    categoryId: '3',
    authorId: '3',
    postStatus: 'scheduled',
    autoPublish: true,
    extractImages: true,
    imageSelector: '.article-image img',
    avoidLogo: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-22'),
  },
  {
    id: '4',
    name: 'G1 - Saúde',
    url: 'https://g1.globo.com/rss/g1/saude/',
    categoryId: '4',
    authorId: '1',
    postStatus: 'published',
    autoPublish: true,
    extractImages: true,
    avoidLogo: false,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-21'),
  },
];

export const mockSchedules: Schedule[] = [
  {
    id: '1',
    feedId: '1',
    scheduleType: 'interval',
    intervalMinutes: 30,
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    lastRun: new Date(Date.now() - 1000 * 60 * 15),
    nextRun: new Date(Date.now() + 1000 * 60 * 15),
    isActive: true,
  },
  {
    id: '2',
    feedId: '2',
    scheduleType: 'fixed',
    scheduleTime: '09:00',
    days: ['mon', 'wed', 'fri'],
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24),
    nextRun: new Date(Date.now() + 1000 * 60 * 60 * 8),
    isActive: true,
  },
  {
    id: '3',
    feedId: '3',
    scheduleType: 'interval',
    intervalMinutes: 60,
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    lastRun: new Date(Date.now() - 1000 * 60 * 45),
    nextRun: new Date(Date.now() + 1000 * 60 * 15),
    isActive: true,
  },
  {
    id: '4',
    feedId: '4',
    scheduleType: 'fixed',
    scheduleTime: '14:00',
    days: ['tue', 'thu'],
    isActive: false,
  },
];

export const mockLogs: LogEntry[] = [
  {
    id: '1',
    feedId: '1',
    sourceUrl: 'https://techcrunch.com/2024/01/25/ai-startup-raises-100m/',
    sourceTitle: 'AI Startup Raises $100M in Series B Funding',
    status: 'success',
    step: 'completed',
    message: 'Artigo processado e publicado com sucesso',
    postId: '12345',
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    feedId: '2',
    sourceUrl: 'https://folha.uol.com.br/mercado/economia-brasileira/',
    sourceTitle: 'Economia Brasileira Apresenta Crescimento no 4º Trimestre',
    status: 'processing',
    step: 'ai_rewrite',
    message: 'Reescrevendo conteúdo com IA...',
    createdAt: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    id: '3',
    feedId: '3',
    sourceUrl: 'https://nature.com/articles/new-discovery/',
    sourceTitle: 'Scientists Discover New Species in Amazon',
    status: 'success',
    step: 'completed',
    message: 'Artigo processado e publicado com sucesso',
    postId: '12346',
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '4',
    feedId: '1',
    sourceUrl: 'https://techcrunch.com/2024/01/24/cloud-computing-trends/',
    sourceTitle: 'Top Cloud Computing Trends for 2024',
    status: 'error',
    step: 'image_extraction',
    message: 'Falha ao extrair imagem do artigo',
    errorDetails: 'Timeout ao acessar URL de origem',
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: '5',
    feedId: '4',
    sourceUrl: 'https://g1.globo.com/saude/nova-vacina/',
    sourceTitle: 'Nova Vacina Mostra Resultados Promissores',
    status: 'pending',
    step: 'queued',
    message: 'Aguardando processamento',
    createdAt: new Date(Date.now() - 1000 * 60 * 1),
  },
  {
    id: '6',
    feedId: '2',
    sourceUrl: 'https://folha.uol.com.br/mercado/inflacao/',
    sourceTitle: 'Inflação Fecha Mês em Queda',
    status: 'success',
    step: 'completed',
    message: 'Artigo processado e salvo como rascunho',
    postId: '12347',
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
  },
];

export const mockDashboardStats: DashboardStats = {
  totalFeeds: 4,
  activeSchedules: 3,
  postsToday: 12,
  successRate: 94.5,
  totalPosts: 1247,
  errorsToday: 2,
};

export const getFeedById = (id: string): Feed | undefined => {
  return mockFeeds.find(feed => feed.id === id);
};

export const getScheduleByFeedId = (feedId: string): Schedule | undefined => {
  return mockSchedules.find(schedule => schedule.feedId === feedId);
};

export const getLogsByFeedId = (feedId: string): LogEntry[] => {
  return mockLogs.filter(log => log.feedId === feedId);
};

export const getCategoryById = (id: string): Category | undefined => {
  return mockCategories.find(category => category.id === id);
};

export const getAuthorById = (id: string): Author | undefined => {
  return mockAuthors.find(author => author.id === id);
};
