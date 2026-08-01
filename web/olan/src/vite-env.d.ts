/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_OLAN_AI_GATEWAY_MODE?: string;
  readonly VITE_OLAN_AI_GATEWAY_LOCAL_KEY?: string;
  readonly VITE_OLAN_AI_GATEWAY_LOCAL_URL?: string;
  readonly VITE_OLAN_AI_GATEWAY_PUBLIC_KEY?: string;
  readonly VITE_OLAN_AI_GATEWAY_PUBLIC_URL?: string;
  readonly VITE_OLAN_AI_GATEWAY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
