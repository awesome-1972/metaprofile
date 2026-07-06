/// <reference types="vite/client" />

// mammoth не постачає власні типи для browser-збірки; мінімальна декларація
// під use-case resume-parse-client.ts (extractRawText з ArrayBuffer).
// Мірор підходу зі studio-performance-hub/src/vite-env.d.ts.
declare module "mammoth/mammoth.browser" {
  export interface MammothResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
}

declare module "mammoth" {
  export interface MammothResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
}
