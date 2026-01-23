export interface Profile {
  id: string;
  name: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StoreIndex {
  storeVersion: string;
  activeProfileId: string | null;
  profiles: Profile[];
}

export interface ConfigTargetPath {
  path: string;
  isPreferred: boolean;
}

export type Scope = "user" | "project";

export interface ProjectRc {
  activeProfileId: string | null;
}

export const STORE_VERSION = "1.0.0";
