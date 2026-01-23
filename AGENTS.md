# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-22
**Project:** omo-switch - Profile manager for oh-my-opencode

## OVERVIEW
Hybrid CLI + Flutter desktop app for managing oh-my-opencode configuration profiles. CLI is production-ready; Flutter GUI is WIP scaffold.

## STRUCTURE
```
./
├── cli/              # TypeScript CLI (Node.js 22+)
│   └── src/
│       ├── commands/  # CLI command implementations
│       ├── store/     # Profile store management (~/.omo-switch)
│       └── utils/     # Shared utilities (validation, download, paths)
├── app/              # Flutter desktop GUI (WIP)
│   └── lib/          # Scaffold - demo code only
└── shared/           # Shared assets between CLI and GUI
    └── assets/       # JSON schemas, default templates
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| CLI entry point | `cli/src/index.ts` | Commander.js-based |
| Command logic | `cli/src/commands/` | One file per command |
| Store operations | `cli/src/store/index.ts` | `StoreManager` class |
| Schema validation | `cli/src/utils/validator.ts` | AJV-based |
| Path resolution | `cli/src/utils/config-path.ts` | Windows/Unix XDG support |

## CONVENTIONS
- **CLI Commands**: Export `Command` instance from commander.js
- **StoreManager**: All file I/O goes through this class; never use fs directly in commands
- **Backups**: Always call `createBackup()` before `apply`
- **JSON vs JSONC**: Store accepts both; `.jsonc` preferred for comments
- **Error handling**: Use `ora` spinners; call `process.exit(1)` on failure

## ANTI-PATTERNS (THIS PROJECT)
- NEVER use `fs` directly in commands; use `StoreManager`
- NEVER write configs without creating backup first
- DON'T modify `~/.omo-switch` structure without bumping `STORE_VERSION`
- AVOID sync network calls; all downloads are async

## COMMANDS
```bash
# CLI
cd cli && npm install && npm run build
node dist/index.js --help
npm link && omo-switch --help

# Flutter (WIP)
cd app && flutter run
```

## NOTES
- CLI targets Windows primary, XDG paths for Linux/macOS
- Schema URL: `https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json`
- Bundled schema fallback in `shared/assets/oh-my-opencode.schema.json`
- models.dev API best-effort (non-blocking on failure)
- `app/lib/main.dart` is Flutter demo scaffold, NOT actual GUI implementation
