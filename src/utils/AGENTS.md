# CLI Utilities

## OVERVIEW
Shared utilities for validation, downloads, and path resolution.

## STRUCTURE
```
cli/src/utils/
├── validator.ts       # AJV schema validation
├── downloader.ts      # Network downloads (schema, models.dev)
└── config-path.ts     # Cross-platform config path resolution
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Schema validation | `validator.ts` | AJV instance creation |
| Config paths | `config-path.ts` | Windows: `$HOME/.config` → `%APPDATA%` |
| GitHub downloads | `downloader.ts` | Fetch with retry |
| Bundled assets | `downloader.ts` | Fallback from `shared/assets/` |
| JSONC parsing | `validator.ts` | Strip comments for validation |

## CONVENTIONS
- **Validation**: Compile schema once, validate multiple configs
- **Downloads**: Async with error handling; fallback to bundled
- **Path priority**: `$HOME/.config` → `%APPDATA%` (Windows)
- **Meta files**: Cache includes `meta.json` with source/timestamp

## ANTI-PATTERNS
- NEVER use sync network operations
- DON'T hardcode URLs; define constants at file top
- AVOID assuming config directory exists
