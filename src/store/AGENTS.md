# Store Manager

## OVERVIEW
Profile store management via `StoreManager` class. Centralized I/O for `~/.omo-switch`.

## STRUCTURE
```
cli/src/store/
├── index.ts       # StoreManager class
└── types.ts       # TypeScript interfaces
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Store initialization | `index.ts:14-21` | Constructor sets paths |
| Directory creation | `index.ts:47-60` | `ensureDirectories()` |
| Index operations | `index.ts:62-76` | Load/save `index.json` |
| Profile config I/O | `index.ts:78-116` | Get/save profile configs |
| Backup logic | `index.ts:118-127` | Timestamped backups |
| Sync profiles | `index.ts:160-190` | Reconcile disk files |

## CONVENTIONS
- **Store path**: `~/.omo-switch` (Windows/Unix XDG)
- **Config formats**: Supports `.json` and `.jsonc` (`.jsonc` preferred)
- **Backups**: ISO timestamp format, `TIMESTAMP__filename`
- **Profile sync**: Auto-adds orphaned config files to index
- **Meta tracking**: Cache files store `meta.json` with source/timestamp

## ANTI-PATTERNS
- NEVER use `fs` directly in commands; route through `StoreManager`
- DON'T assume config exists; check `configExists()` first
- AVOID modifying `index.json` structure without bumping `STORE_VERSION`
