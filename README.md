# omo-switch

[![npm version](https://badge.fury.io/js/omo-switch-cli.svg)](https://badge.fury.io/js/omo-switch-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool for managing [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) configuration profiles.

## Features

- 🔄 **Profile Switching** - Seamlessly switch between multiple `oh-my-opencode` configurations
- ✅ **Schema Validation** - Automatic validation against the official JSON schema
- 📦 **Dual Scope Support** - Manage both global (`user`) and project-local (`project`) profiles
- 💾 **Automatic Backups** - Your configuration is always backed up before changes
- 🖥️ **Cross-Platform** - Works on Windows (PowerShell/CMD), Linux, and macOS (XDG compatible)

## Requirements

- **Node.js** >= 22.0.0

## Installation

### npm (Recommended)

```bash
npm install -g omo-switch-cli
```

### From Source

```bash
git clone https://github.com/Aykahshi/omo-switch.git
cd omo-switch
npm install
npm run build
npm link
```

## Quick Start

```bash
# Initialize the profile store
omo-switch init

# Import your first profile
omo-switch add ./my-config.jsonc --name "My Setup"

# List available profiles
omo-switch list

# Apply a profile
omo-switch apply my-setup
```

## Commands

### `init`

Initializes the `~/.config/omo-switch` directory, sets up the internal structure, and downloads the latest configuration schema.

```bash
omo-switch init
```

**What it does:**
- Creates the store directory structure
- Downloads the latest `oh-my-opencode` schema from GitHub (falls back to bundled if offline)
- Creates a default profile if no existing config is detected

---

### `add <file>`

Imports a configuration file as a new profile.

```bash
# Basic usage - profile ID is derived from filename
omo-switch add ./my-config.jsonc

# With custom name (ID auto-derived from name)
omo-switch add ./config.json --name "Development Mode"

# With explicit ID and name
omo-switch add ./config.json --id dev --name "Dev Config"

# Add to project scope instead of global
omo-switch add ./config.jsonc --scope project

# Import and immediately activate
omo-switch add ./config.jsonc --activate

# Overwrite existing profile with same ID
omo-switch add ./config.jsonc --id existing-id --force
```

**Options:**
| Option | Description |
|--------|-------------|
| `--id <id>` | Custom profile ID (defaults to derived from name or filename) |
| `--name <name>` | Custom display name (defaults to ID) |
| `--scope <scope>` | Target scope: `user` (global) or `project` (local). Prompts if not specified |
| `--activate` | Apply the profile immediately after adding |
| `--force` | Overwrite if a profile with the same ID exists |

**Profile ID and filename:**
- If neither `--id` nor `--name` is provided: ID is derived from the input filename
- If only `--name` is provided: ID is derived from the name (lowercase, hyphenated)
- If only `--id` is provided: name defaults to the ID
- **Stored filename**: `<profile-id>.<original-extension>` (e.g., `config.json` + `--name test` → `test.json`)

---

### `list`

Lists all available profiles and shows which one is currently active.

```bash
# List all profiles (default)
omo-switch list

# List only global profiles
omo-switch list --scope user

# List only project profiles
omo-switch list --scope project
```

**Options:**
| Option | Description |
|--------|-------------|
| `--scope <scope>` | Filter by scope: `user`, `project`, or `all` (default: `all`) |

---

### `show [identifier]`

Displays the configuration content. Supports merged view of applied configs.

```bash
# Show merged view of currently applied configs (default)
omo-switch show

# Show a specific profile from store
omo-switch show my-setup --scope user

# Show project profile
omo-switch show dev --scope project
```

**Options:**
| Option | Description |
|--------|-------------|
| `--scope <scope>` | View scope: `user`, `project`, or `merged` (default: `merged`) |

**Scope behavior:**
- `merged`: Shows the actual applied configs from target paths, with diff highlighting if both global and project configs exist
- `user`: Shows a profile from the global store
- `project`: Shows a profile from the project store

---

### `apply <identifier>`

Validates and applies the selected profile to the `oh-my-opencode` target configuration.

```bash
# Apply a profile (searches both scopes, prefers project)
omo-switch apply my-setup

# Apply from global store specifically
omo-switch apply my-setup --scope user

# Apply to project target path
omo-switch apply dev --scope project
```

**Options:**
| Option | Description |
|--------|-------------|
| `--scope <scope>` | Target scope: `user` or `project` (default: `user`) |

**Note:** A backup is automatically created before any changes.

---

### `rm <profile-id>`

Removes a saved profile from the store.

```bash
# Remove with confirmation prompt
omo-switch rm my-old-profile

# Remove without confirmation
omo-switch rm my-old-profile --force

# Remove from specific scope
omo-switch rm dev --scope project
```

**Options:**
| Option | Description |
|--------|-------------|
| `--scope <scope>` | Target scope: `user` or `project` |
| `--force` | Skip confirmation prompt |

**Behavior without `--scope`:**
- Checks project scope first, then global scope
- Prompts for confirmation before deletion

---

### `schema refresh`

Refreshes the cached `oh-my-opencode` JSON schema.

```bash
# Download latest schema from GitHub
omo-switch schema refresh

# Use offline/bundled schema
omo-switch schema refresh --offline
```

**Options:**
| Option | Description |
|--------|-------------|
| `--offline` | Skip network request; use cached or bundled schema |

---

## Understanding Scopes

`omo-switch` supports two scopes for profile management:

| Scope | Storage Location | Target Config Path | Use Case |
|-------|------------------|-------------------|----------|
| `user` | `~/.config/omo-switch/` | `~/.config/opencode/oh-my-opencode.jsonc` | Global profiles shared across all projects |
| `project` | `<project>/.opencode/` | `<project>/.opencode/oh-my-opencode.jsonc` | Project-specific profiles, ideal for team sharing via Git |

## Storage Structure

### Global Store (`~/.config/omo-switch/`)

```
~/.config/omo-switch/
├── index.json           # Profile registry with active profile ID
├── configs/             # Profile configuration files (*.json, *.jsonc)
├── cache/
│   └── schema/          # Cached oh-my-opencode.schema.json
└── backups/             # Timestamped configuration backups
```

### Project Store (`<project>/.opencode/`)

```
<project>/.opencode/
├── .omorc               # Project-specific active profile
├── omo-configs/         # Project-specific profiles
└── oh-my-opencode.jsonc # Applied project config (target)
```

## Target Configuration Paths

When applying a profile, `omo-switch` writes to:

| Scope | Platform | Primary Path | Fallback Path |
|-------|----------|--------------|---------------|
| `user` | Windows | `%USERPROFILE%\.config\opencode\oh-my-opencode.jsonc` | `%APPDATA%\opencode\oh-my-opencode.json` |
| `user` | Linux/macOS | `$XDG_CONFIG_HOME/opencode/oh-my-opencode.jsonc` | `~/.config/opencode/oh-my-opencode.jsonc` |
| `project` | All | `<project>/.opencode/oh-my-opencode.jsonc` | - |

## Local Development

### Prerequisites

- Node.js >= 22.0.0

### Setup

```bash
git clone https://github.com/Aykahshi/omo-switch.git
cd omo-switch
npm install
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev -- <args>` | Run CLI directly with ts-node |
| `npm test` | Run unit tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Development Workflow

```bash
# Run in development mode
npm run dev -- init
npm run dev -- list
npm run dev -- add ./test-config.jsonc --name "Test"

# Build and link for global testing
npm run build
npm link
omo-switch --help
```

### Coding Guidelines

1. **File I/O**: Never use `fs` directly in command files. Use `StoreManager` or `ProjectStoreManager`.
2. **Safety**: Always create backups before overwriting configurations.
3. **Validation**: Validate all configs against the JSON schema before applying.
4. **Testing**: Use Vitest with `memfs` for filesystem mocking.
5. **Error Handling**: Use `ora` spinners for user feedback. Exit with `process.exit(1)` on failure.

### Project Structure

```
omo-switch/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # Command implementations
│   │   ├── init.ts
│   │   ├── add.ts
│   │   ├── list.ts
│   │   ├── show.ts
│   │   ├── apply.ts
│   │   ├── rm.ts
│   │   └── schema.ts
│   ├── store/             # Data persistence (global & project)
│   ├── utils/             # Helper functions
│   └── __tests__/         # Test fixtures
├── shared/                # Shared assets (schema, templates)
└── dist/                  # Compiled output
```

## Troubleshooting

### Schema Download Failures

If the tool cannot reach GitHub, it automatically falls back to a bundled schema. Use `--offline` if you're in an air-gapped environment.

### Permission Errors

Ensure your terminal has write permissions to:
- `~/.config/omo-switch/`
- `~/.config/opencode/` or `%APPDATA%/opencode/`

### Finding Backups

If something goes wrong, find your original configuration in:
```
~/.config/omo-switch/backups/<ISO_TIMESTAMP>__oh-my-opencode.jsonc
```

## License

[MIT](LICENSE)
