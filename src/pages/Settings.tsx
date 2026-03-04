import { useState, useEffect } from 'react';
import {
  Key,
  Globe,
  Cpu,
  Image,
  Bell,
  Shield,
  Save,
  ExternalLink,
  Plug,
  Share2,
  Zap,
  Search,
  CheckCircle,
  Palette,
  Moon,
  Sun,
  Monitor,
  Sparkles,
  CreditCard,
  Lock,
  ArrowRight,
  ShieldCheck,
  Star,
  Eye,
  EyeOff,
  Pencil,
  Loader2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { PlatformCard, PlatformConnection } from '@/components/settings/PlatformCard';
import { platforms, socialPlatforms, automationPlatforms, imageGenerationPlatforms } from '@/data/platforms';
import { platformSettingsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { usePalette } from '@/hooks/usePalette';
import { cn } from '@/lib/utils';
import { whiteLabelApi } from '@/lib/api';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { WhiteLabelAdmin } from '@/components/settings/WhiteLabelAdmin';
import { useSubscription } from '@/hooks/useSubscription';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { SubscriptionContent } from '@/components/settings/SubscriptionContent';

export default function Settings() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'integrations';
  const [activeTab, setActiveTab] = useState(initialTab === 'ai' ? 'api' : initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  const { settings: wlSettings, refreshSettings } = useWhiteLabel();
  const { subscription, loading: subLoading } = useSubscription();
  const [searchTerm, setSearchTerm] = useState('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();

  // AI Settings State
  const [aiModel, setAiModel] = useState('gemini-2.0-flash');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [writingTone, setWritingTone] = useState('professional');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [seoOptimized, setSeoOptimized] = useState(true);
  const [plagiarismCheck, setPlagiarismCheck] = useState(false);

  // Image Settings State
  const [extractImages, setExtractImages] = useState(true);
  const [avoidLogo, setAvoidLogo] = useState(true);
  const [generateDalle, setGenerateDalle] = useState(false);
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageInstruction, setImageInstruction] = useState('');
  const [imageProvider, setImageProvider] = useState('dalle');

  // Load settings from context
  useEffect(() => {
    if (wlSettings) {
      setAiModel(wlSettings.ai_model || 'gemini-2.0-flash');
      setAiProvider((wlSettings as any).ai_provider || 'gemini');
      setWritingTone(wlSettings.writing_tone || 'professional');
      setSystemPrompt(wlSettings.system_prompt || '');
      setSeoOptimized(wlSettings.seo_optimized ?? true);
      setPlagiarismCheck(wlSettings.plagiarism_check ?? false);
      setExtractImages(wlSettings.extract_images ?? true);
      setAvoidLogo(wlSettings.avoid_logo ?? true);
      setImageSize(wlSettings.image_size || '1024x1024');
      setImageInstruction(wlSettings.image_instruction || '');
      setImageProvider(wlSettings.image_provider || 'dalle');
    }
  }, [wlSettings]);

  // Notification Settings State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [errorAlerts, setErrorAlerts] = useState(true);
  const [publishedAlerts, setPublishedAlerts] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [isSavingNotif, setIsSavingNotif] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isEditingKey, setIsEditingKey] = useState<Record<string, boolean>>({});

  // Load notification prefs from DB
  useEffect(() => {
    const loadNotifPrefs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!member?.organization_id) return;
      const { data: org } = await (supabase as any)
        .from('organizations')
        .select('notif_email, notif_error_alerts, notif_published, notif_email_address')
        .eq('id', member.organization_id)
        .maybeSingle();
      if (org) {
        setEmailNotifications(org.notif_email ?? true);
        setErrorAlerts(org.notif_error_alerts ?? true);
        setPublishedAlerts(org.notif_published ?? false);
        setNotificationEmail(org.notif_email_address || '');
      }
    };
    loadNotifPrefs();
  }, []);

  const handleSaveNotifications = async () => {
    setIsSavingNotif(true);
    const tid = toast.loading('Salvando preferências de notificação...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada.');
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!member?.organization_id) throw new Error('Organização não encontrada.');
      const { error } = await (supabase as any)
        .from('organizations')
        .update({
          notif_email: emailNotifications,
          notif_error_alerts: errorAlerts,
          notif_published: publishedAlerts,
          notif_email_address: notificationEmail || null,
        })
        .eq('id', member.organization_id);
      if (error) throw error;
      toast.success('Preferências de notificação salvas!', { id: tid });
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message, { id: tid });
    } finally {
      setIsSavingNotif(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!notificationEmail) {
      toast.error('Informe um e-mail antes de testar.');
      return;
    }
    setIsSendingTest(true);
    const tid = toast.loading('Enviando e-mail de teste...');
    try {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'daily_summary',
          data: {
            to_email: notificationEmail,
            posts_generated: 12,
            posts_published: 9,
            errors: 0,
          }
        }
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Falha ao enviar.');
      toast.success('E-mail de teste enviado! Verifique sua caixa de entrada.', { id: tid });
    } catch (e: any) {
      toast.error('Erro: ' + e.message, { id: tid });
    } finally {
      setIsSendingTest(false);
    }
  };

  const { settings: connections, isLoading, saveSettings, disconnectPlatform } = usePlatformSettings();

  useEffect(() => {
    if (connections.length > 0) {
      const newKeys: Record<string, string> = {};
      connections.forEach((c: any) => {
        // Só atualizamos o state se NÃO estivermos editando ativamente aquela chave
        // para evitar que os asteriscos do banco sobrescrevam o que o usuário está digitando
        if (c.credentials?.api_key && !isEditingKey[c.platform_id]) {
          newKeys[c.platform_id] = c.credentials.api_key;
        }
      });
      setApiKeys(prev => ({ ...prev, ...newKeys }));
    }
  }, [connections, isEditingKey]);

  const handleKeyChange = (platformId: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [platformId]: value }));
    if (value === '') {
      setIsEditingKey(prev => ({ ...prev, [platformId]: true }));
    }
  };

  const toggleShowKey = (platformId: string) => {
    setShowKeys(prev => ({ ...prev, [platformId]: !prev[platformId] }));
  };

  const startEditingKey = (platformId: string) => {
    setApiKeys(prev => ({ ...prev, [platformId]: '' }));
    setIsEditingKey(prev => ({ ...prev, [platformId]: true }));
    setShowKeys(prev => ({ ...prev, [platformId]: false }));
    // Auto-focus the input
    setTimeout(() => {
      document.getElementById(platformId)?.focus();
    }, 100);
  };

  const getMaskedDisplayValue = (platformId: string) => {
    const value = apiKeys[platformId] || '';
    if (!showKeys[platformId]) return value; // Individual password dot mask handles this

    // If it's already a server mask (****), don't reveal anything further
    if (value.startsWith('****')) return value;

    // For new/unsaved keys, show partial mask (Secure Peer Review mode)
    if (value.length <= 8) return '****';
    return `${value.substring(0, 6)}...${value.slice(-4)}`;
  };

  const handleSaveKey = (platformId: string) => {
    const value = apiKeys[platformId];

    // Se o usuário clicar em "Trocar" (onde o valor ainda são os asteriscos), apenas limpamos o campo
    if (value === '****' || value?.startsWith('****')) {
      startEditingKey(platformId);
      return;
    }

    if (!value) {
      toast.error("Por favor, insira uma chave válida");
      return;
    }

    saveSettings.mutate({
      platformId,
      credentials: { api_key: value },
      isConnected: !!value,
      isAutoPublish: false
    });

    setIsEditingKey(prev => ({ ...prev, [platformId]: false }));

    // Sync OpenAI images if it's the main OpenAI key
    if (platformId === 'openai') {
      saveSettings.mutate({
        platformId: 'openai_images',
        credentials: { api_key: value },
        isConnected: !!value,
        isAutoPublish: false
      });
      setIsEditingKey(prev => ({ ...prev, openai_images: false }));
    }

    // Sync Gemini if it's the main google_gemini key
    if (platformId === 'google_gemini') {
      saveSettings.mutate({
        platformId: 'gemini',
        credentials: { api_key: value },
        isConnected: !!value,
        isAutoPublish: false
      });
      setIsEditingKey(prev => ({ ...prev, gemini: false }));
    }
  };

  const handleConnect = (platformId: string, credentials: Record<string, string>, isAutoPublish: boolean) => {
    saveSettings.mutate({ platformId, credentials, isConnected: true, isAutoPublish });
  };

  const handleDisconnect = (platformId: string) => {
    disconnectPlatform.mutate(platformId);
  };



  const handleSaveAllGeneralSettings = async () => {
    const tid = toast.loading('Salvando configurações gerais...');
    try {
      await whiteLabelApi.save({
        ai_model: aiModel,
        ai_provider: aiProvider,
        writing_tone: writingTone,
        system_prompt: systemPrompt || null,
        seo_optimized: seoOptimized,
        plagiarism_check: plagiarismCheck,
        extract_images: extractImages,
        avoid_logo: avoidLogo,
        image_size: imageSize,
        image_instruction: imageInstruction,
        image_provider: imageProvider
      });

      await refreshSettings();
      toast.success('Todas as configurações foram salvas!', { id: tid });
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message, { id: tid });
    }
  };

  const handleTest = async (platformId: string) => {
    const conn = getConnection(platformId);
    if (!conn || !conn.credentials) {
      toast.error('Configure as credenciais antes de testar');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    toast.loading('Testando conexão...', { id: 'test-conn' });

    try {
      const { data, error } = await supabase.functions.invoke('test-connection', {
        body: { platformId, credentials: conn.credentials }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message, { id: 'test-conn' });
      } else {
        toast.error(data.error || 'Falha na conexão', { id: 'test-conn' });
      }
    } catch (error: any) {
      toast.error('Erro ao testar: ' + error.message, { id: 'test-conn' });
    }
  };

  const getConnection = (platformId: string): any | undefined => {
    const conn = connections.find((c: any) => c.platform_id === platformId);
    if (!conn) return undefined;
    return {
      platformId: conn.platform_id,
      isConnected: conn.is_connected,
      credentials: conn.credentials,
      isAutoPublish: conn.is_auto_publish,
      lastSync: conn.updated_at ? new Date(conn.updated_at) : undefined
    };
  };

  const filterPlatforms = (platformList: typeof platforms) =>
    platformList.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const connectedCount = connections.filter((c: any) => c.is_connected).length;

  return (
    <MainLayout>
      <Header
        title="Configurações"
        subtitle="Personalize sua experiência"
      />

      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-muted/30 p-1.5 flex flex-wrap md:flex-nowrap h-auto min-h-[54px] gap-1.5 items-center rounded-2xl border border-border/40 backdrop-blur-xl overflow-x-auto no-scrollbar shadow-inner shadow-black/5">
            <TabsTrigger
              value="integrations"
              className="px-3 md:px-5 py-2.5 gap-2.5 text-xs md:text-sm font-bold rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-muted/50 group"
            >
              <Plug className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span className="hidden xs:inline">Conexões</span>
              <span className="xs:hidden">Apps</span>
              {connectedCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black border border-primary/20">
                  {connectedCount}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="api"
              className="px-3 md:px-5 py-2.5 gap-2.5 text-xs md:text-sm font-bold rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-muted/50"
            >
              <Key className="w-4 h-4" />
              API & Mídia
            </TabsTrigger>



            <TabsTrigger
              value="notifications"
              className="px-3 md:px-5 py-2.5 gap-2.5 text-xs md:text-sm font-bold rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-muted/50"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden xs:inline">Avisos</span>
              <span className="xs:hidden">Alertas</span>
            </TabsTrigger>

            <div className="hidden md:block w-px h-6 bg-border/40 mx-1" />

            <TabsTrigger
              value="whitelabel"
              className="px-3 md:px-5 py-2.5 gap-2.5 text-xs md:text-sm font-bold rounded-xl transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 hover:bg-muted/50 group"
            >
              <Sparkles className="w-4 h-4 transition-all group-hover:rotate-12 group-hover:scale-110" />
              White Label
            </TabsTrigger>

            <div className="hidden md:block w-px h-6 bg-border/40 mx-1" />

            <TabsTrigger
              value="billing"
              className="px-3 md:px-5 py-2.5 gap-2.5 text-xs md:text-sm font-bold rounded-xl transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 hover:bg-muted/50 group"
            >
              <CreditCard className="w-4 h-4" />
              Assinatura
            </TabsTrigger>
          </TabsList>

          {/* Platform Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-foreground">Plataformas CMS</h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Conecte suas plataformas de publicação
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar plataforma..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filterPlatforms(platforms).map(platform => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  connection={getConnection(platform.id)}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onTest={handleTest}
                />
              ))}
            </div>

            {filterPlatforms(platforms).length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma plataforma encontrada</p>
              </div>
            )}
          </TabsContent>

          {/* 
          <TabsContent value="social" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Redes Sociais</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Compartilhe automaticamente seus posts nas redes sociais
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {socialPlatforms.map(platform => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  connection={getConnection(platform.id)}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onTest={handleTest}
                />
              ))}
            </div>
          </TabsContent>
          */}

          {/* 
          <TabsContent value="automation" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Plataformas de Automação</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Integre com ferramentas de automação para fluxos personalizados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {automationPlatforms.map(platform => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  connection={getConnection(platform.id)}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onTest={handleTest}
                />
              ))}
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Como usar Webhooks
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Webhooks permitem que o ContentAI envie dados automaticamente para suas ferramentas de automação.
                Quando um novo post é processado, enviamos um POST com os seguintes dados:
              </p>
              <pre className="bg-muted/50 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                {`{
  "event": "post_created",
  "timestamp": "2024-01-25T10:30:00Z",
  "post": {
    "id": "12345",
    "title": "Título do Post",
    "content": "Conteúdo completo...",
    "excerpt": "Resumo do post...",
    "category": "Tecnologia",
    "author": "Ana Silva",
    "image_url": "https://...",
    "source_url": "https://...",
    "status": "published"
  }
}`}
              </pre>
            </div>
          </TabsContent>
          */}

          {/* API Settings */}
          <TabsContent value="api" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Chaves de API (Texto & Imagem)
              </h3>

              <div className="space-y-6">
                {/* OpenAI */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="openai">OpenAI (ChatGPT & DALL-E)</Label>
                    {getConnection('openai')?.isConnected && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Conectado</span>}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="openai"
                        type={showKeys['openai'] ? "text" : "password"}
                        autoComplete="off"
                        placeholder="sk-..."
                        value={getMaskedDisplayValue('openai')}
                        onChange={(e) => handleKeyChange('openai', e.target.value)}
                        onClick={() => {
                          if (apiKeys['openai']?.startsWith('****') && !isEditingKey['openai']) {
                            startEditingKey('openai');
                          }
                        }}
                        readOnly={apiKeys['openai']?.startsWith('****') && !isEditingKey['openai']}
                        className={cn(
                          "font-mono pr-20 cursor-pointer",
                          getConnection('openai')?.isConnected && !isEditingKey['openai'] && "border-primary/40 bg-primary/5 text-muted-foreground"
                        )}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {apiKeys['openai'] && (
                          <button
                            type="button"
                            onClick={() => toggleShowKey('openai')}
                            className="p-1 hover:text-primary transition-colors text-muted-foreground"
                            title={showKeys['openai'] ? "Esconder" : "Mostrar (com censura)"}
                          >
                            {showKeys['openai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                        {getConnection('openai')?.isConnected && !isEditingKey['openai'] ? (
                          <button
                            type="button"
                            onClick={() => startEditingKey('openai')}
                            className="p-1 hover:text-primary transition-colors text-primary"
                            title="Editar Chave"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        ) : (
                          (apiKeys['openai']?.startsWith('****') || getConnection('openai')?.isConnected) && (
                            <ShieldCheck className="w-4 h-4 text-primary animate-pulse" />
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleTest('openai')}
                        className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Testar
                      </Button>
                      <Button
                        variant={isEditingKey['openai'] || !getConnection('openai')?.isConnected ? "default" : "outline"}
                        onClick={() => handleSaveKey('openai')}
                      >
                        {getConnection('openai')?.isConnected && !isEditingKey['openai'] ? 'Trocar' : 'Salvar'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Utilizada para humanização com GPT-4o e geração de imagens com DALL-E 3.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="google_gemini">Google Gemini (Texto & Imagen 3)</Label>
                    {getConnection('google_gemini')?.isConnected && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Conectado</span>}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="google_gemini"
                        type={showKeys['google_gemini'] ? "text" : "password"}
                        autoComplete="off"
                        placeholder="AIza..."
                        value={getMaskedDisplayValue('google_gemini')}
                        onChange={(e) => handleKeyChange('google_gemini', e.target.value)}
                        onClick={() => {
                          if (apiKeys['google_gemini']?.startsWith('****') && !isEditingKey['google_gemini']) {
                            startEditingKey('google_gemini');
                          }
                        }}
                        readOnly={apiKeys['google_gemini']?.startsWith('****') && !isEditingKey['google_gemini']}
                        className={cn(
                          "font-mono pr-20 cursor-pointer",
                          getConnection('google_gemini')?.isConnected && !isEditingKey['google_gemini'] && "border-primary/40 bg-primary/5 text-muted-foreground"
                        )}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {apiKeys['google_gemini'] && (
                          <button
                            type="button"
                            onClick={() => toggleShowKey('google_gemini')}
                            className="p-1 hover:text-primary transition-colors text-muted-foreground"
                            title={showKeys['google_gemini'] ? "Esconder" : "Mostrar (com censura)"}
                          >
                            {showKeys['google_gemini'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                        {getConnection('google_gemini')?.isConnected && !isEditingKey['google_gemini'] ? (
                          <button
                            type="button"
                            onClick={() => startEditingKey('google_gemini')}
                            className="p-1 hover:text-primary transition-colors text-primary"
                            title="Editar Chave"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        ) : (
                          (apiKeys['google_gemini']?.startsWith('****') || getConnection('google_gemini')?.isConnected) && (
                            <ShieldCheck className="w-4 h-4 text-primary animate-pulse" />
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleTest('google_gemini')}
                        className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Testar
                      </Button>
                      <Button
                        variant={isEditingKey['google_gemini'] || !getConnection('google_gemini')?.isConnected ? "default" : "outline"}
                        onClick={() => handleSaveKey('google_gemini')}
                      >
                        {getConnection('google_gemini')?.isConnected && !isEditingKey['google_gemini'] ? 'Trocar' : 'Salvar'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Utilizada para humanização com Gemini 2.0/2.5 Flash e geração de fotos com Imagen.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Configurações de IA
              </h3>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Provedor de IA Principal
                      <Badge variant="outline" className="text-[10px] uppercase font-black tracking-tighter bg-primary/10 text-primary border-primary/20">Definitivo</Badge>
                    </Label>
                    <Select value={aiProvider} onValueChange={setAiProvider}>
                      <SelectTrigger className="h-12 bg-muted/20 border-border/40 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-white/10">
                        <SelectItem value="gemini" className="focus:bg-primary/20 focus:text-primary">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Google Gemini (Recomendado)
                          </div>
                        </SelectItem>
                        <SelectItem value="openai" className="focus:bg-emerald-500/20 focus:text-emerald-500">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            OpenAI ChatGPT
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground italic">
                      Lança o motor de inteligência especificamente sobre o provedor escolhido, ignorando fallbacks para outras APIs sem saldo.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo Específico</Label>
                    <Select value={aiModel} onValueChange={setAiModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {aiProvider === 'gemini' ? (
                          <>
                            <SelectItem value="gemini-2.0-flash">Google Gemini 2.0 Flash (Rápido)</SelectItem>
                            <SelectItem value="gemini-2.5-flash">Google Gemini 2.5 Flash (Mais Novo & Inteligente)</SelectItem>
                            <SelectItem value="gemini-2.0-flash-lite">Google Gemini 2.0 Flash-Lite (Econômico)</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="gpt-4o">OpenAI GPT-4o - Máxima Performance</SelectItem>
                            <SelectItem value="gpt-4o-mini">OpenAI GPT-4o Mini - Rápido & Econômico</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tom de Escrita</Label>
                  <Select value={writingTone} onValueChange={setWritingTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="creative">Criativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system-prompt">Prompt do Sistema</Label>
                  <Textarea
                    id="system-prompt"
                    rows={4}
                    placeholder="Você é um redator profissional especializado em..."
                    className="font-mono text-sm"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Instruções base que serão enviadas junto com cada requisição
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Otimização SEO Automática</p>
                    <p className="text-xs text-muted-foreground">Gerar meta-descrição e palavras-chave</p>
                  </div>
                  <Switch checked={seoOptimized} onCheckedChange={setSeoOptimized} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Verificar Plágio</p>
                    <p className="text-xs text-muted-foreground">Garantir originalidade do conteúdo</p>
                  </div>
                  <Switch checked={plagiarismCheck} onCheckedChange={setPlagiarismCheck} />
                </div>
              </div>
            </div>

            <div className="hidden">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                Preferências de Mídia
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Extrair Imagens Automaticamente</p>
                    <p className="text-xs text-muted-foreground">Buscar imagens nos artigos originais</p>
                  </div>
                  <Switch checked={extractImages} onCheckedChange={setExtractImages} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Evitar Logos</p>
                    <p className="text-xs text-muted-foreground">Filtrar imagens que parecem logos</p>
                  </div>
                  <Switch checked={avoidLogo} onCheckedChange={setAvoidLogo} />
                </div>

                <div className="space-y-2">
                  <Label>Motor de Geração de Imagem</Label>
                  <Select value={imageProvider} onValueChange={setImageProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dalle">OpenAI DALL-E 3 (Padrão)</SelectItem>
                      <SelectItem value="google_gemini">Google Imagen (Gemini)</SelectItem>
                      <SelectItem value="nano_banana">Nano Banana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tamanho Padrão da Imagem Gerada</Label>
                  <Select value={imageSize} onValueChange={setImageSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">1024 x 1024 (Quadrado)</SelectItem>
                      <SelectItem value="1792x1024">1792 x 1024 (Landscape)</SelectItem>
                      <SelectItem value="1024x1792">1024 x 1792 (Portrait)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-instruction">Prompt Padrão para Recriação de Imagem</Label>
                  <Textarea
                    id="image-instruction"
                    rows={4}
                    placeholder="Instruções para a IA ao recriar imagens..."
                    className="font-mono text-sm"
                    value={imageInstruction}
                    onChange={(e) => setImageInstruction(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Estas instruções serão usadas sempre que você pedir para "Recriar Capa com IA".
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>



          {/* White Label Admin */}
          <TabsContent value="whitelabel" className="space-y-6">
            <WhiteLabelAdmin />
          </TabsContent>

          {/* Billing Settings */}
          <TabsContent value="billing" className="space-y-6">
            <SubscriptionContent />
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Preferências de Notificação
                </h3>
                <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                  Via E-mail (Resend)
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Notificações por Email</p>
                    <p className="text-xs text-muted-foreground">Receber resumo diário de atividades</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Alertas de Erro</p>
                    <p className="text-xs text-muted-foreground">Notificar imediatamente quando houver falhas no sistema</p>
                  </div>
                  <Switch checked={errorAlerts} onCheckedChange={setErrorAlerts} disabled={!emailNotifications} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Posts Publicados</p>
                    <p className="text-xs text-muted-foreground">Notificar quando um post for publicado com sucesso</p>
                  </div>
                  <Switch checked={publishedAlerts} onCheckedChange={setPublishedAlerts} disabled={!emailNotifications} />
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="notif-email">Email para Notificações</Label>
                  <div className="flex gap-2">
                    <Input
                      id="notif-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleSendTestEmail}
                      disabled={isSendingTest || !notificationEmail}
                      className="gap-2 border-primary/20 text-primary hover:bg-primary/5 shrink-0"
                    >
                      {isSendingTest
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                        : <><Zap className="w-3.5 h-3.5" /> Testar</>}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Um e-mail de teste será enviado para confirmar que a integração está funcionando.
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-border/40">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={isSavingNotif}
                  className="gap-2 px-6"
                >
                  {isSavingNotif
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                    : <><Save className="w-4 h-4" /> Salvar Alertas</>}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <Button className="gap-2 px-8" onClick={handleSaveAllGeneralSettings}>
            <Save className="w-4 h-4" />
            Salvar Configurações
          </Button>
        </div>
      </div>
    </MainLayout >
  );
}
