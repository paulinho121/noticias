declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  }
  export const env: Env;

  /** Deno.serve - available in Deno runtime (stub for VS Code type-checking) */
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string; onListen?: (params: { port: number; hostname: string }) => void }
  ): void;
}
