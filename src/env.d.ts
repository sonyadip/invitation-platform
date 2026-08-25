/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    session: import('./utils/session').SessionPayload | null;
  }
}