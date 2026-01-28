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
  type?: ConfigType;
}

export const STORE_VERSION = "1.0.0";

// ============ Config Type (OMO vs OMOS) ============

export type ConfigType = "omo" | "slim";

export interface GlobalSettings {
  activeType: ConfigType;
  backupRetentionDays?: number;
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  activeType: "omo",
  backupRetentionDays: 30,
};

// ============ OMOS Types ============

export interface OmosAgentConfig {
  model: string;
  temperature?: number;
  variant?: "low" | "medium" | "high";
  skills?: string[];
  mcps?: string[];
}

export interface OmosPresetConfig {
  orchestrator?: OmosAgentConfig;
  oracle?: OmosAgentConfig;
  librarian?: OmosAgentConfig;
  explorer?: OmosAgentConfig;
  designer?: OmosAgentConfig;
  fixer?: OmosAgentConfig;
}

export interface OmosTmuxConfig {
  enabled?: boolean;
  layout?: "main-vertical" | "main-horizontal" | "tiled" | "even-horizontal" | "even-vertical";
  main_pane_size?: number;
}

export interface OmosConfig {
  preset?: string | null;
  presets?: Record<string, OmosPresetConfig>;
  tmux?: OmosTmuxConfig;
  disabled_mcps?: string[];
}

export const DEFAULT_OMOS_CONFIG: OmosConfig = {
  preset: "zen-free",
  presets: {
    "zen-free": {
      orchestrator: { model: "opencode/big-pickle" },
      oracle: { model: "opencode/big-pickle" },
      librarian: { model: "opencode/big-pickle" },
      explorer: { model: "opencode/big-pickle" },
      designer: { model: "opencode/big-pickle" },
      fixer: { model: "opencode/big-pickle" },
    },
  },
};
