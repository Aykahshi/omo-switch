# omo-switch CLI - Developer Context

## Project Overview
`omo-switch` is a CLI tool for managing configuration profiles for `oh-my-opencode`. It allows users to switch between different configurations (profiles) seamlessly, ensuring validation against the official schema and providing automatic backups.

**Key Features:**
*   **Profile Management:** Create, list, show, and apply profiles.
*   **Dual Scope:** Supports `user` (global) and `project` (local) scopes.
*   **Safety:** Automatic backups before application.
*   **Validation:** built-in JSON schema validation using `ajv`.
*   **Platform Support:** Windows (PowerShell/CMD) and Unix (XDG).

## Architecture

The project is a TypeScript CLI built with `commander`.

### Core Components
*   **Entry Point:** `src/index.ts` - Sets up the CLI program and registers commands.
*   **Commands:** `src/commands/` - Individual command implementations (`init`, `list`, `show`, `apply`, `schema`, `add`).
*   **Store Management:**
    *   `src/store/index.ts`: Manages the global store at `~/.omo-switch`.
    *   `src/store/project-store.ts`: Manages project-local configuration in `<project-root>/.opencode`.
*   **Utilities:** `src/utils/` - Shared logic for validation, path resolution, and file downloading.

### Data Flow
1.  **User Input:** Parsed by `commander`.
2.  **Command Execution:** Command handler invokes `StoreManager` or `ProjectStoreManager`.
3.  **Data Access:** Store managers handle all file I/O (reading/writing profiles, indexes, and backups).
4.  **Action:** The `apply` command validates the selected profile config, creates a backup of the target file, and then overwrites the target with the new config.

## Development Workflow

### Prerequisites
*   Node.js >= 22.0.0

### Key Scripts
*   **Build:** `npm run build` - Compiles TypeScript to `dist/`.
*   **Dev:** `npm run dev` - Runs the CLI directly using `ts-node`.
    *   Example: `npm run dev -- apply default`
*   **Test:** `npm test` - Runs unit tests with Vitest.
*   **Test Watch:** `npm run test:watch`

### Directory Structure
*   `src/`
    *   `commands/`: CLI command logic.
    *   `store/`: Data persistence layers (global vs project).
    *   `utils/`: Helper functions.
    *   `__tests__/`: Global test fixtures.
*   `shared/`: Assets shared between CLI and other potential frontends.

## coding Conventions & Guidelines

*   **File I/O:** **NEVER** use `fs` directly in command files. Always use `StoreManager` or `ProjectStoreManager` to abstract file operations.
*   **Safety:** The `apply` command **MUST** create a backup of the existing configuration before overwriting it.
*   **Validation:** All configurations **MUST** be validated against the `oh-my-opencode` schema before being applied.
*   **Config Format:**
    *   Internal storage supports `.json` and `.jsonc`.
    *   Target configuration files are written as `.jsonc` (or `.json` if platform dictates) with a header comment indicating the source profile.
*   **Error Handling:** Use `ora` spinners for user feedback. on failure, log a clear error message and exit with `process.exit(1)`.
*   **Testing:** Use `vitest` for unit testing. Mocks should be used for file system operations where possible (e.g., `memfs`).

## Configuration Locations
*   **Global Store:** `~/.omo-switch/`
*   **Project Store:** `<project-root>/.opencode/`
*   **Target Config (Windows):** `~/.config/opencode/oh-my-opencode.jsonc` or `%APPDATA%/opencode/oh-my-opencode.json`
*   **Target Config (Unix):** `$XDG_CONFIG_HOME/opencode/oh-my-opencode.jsonc` or `~/.config/opencode/oh-my-opencode.jsonc`
