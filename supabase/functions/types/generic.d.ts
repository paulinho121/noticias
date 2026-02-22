// Generic stub type declaration for external Deno modules not natively typed for the VS Code tsconfig.
declare module "https://esm.sh/date-fns@2.30.0" {
  export * from "date-fns";
}

declare module "https://deno.land/x/postgres@v0.17.0/mod.ts" {
  export class Client {
    constructor(config: any);
    connect(): Promise<void>;
    queryObject<T = any>(query: string, args?: any[]): Promise<{ rows: T[] }>;
    queryArray<T extends any[] = any[]>(query: string, args?: any[]): Promise<{ rows: T[] }>;
    end(): Promise<void>;
  }
}
