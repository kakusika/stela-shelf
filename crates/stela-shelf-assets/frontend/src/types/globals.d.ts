// Module declaration for tailwindcss to satisfy tailwind.config.ts
declare module 'tailwindcss' {
  export interface Config {
    content: string[];
    darkMode?: string | [string, string];
    theme?: Record<string, any>;
    corePlugins?: Record<string, boolean>;
    plugins?: any[];
    [key: string]: any;
  }
}
