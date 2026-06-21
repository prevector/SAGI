/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional SAGI swarm backend (the SDK mock). Unset ⇒ client-side simulation. */
  readonly VITE_SAGI_SWARM_URL?: string;
  /** Where the "see an app built on the SDK" CTA points. */
  readonly VITE_CONTRIBUTE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
