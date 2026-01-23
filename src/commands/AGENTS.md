# CLI Commands

## OVERVIEW
Commander.js-based CLI commands for profile management.

## STRUCTURE
```
cli/src/commands/
├── init.ts        # Initialize store, download schema/models
├── list.ts        # List all profiles with active marker
├── show.ts        # Display profile config details
├── apply.ts       # Validate and apply profile to config path
├── add.ts         # Import profile from JSON/JSONC file
└── schema.ts      # Refresh cached schema
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add new command | `*.ts` | Export `Command()` instance |
| Schema URL | `init.ts:10` | GitHub raw URL |
| Backup logic | `apply.ts` | Via `StoreManager.createBackup()` |
| Profile resolution | `apply.ts` | ID or name lookup |
| Validation | `add.ts`, `apply.ts` | AJV schema validation |

## CONVENTIONS
- **Command exports**: `export const cmdName = new Command("name")`
- **Spinner lifecycle**: Start → text updates → succeed/fail
- **Profile lookup**: Match by `id` first, then `name`
- **Schema refresh**: Fallback to bundled schema on network failure
- **Offline mode**: `--offline` flag for schema refresh

## ANTI-PATTERNS
- NEVER write to `~/.omo-switch` without `StoreManager`
- DON'T skip validation on `apply`
- AVOID hardcoding config paths; use `config-path.ts`
