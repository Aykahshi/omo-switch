# CLI Source

## OVERVIEW
TypeScript CLI source code organized by concern: commands, store, utilities.

## STRUCTURE
```
cli/src/
├── index.ts       # CLI entry point (Commander.js)
├── commands/      # Command implementations
├── store/         # Profile store management
└── utils/         # Shared utilities
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Register new command | `index.ts` | `program.addCommand()` |
| Command implementation | `commands/*.ts` | Export `Command` instance |
| Store operations | `store/index.ts` | `StoreManager` class |
| Schema validation | `utils/validator.ts` | AJV-based |
| Path resolution | `utils/config-path.ts` | Windows/Unix support |
| Network downloads | `utils/downloader.ts` | Schema/models.dev fetch |

## CONVENTIONS
- **Command files**: Export `Command` instance, not a function
- **StoreManager methods**: All file I/O, backup handling
- **Spinner usage**: `ora().start()` → `.succeed()` / `.fail()` / `.warn()`
- **Error handling**: `try/catch` with `spinner.fail()` and `process.exit(1)`
- **Store paths**: Use `StoreManager` getters; never hardcode `~/.omo-switch`

## ANTI-PATTERNS
- NEVER import `fs` in commands; use `StoreManager`
- NEVER write configs without `createBackup()` first
- DON'T use sync network operations
- AVOID direct path manipulation; use `config-path.ts`
