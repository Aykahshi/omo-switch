# omo-switch

A profile management tool for `oh-my-opencode`, featuring a powerful CLI and an upcoming Flutter-based desktop GUI.

## Overview

`omo-switch` allows you to manage multiple configuration profiles for `oh-my-opencode`. You can initialize a profile store, list available profiles, and switch between them seamlessly. The tool ensures your configurations are valid against the official schema and automatically handles backups before applying changes.

### Core Features (CLI MVP)
- **Profile Store**: Centralized management in `~/.omo-switch`.
- **Schema Validation**: Automatic validation using the `oh-my-opencode` JSON schema.
- **Safety First**: Automatic backups of your current configuration before switching.
- **Cross-Platform**: Designed for Windows (PowerShell) with support for XDG base directory on Linux/macOS.

## Requirements

- **Node.js**: >= 22.0.0

## Local Development & Setup

Since `omo-switch` is currently in development and not yet published to npm, follow these steps to set it up locally on Windows (PowerShell):

### 1. Clone the Repository
```powershell
git clone <YOUR_REPO_URL>
cd omo-switch
```

### 2. Build the CLI
```powershell
cd cli
npm install
npm run build
```

### 3. Run the CLI
You can run the CLI directly using `node`:
```powershell
node dist/index.js --help
```

Alternatively, you can use `npm link` to make the `omo-switch` command available globally:
```powershell
npm link
omo-switch --help
```

For development with hot-reload or direct TS execution:
```powershell
npm run dev -- --help
```

## CLI Commands

### `init`
Initializes the `~/.omo-switch` directory, sets up the internal structure, and downloads the latest configuration schema.
```powershell
omo-switch init
```

### `list`
Lists all available profiles in your store and indicates which one is currently active.
```powershell
omo-switch list
```

### `show <id|name>`
Displays the detailed configuration of a specific profile.
```powershell
omo-switch show default
```

### `apply <id|name>`
Validates and applies the selected profile to your `oh-my-opencode` configuration path.
```powershell
omo-switch apply developer-mode
```

### `schema refresh [--offline]`
Refreshes the cached `oh-my-opencode` JSON schema.

- Default behavior: attempts to download the latest schema from GitHub and overwrite the local cache.
- `--offline`: does not attempt any network calls. If a cached schema exists, it will be kept. Otherwise, a bundled schema will be written into the cache.

```powershell
omo-switch schema refresh
omo-switch schema refresh --offline
```

---

## Technical Details

### Storage Folder (`~/.omo-switch`)
The tool stores all data in your home directory:
- `index.json`: Registry of all profiles and the active profile ID.
- `configs/`: Contains individual profile config files (supports `*.json` and `*.jsonc`).
- `cache/schema/`: Stores the cached `oh-my-opencode.schema.json`.
- `cache/models/`: Stores the cached models list from `models.dev` (best-effort).
- `backups/`: Stores timestamped backups of your configuration files.

### JSON Import vs JSONC Output
- **Store Storage**: The `configs/` directory supports both `*.json` and `*.jsonc` files.
- **Import with `add`**: The `omo-switch add <file>` command accepts `.json` and `.jsonc` files, validates via schema, and preserves the original file content (including comments) when saving.
- **File Resolution**: If both `<id>.jsonc` and `<id>.json` exist, the tool prefers `.jsonc`.
- **Apply Output**: When you run `omo-switch apply`, the target config is written as JSONC by prepending/updating a first-line comment `// Profile Name: ...`, otherwise preserving the stored content.

### Target Paths & Backups
When you run `apply`, `omo-switch` targets the following paths on Windows:
1. **Primary**: `$HOME\.config\opencode\oh-my-opencode.json`
2. **Fallback**: `%APPDATA%\opencode\oh-my-opencode.json`

**Before writing any changes, the tool creates a backup** in `~/.omo-switch/backups/` named with the format: `<ISO_TIMESTAMP>__oh-my-opencode.json`.

## Troubleshooting

- **Schema Download Failures**: If the tool cannot reach GitHub to download the latest schema, it will automatically fall back to a bundled version. Ensure you have internet access if you need the absolute latest schema.
- **Permission Errors**: Ensure your terminal has sufficient permissions to write to the `.config` or `AppData` directories.
- **Finding Backups**: If something goes wrong, your original configuration is safe in `~/.omo-switch/backups/`.

## Roadmap

- [ ] **Flutter Desktop GUI**: A cross-platform interface for managing profiles.
- [ ] **Schema-Driven Editor**: Edit configurations with schema-driven forms and validation.
- [ ] **models.dev Integration**: Surface models from `models.dev` for easier model selection.

## License

MIT
