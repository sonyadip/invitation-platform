/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session: import('./utils/session').SessionPayload | null;
    requestId?: string;
  }
}

declare module '*.astro' {
  const component: any;
  export default component;
}
