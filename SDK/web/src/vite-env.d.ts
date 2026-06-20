/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRIBUTE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
