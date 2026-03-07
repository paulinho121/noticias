import { useState } from 'react';
import {
  ExternalLink,
  Check,
  X,
  Loader2,
  Settings2,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface Platform {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  fields: PlatformField[];
  docsUrl: string;
  comingSoon?: boolean;
}

export interface PlatformField {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
}

export interface PlatformConnection {
  platformId: string;
  isConnected: boolean;
  credentials: Record<string, string>;
  isAutoPublish?: boolean;
  lastSync?: Date;
}

interface PlatformCardProps {
  platform: Platform;
  connection?: PlatformConnection;
  onConnect: (platformId: string, credentials: Record<string, string>, isAutoPublish: boolean) => void;
  onDisconnect: (platformId: string) => void;
  onTest: (platformId: string, credentials?: Record<string, string>) => void;
}

export function PlatformCard({
  platform,
  connection,
  onConnect,
  onDisconnect,
  onTest
}: PlatformCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isAutoPublish, setIsAutoPublish] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleOpenDialog = () => {
    if (connection) {
      setCredentials(connection.credentials || {});
      // @ts-ignore - we'll add this to the connection interface or just use raw data
      setIsAutoPublish(connection.isAutoPublish || false);
    }
    setIsDialogOpen(true);
  };

  const handleConnect = () => {
    onConnect(platform.id, credentials, isAutoPublish);
    setIsDialogOpen(false);
  };

  const handleTest = async () => {
    setIsTesting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onTest(platform.id);
    setIsTesting(false);
  };

  const handleTestInModal = async () => {
    setIsTesting(true);
    // Simular delay visual para feedback
    await new Promise(resolve => setTimeout(resolve, 800));
    onTest(platform.id, credentials);
    setIsTesting(false);
  };

  if (platform.comingSoon) {
    return (
      <div className="glass-card p-6 relative overflow-hidden border-border/20 opacity-70 select-none">
        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px] bg-black/40 rounded-2xl">
          <div className="px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 flex items-center gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">🚀 Em Breve</span>
          </div>
          <p className="text-[10px] text-muted-foreground/70">Disponível em uma versão futura</p>
        </div>

        {/* Blurred Platform header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner blur-[1px]"
            style={{
              backgroundColor: `${platform.color}15`,
              border: `1px solid ${platform.color}30`
            }}
          >
            {platform.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-lg truncate tracking-tight blur-[1px]">{platform.name}</h3>
            <span className="text-xs text-muted-foreground line-clamp-1 blur-[1px]">{platform.description}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-[44px] flex items-center blur-[2px]">
            <p className="text-sm text-muted-foreground">Conecte agora para habilitar o processamento automático nesta rede.</p>
          </div>
          <div className="flex gap-2 pt-2 blur-[2px]">
            <div className="flex-1 h-11 rounded-xl bg-primary/20 border border-primary/10" />
            <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "glass-card-hover p-6 relative overflow-hidden group transition-all duration-500",
        connection?.isConnected ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5" : "border-border/40"
      )}>
        {/* Animated Background Glow */}
        {connection?.isConnected && (
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-all duration-700" />
        )}

        {/* Status indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {connection?.isConnected && (
            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Online</span>
            </div>
          )}
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-500",
            connection?.isConnected
              ? "bg-emerald-500 hidden" // Handled by badge above
              : "bg-slate-600/30"
          )} />
        </div>

        {/* Platform header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
            style={{
              backgroundColor: `${platform.color}15`,
              border: `1px solid ${platform.color}30`
            }}
          >
            {platform.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-lg truncate tracking-tight">{platform.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground line-clamp-1">{platform.description}</span>
            </div>
          </div>
        </div>

        {/* Main Action Area */}
        <div className="space-y-4">
          {connection?.isConnected ? (
            <>
              <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status da Integração</span>
                  <Check className="w-3 h-3 text-emerald-500" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  {connection.isAutoPublish ? 'Publicação Automática Ativa' : 'Aguardando publicação'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all gap-2"
                  onClick={handleTest}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : <Zap className="w-3.5 h-3.5 text-primary" />}
                  {isTesting ? 'Testando...' : 'Testar Agora'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl bg-white/5 border-white/10 hover:bg-primary/10 hover:border-primary/30 group/btn"
                  onClick={handleOpenDialog}
                >
                  <Settings2 className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-500" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDisconnect(platform.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="h-[44px] flex items-center">
                <p className="text-sm text-muted-foreground leading-snug">
                  Conecte agora para habilitar o processamento automático nesta rede.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all h-11 text-sm font-bold"
                  onClick={handleOpenDialog}
                >
                  Conectar {platform.name}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-white/5 border-white/10 hover:bg-white/10 h-11 w-11 p-0"
                  asChild
                >
                  {platform.docsUrl.startsWith('http') ? (
                    <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer" title="Documentação">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link to={platform.docsUrl} title="Documentação">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">{platform.icon}</span>
              Configurar {platform.name}
            </DialogTitle>
            <DialogDescription>
              Insira suas credenciais de API para conectar ao {platform.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {platform.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={credentials[field.id] || ''}
                  onChange={(e) => setCredentials(prev => ({
                    ...prev,
                    [field.id]: e.target.value
                  }))}
                  className="font-mono text-sm"
                />
              </div>
            ))}

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 mt-4">
              <div>
                <p className="font-medium text-sm">Publicação Automática</p>
                <p className="text-xs text-muted-foreground">
                  Publicar posts automaticamente nesta plataforma
                </p>
              </div>
              <Switch
                checked={isAutoPublish}
                onCheckedChange={setIsAutoPublish}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              {platform.docsUrl.startsWith('http') ? (
                <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Documentação
                </a>
              ) : (
                <Link to={platform.docsUrl}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Documentação
                </Link>
              )}
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleTestInModal}
                disabled={isTesting}
                className="gap-2"
              >
                {isTesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : <Zap className="w-3.5 h-3.5 text-primary" />}
                Testar Conexão
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConnect}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
