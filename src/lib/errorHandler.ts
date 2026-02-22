import { toast } from 'sonner';

export type ErrorContext =
  | 'feed_creation'
  | 'feed_deletion'
  | 'feed_update'
  | 'schedule_update'
  | 'feed_processing'
  | 'auth'
  | 'unknown';

interface ErrorInfo {
  context: ErrorContext | string;
  error: unknown;
  message?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Centralizado error handler com logging
 * @param info - Contexto e erro
 * 
 * @example
 * try {
 *   await feedsApi.create(data);
 * } catch (err) {
 *   handleError({ context: 'feed_creation', error: err });
 * }
 */
export function handleError({
  context,
  error,
  message,
  userId,
  metadata,
}: ErrorInfo): void {
  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  const displayMessage = message || 'Algo deu errado';

  // Log estruturado
  console.error(`[${context}] ${displayMessage}`, errorMessage);

  // Notificar usuário apropriadamente
  notifyUser(displayMessage, context);

  // TODO: Implementar Sentry quando disponível
  // Sentry.captureException(error, {
  //   tags: { context },
  //   contexts: {
  //     user: userId ? { id: userId } : undefined,
  //     app: metadata,
  //   },
  // });
}

/**
 * Wrapper para funções assíncronas com error handling automático
 * @param fn - Função a executar
 * @param context - Contexto do erro
 * @returns Função wrapped
 * 
 * @example
 * const handleSave = withErrorHandler(
 *   async (data) => {
 *     return await feedsApi.create(data);
 *   },
 *   'feed_creation'
 * );
 */
export function withErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
): (...args: T) => Promise<R | null> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError({ context, error });
      return null;
    }
  };
}

/**
 * Logger estruturado
 */
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data);
  },
  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },
};

/**
 * Notificar usuário com mensagem apropriada
 */
function notifyUser(message: string, context: string) {
  const errorMessages: Record<string, string> = {
    feed_creation: 'Erro ao criar feed. Verifique os dados.',
    feed_deletion: 'Erro ao deletar feed. Tente novamente.',
    feed_update: 'Erro ao atualizar feed.',
    schedule_update: 'Erro ao atualizar agenda.',
    feed_processing: 'Erro ao processar feed. Tente mais tarde.',
    auth: 'Falha na autenticação. Faça login novamente.',
    CREATE_FEED: 'Erro ao adicionar feed',
    UPDATE_FEED: 'Erro ao atualizar feed',
    DELETE_FEED: 'Erro ao remover feed',
    PROCESS_FEED: 'Erro no processamento do feed',
    unknown: 'Algo deu errado. Tente novamente.',
  };

  // Detectar tipo de erro e mostrar mensagem apropriada
  if (message.toLowerCase().includes('network')) {
    toast.error('Erro de conexão. Verifique sua internet.');
  } else if (message.toLowerCase().includes('permission')) {
    toast.error('Permissão negada para esta ação.');
  } else if (message.toLowerCase().includes('timeout')) {
    toast.error('Operação demorou muito. Tente novamente.');
  } else if (message.toLowerCase().includes('rate limit')) {
    toast.error('Muitas requisições. Aguarde um momento.');
  } else {
    toast.error(errorMessages[context] || 'Algo deu errado. Tente novamente.');
  }
}
