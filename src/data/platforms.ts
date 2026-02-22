import { Platform } from '@/components/settings/PlatformCard';

export const platforms: Platform[] = [
  // CMS Platforms
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'O CMS mais popular do mundo para blogs e sites',
    icon: '📝',
    color: '#21759b',
    docsUrl: 'https://developer.wordpress.org/rest-api/',
    fields: [
      { id: 'url', label: 'URL do Site', placeholder: 'https://seu-site.com', type: 'url', required: true },
      { id: 'username', label: 'Usuário', placeholder: 'admin', type: 'text', required: true },
      { id: 'app_password', label: 'Application Password', placeholder: 'xxxx xxxx xxxx xxxx', type: 'password', required: true },
    ]
  },
  {
    id: 'wix',
    name: 'Wix',
    description: 'Plataforma de criação de sites com editor visual',
    icon: '🎨',
    color: '#0C6EFC',
    docsUrl: 'https://dev.wix.com/docs/rest',
    fields: [
      { id: 'account_id', label: 'Account ID', placeholder: 'seu-account-id', type: 'text', required: true },
      { id: 'site_id', label: 'Site ID', placeholder: 'seu-site-id', type: 'text', required: true },
      { id: 'api_key', label: 'API Key', placeholder: 'IST.xxx...', type: 'password', required: true },
    ]
  },
  {
    id: 'blogger',
    name: 'Blogger',
    description: 'Postagem ultra-rápida via E-mail secreto (sem API)',
    icon: '🅱️',
    color: '#FF5722',
    docsUrl: 'https://support.google.com/blogger/answer/154172',
    fields: [
      { id: 'blog_id', label: 'Blog ID', placeholder: '1234567890', type: 'text', required: true },
      { id: 'public_url', label: 'URL do Blog (Público)', placeholder: 'https://seu-blog.blogspot.com', type: 'url', required: true },
      { id: 'posting_email', label: 'E-mail Secreto de Postagem', placeholder: 'usuario.codigo@blogger.com', type: 'text', required: true },
    ]
  },
  {
    id: 'framer',
    name: 'Framer',
    description: 'Plataforma de design e publicação moderna',
    icon: '⚡',
    color: '#0055FF',
    docsUrl: 'https://www.framer.com/developers/',
    fields: [
      { id: 'project_id', label: 'Project ID', placeholder: 'prj_xxx', type: 'text', required: true },
      { id: 'api_token', label: 'API Token', placeholder: 'framer_xxx', type: 'password', required: true },
    ]
  },
  {
    id: 'ghost',
    name: 'Ghost',
    description: 'CMS moderno focado em publicação profissional',
    icon: '👻',
    color: '#15171A',
    docsUrl: 'https://ghost.org/docs/admin-api/',
    fields: [
      { id: 'url', label: 'Ghost URL', placeholder: 'https://seu-blog.ghost.io', type: 'url', required: true },
      { id: 'admin_api_key', label: 'Admin API Key', placeholder: 'xxx:yyy', type: 'password', required: true },
    ]
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Plataforma de publicação e leitura',
    icon: '📰',
    color: '#00AB6C',
    docsUrl: 'https://github.com/Medium/medium-api-docs',
    fields: [
      { id: 'integration_token', label: 'Integration Token', placeholder: 'seu-token-de-integracao', type: 'password', required: true },
      { id: 'publication_id', label: 'Publication ID (opcional)', placeholder: 'pub_xxx', type: 'text', required: false },
    ]
  },
  {
    id: 'webflow',
    name: 'Webflow',
    description: 'Design e desenvolvimento visual profissional',
    icon: '🌊',
    color: '#4353FF',
    docsUrl: 'https://developers.webflow.com/',
    fields: [
      { id: 'site_id', label: 'Site ID', placeholder: 'xxx', type: 'text', required: true },
      { id: 'collection_id', label: 'CMS Collection ID', placeholder: 'xxx', type: 'text', required: true },
      { id: 'api_token', label: 'API Token', placeholder: 'xxx', type: 'password', required: true },
    ]
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Workspace colaborativo e banco de dados',
    icon: '📓',
    color: '#000000',
    docsUrl: 'https://developers.notion.com/',
    fields: [
      { id: 'integration_token', label: 'Integration Token', placeholder: 'secret_xxx', type: 'password', required: true },
      { id: 'database_id', label: 'Database ID', placeholder: 'xxx', type: 'text', required: true },
    ]
  },
  {
    id: 'contentful',
    name: 'Contentful',
    description: 'Headless CMS empresarial',
    icon: '📦',
    color: '#2478CC',
    docsUrl: 'https://www.contentful.com/developers/docs/',
    fields: [
      { id: 'space_id', label: 'Space ID', placeholder: 'xxx', type: 'text', required: true },
      { id: 'environment', label: 'Environment', placeholder: 'master', type: 'text', required: true },
      { id: 'access_token', label: 'Content Management Token', placeholder: 'CFPAT-xxx', type: 'password', required: true },
    ]
  },
  {
    id: 'strapi',
    name: 'Strapi',
    description: 'Headless CMS open-source',
    icon: '🚀',
    color: '#8E75FF',
    docsUrl: 'https://docs.strapi.io/dev-docs/api/rest',
    fields: [
      { id: 'url', label: 'Strapi URL', placeholder: 'https://seu-strapi.com', type: 'url', required: true },
      { id: 'api_token', label: 'API Token', placeholder: 'xxx', type: 'password', required: true },
      { id: 'content_type', label: 'Content Type', placeholder: 'articles', type: 'text', required: true },
    ]
  },
  {
    id: 'shopify',
    name: 'Shopify Blog',
    description: 'Blog integrado à loja Shopify',
    icon: '🛒',
    color: '#96BF48',
    docsUrl: 'https://shopify.dev/docs/api/admin-rest',
    fields: [
      { id: 'store_url', label: 'Store URL', placeholder: 'sua-loja.myshopify.com', type: 'url', required: true },
      { id: 'access_token', label: 'Admin API Access Token', placeholder: 'shpat_xxx', type: 'password', required: true },
      { id: 'blog_id', label: 'Blog ID', placeholder: '123456789', type: 'text', required: true },
    ]
  },
  {
    id: 'squarespace',
    name: 'Squarespace',
    description: 'Plataforma de sites e e-commerce',
    icon: '⬛',
    color: '#000000',
    docsUrl: 'https://developers.squarespace.com/',
    fields: [
      { id: 'site_id', label: 'Site ID', placeholder: 'xxx', type: 'text', required: true },
      { id: 'api_key', label: 'API Key', placeholder: 'xxx', type: 'password', required: true },
    ]
  },
  {
    id: 'hubspot',
    name: 'HubSpot Blog',
    description: 'CRM e marketing com blog integrado',
    icon: '🧡',
    color: '#FF7A59',
    docsUrl: 'https://developers.hubspot.com/docs/api/cms/blog-posts',
    fields: [
      { id: 'access_token', label: 'Private App Token', placeholder: 'pat-xxx', type: 'password', required: true },
      { id: 'content_group_id', label: 'Blog ID', placeholder: '123456789', type: 'text', required: true },
    ]
  },
  {
    id: 'custom_api',
    name: 'Site Externo (PHP/API)',
    description: 'Integre qualquer site customizado via API REST ou Webhooks',
    icon: '🌐',
    color: '#4B5563',
    docsUrl: '/api-docs',
    fields: [
      { id: 'webhook_url', label: 'Webhook para Notificação', placeholder: 'https://seu-site.com/api/webhook.php', type: 'url', required: false },
      { id: 'auth_header', label: 'Header de Autenticação (Opcional)', placeholder: 'X-API-Key: sua-chave', type: 'text', required: false },
    ]
  },
];

// Social Media Platforms
export const socialPlatforms: Platform[] = [
  {
    id: 'twitter',
    name: 'X (Twitter)',
    description: 'Compartilhar posts automaticamente no X',
    icon: '𝕏',
    color: '#000000',
    docsUrl: 'https://developer.twitter.com/en/docs',
    fields: [
      { id: 'api_key', label: 'API Key', placeholder: 'xxx', type: 'password', required: true },
      { id: 'api_secret', label: 'API Secret', placeholder: 'xxx', type: 'password', required: true },
      { id: 'access_token', label: 'Access Token', placeholder: 'xxx', type: 'password', required: true },
      { id: 'access_secret', label: 'Access Token Secret', placeholder: 'xxx', type: 'password', required: true },
    ]
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Publicar artigos no LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/',
    fields: [
      { id: 'access_token', label: 'Access Token', placeholder: 'xxx', type: 'password', required: true },
      { id: 'organization_id', label: 'Organization ID (opcional)', placeholder: 'urn:li:organization:xxx', type: 'text', required: false },
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Publicar na página do Facebook',
    icon: '📘',
    color: '#1877F2',
    docsUrl: 'https://developers.facebook.com/docs/graph-api/',
    fields: [
      { id: 'page_id', label: 'Page ID', placeholder: '123456789', type: 'text', required: true },
      { id: 'access_token', label: 'Page Access Token', placeholder: 'xxx', type: 'password', required: true },
    ]
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    description: 'Criar pins automaticamente',
    icon: '📌',
    color: '#E60023',
    docsUrl: 'https://developers.pinterest.com/',
    fields: [
      { id: 'access_token', label: 'Access Token', placeholder: 'xxx', type: 'password', required: true },
      { id: 'board_id', label: 'Board ID', placeholder: 'xxx', type: 'text', required: true },
    ]
  },
];

// Automation Platforms
export const automationPlatforms: Platform[] = [
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automatize fluxos com milhares de apps',
    icon: '⚡',
    color: '#FF4A00',
    docsUrl: 'https://zapier.com/developer',
    fields: [
      { id: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.zapier.com/hooks/catch/xxx/yyy', type: 'url', required: true },
    ]
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    description: 'Automações visuais avançadas',
    icon: '🔮',
    color: '#6D00CC',
    docsUrl: 'https://www.make.com/en/api-documentation',
    fields: [
      { id: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hook.us1.make.com/xxx', type: 'url', required: true },
    ]
  },
];

export const imageGenerationPlatforms: Platform[] = [
  {
    id: 'google_gemini',
    name: 'Google Gemini (Imagen 3)',
    description: 'Use seus tokens gratuitos diários do Google AI Studio',
    icon: '✨',
    color: '#4285F4',
    docsUrl: 'https://aistudio.google.com/',
    fields: [
      { id: 'api_key', label: 'API Key (Gemini)', placeholder: 'AIza...', type: 'password', required: true },
    ]
  },
  {
    id: 'openai_images',
    name: 'OpenAI DALL-E',
    description: 'Geração de imagens com DALL-E 3',
    icon: '🤖',
    color: '#10A37F',
    docsUrl: 'https://platform.openai.com/docs/guides/images',
    fields: [
      { id: 'api_key', label: 'API Key', placeholder: 'sk-xxx', type: 'password', required: true },
    ]
  },
];

export const getAllPlatforms = () => [...platforms, ...socialPlatforms, ...automationPlatforms, ...imageGenerationPlatforms];
