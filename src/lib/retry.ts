/**
 * Retry logic para requisições com backoff exponencial
 * @param fn - Função assíncrona a tentar
 * @param maxAttempts - Máximo de tentativas (padrão: 3)
 * @param delayMs - Delay inicial em ms (padrão: 1000)
 * @returns Resultado da função ou erro após todas as tentativas
 * 
 * @example
 * const result = await withRetry(
 *   () => feedsApi.getAll(),
 *   3,  // 3 tentativas
 *   500 // 500ms, 1s, 2s
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = delayMs * Math.pow(2, attempt - 1);
        console.warn(
          `Tentativa ${attempt} falhou. Retry em ${delay}ms...`,
          error
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(
    `Todas as ${maxAttempts} tentativas falharam`,
    lastError
  );
  throw lastError;
}
